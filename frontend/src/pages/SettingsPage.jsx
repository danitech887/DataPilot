import React, { useState, useEffect } from 'react';
import iconImg from '../assets/icon.png';

const MODELS = {
  ollama: [
    { value: 'qwen3.5:4b', label: 'Qwen 3.5 4B (Ollama Local)' },
    { value: 'qwen3.5',    label: 'Qwen 3.5 (Ollama Local)' },
  ],
  anthropic: [
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (Recommended)' },
    { value: 'claude-opus-4-20250514',   label: 'Claude Opus 4 (Most capable)' },
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (Fastest)' },
  ],
  openai: [
    { value: 'gpt-4o',      label: 'GPT-4o (Recommended)' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast)' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  ],
  gemini: [
    { value: 'gemini-2.5-pro',   label: 'Gemini 2.5 Pro (Recommended)' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Fast)' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  ],
};

function Section({ title, desc, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {desc && <p className="text-xs text-slate-500 mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [provider, setProvider] = useState('ollama');
  const [model, setModel] = useState('');
  const [pageSize, setPageSize] = useState('50');
  const [saved, setSaved] = useState('');

  useEffect(() => {
    const savedProvider = localStorage.getItem('dp_provider') || 'ollama';
    setProvider(savedProvider);
    let savedModel = localStorage.getItem('dp_model') || MODELS[savedProvider]?.[0]?.value || 'qwen3.5:4b';
    if (savedModel === 'gemini-1.5-pro') savedModel = 'gemini-2.5-pro';
    if (savedModel === 'gemini-1.5-flash') savedModel = 'gemini-2.5-flash';
    setModel(savedModel);
    setPageSize(localStorage.getItem('dp_page_size') || '50');
  }, []);

  const savePreferences = () => {
    localStorage.setItem('dp_provider', provider);
    localStorage.setItem('dp_model', model);
    localStorage.setItem('dp_page_size', pageSize);
    setSaved('Preferences saved.');
    setTimeout(() => setSaved(''), 3000);
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Preferences</h1>
        <p className="text-sm text-slate-500 mt-0.5">Configure your application preferences</p>
      </div>

      <Section title="AI Preferences" desc="Configure the provider and model used by the AI Copilot.">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Provider</label>
            <select value={provider} onChange={e => {
              setProvider(e.target.value);
              setModel(MODELS[e.target.value]?.[0]?.value || '');
            }} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="ollama">Ollama (Local LLM)</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI (GPT)</option>
              <option value="gemini">Google (Gemini)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Model</label>
            <select value={model} onChange={e => setModel(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" disabled={!provider}>
              {(MODELS[provider] || []).map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        {provider === 'ollama' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800 flex items-start gap-2">
            <span className="font-bold">✓</span>
            <div>
              <p className="font-medium">Ollama is active locally</p>
              <p className="text-emerald-700 mt-0.5">
                Connected to <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">http://localhost:11434</code> with Qwen 3.5. No cloud API keys or external credits required.
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Rows per page</label>
          <select value={pageSize} onChange={e => setPageSize(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {['25', '50', '100', '200'].map(n => <option key={n} value={n}>{n} rows</option>)}
          </select>
        </div>

        <button onClick={savePreferences}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          Save Preferences
        </button>
      </Section>

      <Section title="About DataPilot">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-12 h-12 bg-blue-50/80 rounded-xl p-1.5 flex items-center justify-center border border-blue-100 shadow-sm">
            <img src={iconImg} alt="DataPilot" className="w-full h-full object-contain" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">DataPilot</h3>
            <p className="text-xs text-slate-500 font-medium">AI-Powered Data Platform · v1.0</p>
          </div>
        </div>
        <div className="text-xs text-slate-500 space-y-1 pt-1">
          <p>Backend: Django 4.2 + Django REST Framework + Pandas</p>
          <p>Frontend: React 18 + Tailwind CSS</p>
          <p className="text-slate-400">Your uploaded files are stored securely on your server. Only you can access your data.</p>
        </div>
      </Section>

      {saved && (
        <div className="fixed bottom-6 right-6 bg-emerald-600 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
          ✓ {saved}
        </div>
      )}
    </div>
  );
}
