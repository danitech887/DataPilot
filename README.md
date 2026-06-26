# DataPilot — AI-Powered Data Entry & Analysis

A full-stack web application for intelligent data entry, cleaning, and analysis.
**Hybrid UI**: fast one-click Pandas operations + open-ended AI chat (your own key).

---

## Project Structure

```
datapilot/
├── backend/                     # Django + DRF
│   ├── core/                    # Settings, URLs, WSGI
│   ├── data_processor/          # Main app
│   │   ├── models.py            # UploadedFile, ActionLog
│   │   ├── views.py             # All API endpoints
│   │   ├── serializers.py       # DRF serializers
│   │   ├── pandas_ops.py        # Data cleaning engine
│   │   ├── ai_agent.py          # Anthropic / OpenAI proxy
│   │   └── urls.py
│   ├── media/user_files/        # Uploaded files (gitignored)
│   ├── manage.py
│   └── requirements.txt
│
├── frontend/                    # React 18 + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── FileUpload.jsx
│   │   │   └── QuickActions.jsx
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── FilesPage.jsx
│   │   │   ├── DataGridPage.jsx
│   │   │   ├── AICopilotPage.jsx
│   │   │   └── SettingsPage.jsx
│   │   ├── utils/
│   │   │   ├── api.js           # Axios instance + interceptors
│   │   │   └── AuthContext.js   # React auth context
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
└── README.md
```

---

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Database migrations
python manage.py migrate

# Create superuser (optional, for /admin)
python manage.py createsuperuser

# Run dev server
python manage.py runserver
# → http://localhost:8000
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Install Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Start dev server
npm start
# → http://localhost:3000
```

---

## API Key Setup

The AI Copilot requires API keys to function. These are configured in the backend.

**To configure:** Open `backend/data_processor/ai_agent.py` and set your API keys as environment variables or hardcode them directly.

Get keys:
- Anthropic: https://console.anthropic.com
- OpenAI: https://platform.openai.com/api-keys

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/` | Create account |
| POST | `/api/auth/login/` | Get auth token |
| POST | `/api/auth/logout/` | Invalidate token |
| GET | `/api/auth/me/` | Current user |
| GET | `/api/files/` | List user's files |
| POST | `/api/files/` | Upload file |
| GET | `/api/files/{id}/` | File metadata |
| DELETE | `/api/files/{id}/` | Delete file |
| GET | `/api/files/{id}/preview/` | Paginated data preview |
| GET | `/api/files/{id}/stats/` | Descriptive statistics |
| POST | `/api/files/{id}/action/` | Run quick action |
| POST | `/api/files/{id}/ai/` | AI natural language query |

### Quick Action Payloads

```json
{ "action": "dedup" }
{ "action": "trim" }
{ "action": "fill", "fill_value": "N/A" }
{ "action": "drop_empty" }
{ "action": "sort", "column": "Name", "ascending": true }
{ "action": "normalize_headers" }
{ "action": "export_csv" }
{ "action": "export_excel" }
```

### AI Query Payload

```json
{
  "prompt": "What are the top 5 regions by total revenue?",
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514"
}
```
Header: `X-AI-Api-Key: sk-ant-...`

---

## Production Checklist

- [ ] Change `SECRET_KEY` in `settings.py` (use environment variable)
- [ ] Set `DEBUG = False`
- [ ] Configure `ALLOWED_HOSTS` with your domain
- [ ] Use PostgreSQL instead of SQLite
- [ ] Store uploaded files on S3 (django-storages)
- [ ] Serve frontend build via nginx
- [ ] Use gunicorn/uvicorn + nginx for the backend
- [ ] Set `CORS_ALLOWED_ORIGINS` to your frontend domain only

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Django 4.2, Django REST Framework |
| Data Engine | Pandas, Openpyxl |
| AI | Anthropic Claude / OpenAI GPT (user's key) |
| Auth | Token-based (DRF) |
| Frontend | React 18, React Router v6 |
| Styling | Tailwind CSS |
| HTTP | Axios |
| Storage | SQLite (dev), PostgreSQL (prod) |
