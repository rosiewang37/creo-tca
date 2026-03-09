# CREO Lead Prioritization Tool

An intelligent lead-ranking system for **CREO Solutions**, a Kingston-based residential painting business. The tool scores and prioritizes inbound sales leads by expected conversion value, so the sales team knows exactly who to contact first.

---

## ✨ Features

### 📊 Dashboard
KPI cards, profit band distribution, referral source performance, and neighbourhood insights — all at a glance.

### 📋 Lead Priority Table
Sortable, filterable table of all 2,500 leads ranked by priority score. Click any row for a detail drawer with the top contributing factors explained in plain English.

### 🤖 AI Text Analyzer
Paste a raw email, call transcript, or message and let **Google Gemini** extract structured lead fields, predict the profit band, and generate a priority score — in seconds.

### 📌 Priority Queue
Build a personal call list by adding leads from anywhere in the app. Track status (**To Contact → In Progress → Done**) and persist across sessions.

---

## 🏗️ Architecture

```
Frontend (Next.js :3000)
       │  HTTP REST
Backend (FastAPI :8000)
       │
  ┌────┴─────────────────────────┐
  │  ML Score Engine (XGBoost)   │
  │  Gemini Client (text → JSON) │
  └──────────────────────────────┘
       │  REST
Supabase PostgreSQL (2,500 rows)
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Recharts |
| **Backend API** | Python 3.13 · FastAPI · Uvicorn |
| **ML / Data** | pandas · scikit-learn · XGBoost |
| **LLM** | Google Gemini API (`gemini-2.5-flash`) |
| **Database** | Supabase (PostgreSQL) — read-only REST API |

---

## 📂 Project Structure

```
creo-tca/
├── backend/
│   ├── main.py                 # FastAPI app, CORS, startup data load
│   ├── api/routes/             # leads, predict, analyze-text, insights
│   ├── ml/                     # pipeline, model training, scoring
│   ├── services/               # Gemini API client
│   ├── core/                   # Config & env var loading
│   ├── data/                   # CSVs & chart PNGs (gitignored)
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js pages (dashboard, leads, analyze, queue)
│   │   ├── components/         # UI components (layout, charts, tables, forms)
│   │   └── lib/                # API client, types, queue store
│   ├── package.json
│   └── tailwind.config.ts
│
└── docs/                       # Planning docs (PRD, tech spec, roadmap)
```

---

## 🚀 Getting Started

### Prerequisites

- **Python** ≥ 3.11
- **Node.js** ≥ 18
- **npm** ≥ 9

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/creo-tca.git
cd creo-tca
```

### 2. Backend setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create a **`backend/.env`** file:

```env
SUPABASE_KEY=<your-supabase-api-key>
GEMINI_API_KEY=<your-gemini-api-key>
```

Start the backend:

```bash
uvicorn main:app --reload --port 8000
```

> On first startup the pipeline fetches 2,500 leads from Supabase, cleans the data, trains the XGBoost model, and caches everything locally.

### 3. Frontend setup

```bash
cd frontend

# Install dependencies
npm install
```

Create a **`frontend/.env.local`** file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/leads` | Paginated, sortable, filterable lead list |
| `GET` | `/api/v1/leads/{id}` | Single lead + factor breakdown |
| `POST` | `/api/v1/predict` | Score a structured lead payload |
| `POST` | `/api/v1/analyze-text` | Gemini extraction + scoring from freeform text |
| `GET` | `/api/v1/insights` | Aggregated dashboard stats |

---

## 🧠 How Scoring Works

Each lead receives a **priority score** from 0 to 1:

```
priority_score = conversion_weight × profit_band_score
```

| Component | Source | Range |
|---|---|---|
| **Conversion weight** | Heuristic (homeowner status × timeline urgency) | 0.0 – 1.0 |
| **Profit band score** | XGBoost model prediction (Low / Medium / High) | 0.33 – 1.0 |

The model is trained on 8 features including job size, homeowner status, timeline, property type, referral source, neighbourhood, distance, and customer age bracket.

---

## 📄 License

This project was built as part of a technical competency assessment for CREO Solutions.
