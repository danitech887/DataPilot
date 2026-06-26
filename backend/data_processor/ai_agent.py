"""
DataPilot — AI Agent
Wraps the Anthropic or OpenAI API to answer natural-language queries
about the user's loaded DataFrame.

API keys are configured below using environment variables or by
hardcoding them directly.
"""
import json
import os
import pandas as pd
import requests

# --- API Key Configuration ---
# Load API keys from environment variables.
# Replace the placeholder values with your actual keys if not using environment variables.
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "YOUR_ANTHROPIC_API_KEY_HERE")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "YOUR_OPENAI_API_KEY_HERE")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY_HERE")

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}"


def _dataframe_context(df: pd.DataFrame) -> str:
    """Build a compact text description of the dataframe for the LLM."""
    preview = df.head(10).fillna('').to_csv(index=False)
    stats = []
    numeric_cols = df.select_dtypes(include='number').columns.tolist()
    if numeric_cols:
        stats.append(f"Numeric column stats:\n{df[numeric_cols].describe().to_string()}")

    categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
    if categorical_cols:
        cat_stats = []
        for col in categorical_cols[:5]: # Limit to first 5 categorical columns to keep context concise
            top_values = df[col].value_counts().head(3).to_dict()
            cat_stats.append(f"- {col}: {top_values}")
        if cat_stats:
            stats.append(f"Categorical column top values:\n" + "\n".join(cat_stats))

    return (
        f"Dataset shape: {df.shape[0]} rows × {df.shape[1]} columns\n"
        f"Columns: {', '.join(df.columns.tolist())}\n\n"
        f"First 10 rows (CSV):\n{preview}\n"
        + ("\n" + "\n\n".join(stats) if stats else "")
    )


def ask_anthropic(prompt: str, df: pd.DataFrame, model: str = "claude-sonnet-4-20250514", api_key: str = None) -> dict:
    context = _dataframe_context(df)
    system_prompt = (
        "You are DataPilot AI, an expert data analyst embedded in a data entry and analysis tool. "
        "The user has loaded the following dataset:\n\n"
        f"{context}\n\n"
        "Answer the user's question clearly and concisely. "
        "When providing insights, be specific with numbers. "
        "If asked to filter or transform data, describe exactly what you would do and show a sample result. "
        "Do not use markdown code fences in your response."
    )
    payload = {
        "model": model,
        "max_tokens": 1024,
        "system": system_prompt,
        "messages": [{"role": "user", "content": prompt}],
    }
    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key or ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
    }
    resp = requests.post(ANTHROPIC_API_URL, json=payload, headers=headers, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    return {"reply": data["content"][0]["text"], "model": model, "provider": "anthropic"}


def ask_openai(prompt: str, df: pd.DataFrame, model: str = "gpt-4o", api_key: str = None) -> dict:
    context = _dataframe_context(df)
    system_prompt = (
        "You are DataPilot AI, an expert data analyst. "
        f"Dataset context:\n{context}\n"
        "Answer concisely and specifically."
    )
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        "max_tokens": 1024,
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key or OPENAI_API_KEY}",
    }
    resp = requests.post(OPENAI_API_URL, json=payload, headers=headers, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    return {"reply": data["choices"][0]["message"]["content"], "model": model, "provider": "openai"}


def ask_gemini(prompt: str, df: pd.DataFrame, model: str = "gemini-2.5-pro", api_key: str = None) -> dict:
    context = _dataframe_context(df)
    full_prompt = (
        "You are DataPilot AI, an expert data analyst embedded in a data entry and analysis tool. "
        f"Dataset context:\n{context}\n\n"
        f"User Question: {prompt}\n\n"
        "Answer concisely and specifically. Do not use markdown code fences in your response."
    )
    payload = {
        "contents": [{"parts": [{"text": full_prompt}]}]
    }
    headers = {"Content-Type": "application/json"}
    resp = requests.post(GEMINI_API_URL.format(model, api_key or GEMINI_API_KEY), json=payload, headers=headers, timeout=60)
    resp.raise_for_status()
    data = resp.json()

    # Google's API can return a 200 OK but still have an error in the body
    if "error" in data:
        error_details = data["error"]
        msg = error_details.get('message', 'Unknown error')
        return {"error": f"Google API Error: {msg} (Status: {error_details.get('status', 'N/A')})"}

    candidates = data.get("candidates", [])
    if not candidates:
        return {"error": "Google API returned no content. This usually happens if the prompt is blocked by safety filters."}

    candidate = candidates[0]
    if "content" not in candidate:
        finish_reason = candidate.get("finishReason", "UNKNOWN")
        return {"error": f"Google API refused to answer. Finish reason: {finish_reason}"}

    return {"reply": candidate["content"]["parts"][0]["text"], "model": model, "provider": "gemini"}


def run_agent(prompt: str, df: pd.DataFrame, provider: str = "anthropic", model: str = None, api_key: str = None) -> dict:
    """
    Route to the correct provider.
    provider: 'anthropic' | 'openai' | 'gemini'
    """
    try:
        if provider == "openai":
            key = api_key or OPENAI_API_KEY
            if not key or key == "YOUR_OPENAI_API_KEY_HERE":
                return {"error": "OpenAI API key is not configured in the backend."}
            return ask_openai(prompt, df, model or "gpt-4o", key)
        elif provider == "gemini":
            key = api_key or GEMINI_API_KEY
            if not key or key == "YOUR_GEMINI_API_KEY_HERE":
                return {"error": "Gemini API key is not configured in the backend."}
            return ask_gemini(prompt, df, model or "gemini-2.5-pro", key)
        else:
            key = api_key or ANTHROPIC_API_KEY
            if not key or key == "YOUR_ANTHROPIC_API_KEY_HERE":
                return {"error": "Anthropic API key is not configured in the backend."}
            return ask_anthropic(prompt, df, model or "claude-sonnet-4-20250514", key)
    except requests.exceptions.HTTPError as e:
        status = e.response.status_code if e.response is not None else 0
        api_error_msg = ""
        if e.response is not None:
            try:
                # Try to parse a standard { "error": { "message": "..." } } or { "error": "..." }
                error_json = e.response.json()
                error_data = error_json.get("error", error_json)
                api_error_msg = error_data.get("message", str(error_data)) if isinstance(error_data, dict) else str(error_data)
            except (ValueError, KeyError):
                # Fallback to raw text if JSON parsing fails or keys are missing
                pass

        if status == 401 or (status == 400 and "API key not valid" in api_error_msg):
            return {"error": "Invalid API key. Please check your key in Settings."}
        elif status == 429:
            if api_error_msg:
                return {"error": f"API Limit/Quota Error: {api_error_msg}"}
            return {"error": "Rate limit exceeded or insufficient quota."}
        else:
            return {"error": f"API error {status}: {api_error_msg or str(e)}"}
    except Exception as e:
        return {"error": f"Unexpected error: {str(e)}"}
