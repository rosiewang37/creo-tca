# CREO TCA – Claude Code Context

## Project Purpose
A lead-prioritization tool for **CREO Solutions** (Kingston-based residential painting business). The system ranks inbound sales leads by their expected conversion value so the sales/marketing team knows who to contact first.

**Interview context**: Round 2 Technical Competency Assessment. Due March 8 2026. In-person presentation March 9-10.

## Repository Structure
```
creo-tca/
├── backend/          # Python FastAPI + ML pipeline
├── frontend/         # Next.js 14 (App Router) + TypeScript + Tailwind
├── docs/             # Planning docs, PDFs
│   ├── technical_spec.md
│   ├── roadmap.md
│   └── slide_deck_plan.md
├── explore_data.py   # Original Supabase fetch/explore script
├── inbound_leads.csv # Sample 251-row export (NOT the full 2500-row dataset)
└── CLAUDE.md         # This file
```

## Tech Stack
| Layer | Technology |
|---|---|
| Data pipeline | Python 3.13, pandas, scikit-learn, XGBoost |
| Backend API | FastAPI, uvicorn |
| LLM integration | Google Gemini API – gemini-2.0-flash (free tier, `google-generativeai` package) |
| Frontend | Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui |
| Charts | Recharts |
| Database | Supabase (PostgreSQL) – read-only via REST API |
| Package manager | pip (backend), npm (frontend) |

## LLM Config (Gemini)
```
Model: gemini-2.0-flash
Package: google-generativeai
Key env var: GEMINI_API_KEY
Task: extract structured lead fields from freeform text (email, call transcript, message)
```

## UI Design Direction
- Light-themed: white / off-white background (#FAFAFA or white)
- Clean, professional SaaS aesthetic
- Non-technical users (sales/marketing team) — keep UI simple and self-explanatory
- shadcn/ui default light theme, blue as primary accent
- sidebar: white with subtle border, not dark

## Supabase Connection
```
BASE_URL  = https://dqcqexieqlfqylqwogsj.supabase.co
ENDPOINT  = /rest/v1/inbound_leads
API_KEY   = sb_publishable_iFgXlEVP5UqmrZx6l1nVgw_6WD5CPpy
```
Pagination: use `Range` header with `PAGE_SIZE=500`. Full dataset is **2500 rows**.

## Data Schema – inbound_leads
| Column | Type | Notes |
|---|---|---|
| lead_id | string | Unique identifier (drop from model) |
| lead_date | string | Inconsistent format – normalize to ISO |
| property_type | categorical | Detached, Semi-Detached, Townhouse, Apartment, Heritage Home |
| neighbourhood | categorical | Has typos (Sydenhamm, Down Town, Westend) – normalize |
| estimated_job_size_sqft | float | Some nulls and 0s – impute median by property_type |
| requested_timeline | categorical | ASAP, 1-2 weeks, 1 month, Flexible |
| referral_source | categorical | Typos: FaceBook, Door 2 Door, LawnSign – normalize |
| homeowner_status | categorical | Own, Rent, Recently Purchased |
| preferred_contact | categorical | Drop from model – operational, not predictive |
| lead_capture_weather | categorical | Drop from model – no causal link to conversion |
| distance_to_queens_km | float | Some nulls – impute median |
| customer_age_bracket | categorical | 18-24, 25-34, 35-44, 45-54, 55-64, 65+ |
| has_pets | bool | Drop from model – minimal impact |
| lead_weekday | categorical | Drop from model – minimal impact |
| expected_profit_band | categorical | TARGET: Low, Medium, High. ~half rows are null (unlabeled) |

## Key Business Logic
- `expected_profit_band` = expected profit IF the lead converts (given by business rules)
- **No conversion labels exist** – we infer conversion likelihood from features
- **Priority Score** = Conversion Probability Score × Profit Band Score
  - Conversion score: heuristic weights (homeowner_status + requested_timeline)
  - Profit band: ML model prediction (XGBoost, trained on labeled rows)
- Final ranking: **highest priority score = contact first**

## Features Kept for Model (8 features)
1. `estimated_job_size_sqft` – strongest predictor (direct revenue driver)
2. `homeowner_status` – Own/Recently Purchased >>> Rent
3. `requested_timeline` – ASAP = high urgency/commitment
4. `property_type` – Detached > Heritage > Semi > Townhouse > Apartment
5. `referral_source` – WOM/referral converts best; cold outreach worst
6. `neighbourhood` – correlates with property values and homeownership rates
7. `distance_to_queens_km` – operational efficiency (closer = cheaper)
8. `customer_age_bracket` – 35-64 are the primary homeowner/investor demographic

## Features Dropped
- `lead_id`, `lead_date` (identifier / temporality not needed for ranking)
- `preferred_contact` (operational only)
- `lead_capture_weather` (no causal link)
- `has_pets` (negligible signal)
- `lead_weekday` (negligible signal)

## Conventions
- All Python: PEP 8, type hints, docstrings on public functions
- All TypeScript: strict mode, named exports
- API routes: `/api/v1/...`
- Environment variables: `.env` files (never commit)
- Never commit the API key – use environment variable `SUPABASE_KEY`

## User's Background Note
User is a software engineer comfortable with full-stack dev but **new to data analysis / ML**. Explanations in docs should justify every data/model choice in plain language so they can defend it in the interview.
