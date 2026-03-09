# Execution Instructions

Step-by-step instructions for building and running the CREO Lead Prioritization Tool.

---

## Prerequisites

Before starting:
- Python 3.13 installed
- Node.js 18+ installed
- `SUPABASE_KEY` available (see CLAUDE.md)
- `GEMINI_API_KEY` available from https://aistudio.google.com (free tier)

---

## Step 1 – Environment Setup

```bash
# Backend
mkdir -p backend/ml backend/api/routes backend/services backend/core data
cd backend
pip install fastapi uvicorn pandas scikit-learn xgboost google-generativeai python-dotenv joblib matplotlib seaborn

# Create backend/.env
echo "SUPABASE_KEY=sb_publishable_iFgXlEVP5UqmrZx6l1nVgw_6WD5CPpy" >> .env
echo "GEMINI_API_KEY=<your_key>" >> .env

# Frontend
cd ..
npx create-next-app@latest frontend --typescript --tailwind --app --no-git
cd frontend
npx shadcn@latest init
npm install recharts
```

Create `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Step 2 – Run Data Pipeline

```bash
cd backend
python -m ml.pipeline   # fetches 2500 rows → data/leads_raw.csv
python -m ml.eda        # generates 6 EDA charts → data/charts/
python -m ml.model      # trains model, prints F1, scores all 2500 rows → data/leads_scored.csv
```

Expected output after model training:
```
Macro F1: 0.XX  (must be > 0.55)
Confusion matrix: ...
Feature importance chart saved to data/charts/eda_feature_importance.png
Model saved to ml/model.pkl
Scored 2500 leads → data/leads_scored.csv
```

**If Supabase is down**: copy `inbound_leads.csv` (251-row sample from repo root) to `data/leads_raw.csv` and continue. The model will train on fewer rows but still work.

---

## Step 3 – Start Backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

Verify:
- http://localhost:8000/docs → FastAPI auto-generated docs
- http://localhost:8000/api/v1/leads → returns first page of leads
- http://localhost:8000/api/v1/insights → returns chart data

---

## Step 4 – Start Frontend

```bash
cd frontend
npm run dev
```

Verify:
- http://localhost:3000 → redirects to Dashboard
- All 4 nav items work: Dashboard, Leads, Analyze, Queue

---

## Step 5 – Build in This Order

Work through phases in `roadmap.md` in this order:

1. **Backend first** (Phase 3): Get all 5 API endpoints responding before building UI
2. **Frontend parallel** (Phase 4): Once APIs are returning data, build all 4 pages
3. **LLM last** (Phase 5): Add Gemini extraction after the rest is working

The frontend uses `NEXT_PUBLIC_API_URL` to call the backend. All API calls are in `frontend/lib/api.ts`.

---

## Step 6 – Acceptance Criteria Checklist

After building, verify each item in `docs/PRD.md` is checked off.

Key items to manually test:
- [ ] Dashboard loads in < 2 seconds (check Network tab)
- [ ] Lead table sorts + filters correctly
- [ ] Clicking a lead opens the drawer with factor breakdown
- [ ] "Add to Queue" works from table, drawer, and Dashboard top-5
- [ ] AI Analyzer: paste "Hi I need a quote for my detached house in West End, need it done ASAP" → score appears
- [ ] Queue: status cycles correctly (To Contact → In Progress → Done)
- [ ] Queue persists after page refresh
- [ ] Queue badge in sidebar shows correct count

---

## Step 7 – Pre-Demo Checks

- [ ] `data/leads_scored.csv` contains 2500 rows
- [ ] Model macro F1 > 0.55 (printed during step 2)
- [ ] All 6 EDA chart PNGs exist in `data/charts/`
- [ ] Feature importance chart generated
- [ ] No secrets in git history (`git log --oneline` shows no .env commits)
- [ ] Demo script rehearsed: Dashboard → Leads → Analyze → Queue (≤2 minutes)
