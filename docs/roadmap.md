# Development Roadmap – CREO Lead Prioritization Tool
**Due: March 8, 2026 | Presentation: March 9–10**

## Time Budget

| Phase | Task | Est. Hours | Priority |
|---|---|---|---|
| 0 | Setup | 0.5h | Must |
| 1 | Data pipeline (fetch, clean, EDA) | 2.5h | Must |
| 2 | ML model (train, evaluate, score) | 2.5h | Must |
| 3 | Backend API (FastAPI) | 2.5h | Must |
| 4 | Frontend (Next.js, 4 views) | 4.0h | Must |
| 5 | LLM text analyzer | 1.5h | Should |
| 6 | Polish + demo recording | 1.5h | Should |
| 7 | Slide deck | 1.5h | Must |
| **Total** | | **~16.5h** | |

---

## Phase 0 – Setup (0.5h)

- [ ] Initialize git with `.gitignore` (exclude `.env`, `*.pkl`, `data/*.csv`)
- [ ] Create `backend/` and `frontend/` directory scaffolds
- [ ] Add `.env.example` with `SUPABASE_KEY`, `GEMINI_API_KEY`
- [ ] Create `backend/requirements.txt`
- [ ] Run: `pip install fastapi uvicorn pandas scikit-learn xgboost google-generativeai python-dotenv`
- [ ] Run: `npx create-next-app@latest frontend --typescript --tailwind --app`
- [ ] Run: `cd frontend && npx shadcn@latest init && npm install recharts`

---

## Phase 1 – Data Pipeline (2.5h)

### 1.1 Fetch Full Dataset (0.5h)
File: `backend/ml/pipeline.py` → `fetch_all_leads()`
- Paginate Supabase REST API using `Range` header, `PAGE_SIZE=500`
- 5 requests × 500 rows = 2500 rows
- Save to `data/leads_raw.csv`

### 1.2 Data Cleaning (1.0h)
File: `backend/ml/pipeline.py` → `clean(df)`
- Normalize all dates to ISO format using `pd.to_datetime`
- Strip whitespace from all string columns
- Apply `NEIGHBOURHOOD_MAP` and `REFERRAL_MAP` canonical mappings (see `technical_spec.md`)
- Impute `estimated_job_size_sqft`: replace 0.0 with NaN, then fill with median per `property_type`
- Impute `distance_to_queens_km`: fill with overall median
- Impute `customer_age_bracket`: fill with mode
- Drop columns: `preferred_contact`, `lead_capture_weather`, `has_pets`, `lead_weekday`

### 1.3 EDA Charts (1.0h)
File: `backend/ml/eda.py`
Save all charts as PNG to `data/charts/`:
- `eda_profit_band_dist.png` — bar: Low/Medium/High/null counts
- `eda_referral_vs_band.png` — grouped bar: referral source × profit band %
- `eda_sqft_by_property.png` — box plot: sqft by property type
- `eda_timeline_vs_band.png` — stacked bar: timeline × profit band %
- `eda_neighbourhood_avg_sqft.png` — bar: avg sqft by neighbourhood
- `eda_homeowner_vs_band.png` — bar: homeowner status × profit band %

---

## Phase 2 – ML Model (2.5h)

### 2.1 Feature Engineering (0.5h)
File: `backend/ml/model.py`
- Ordinal encode: `requested_timeline` (ASAP=4, 1-2 weeks=3, 1 month=2, Flexible=1)
- Ordinal encode: `customer_age_bracket` (18-24=1 … 65+=6)
- One-hot encode: `property_type`, `neighbourhood`, `referral_source`, `homeowner_status`
- StandardScaler: `estimated_job_size_sqft`, `distance_to_queens_km`

### 2.2 Model Training (1.0h)
File: `backend/ml/model.py`
- Filter labeled rows (where `expected_profit_band` is not null)
- 80/20 train/test split, stratified by `expected_profit_band`
- Train `XGBClassifier(n_estimators=200, max_depth=4, learning_rate=0.1, random_state=42)`
- Print: accuracy, macro F1, confusion matrix
- Save feature importance chart → `data/charts/eda_feature_importance.png`
- Save model → `backend/ml/model.pkl`

**Gate**: macro F1 must be > 0.55. If not, print a warning but continue.

### 2.3 Score All Leads (0.5h)
File: `backend/ml/model.py` → `score_lead(row)`
```
conversion_weight = homeowner_score × timeline_score
  homeowner: Own=1.0, Recently Purchased=0.85, Rent=0.3
  timeline:  ASAP=1.0, 1-2 weeks=0.8, 1 month=0.6, Flexible=0.4

profit_band_score = model.predict_proba weighted avg (Low=0.33, Med=0.67, High=1.0)
priority_score = conversion_weight × profit_band_score
```

### 2.4 Export Scored Dataset (0.5h)
- Run model on all 2500 rows
- Add columns: `priority_score`, `priority_rank`, `predicted_profit_band`, `conversion_weight`, `top_factors`
- Save to `data/leads_scored.csv`

---

## Phase 3 – Backend API (2.5h)

### 3.1 FastAPI Setup (0.5h)
File: `backend/main.py`
- Load `data/leads_scored.csv` into memory on startup
- Add CORS middleware: `allow_origins=["http://localhost:3000"]`
- Register all routers

### 3.2 Leads Endpoint (0.5h)
File: `backend/api/routes/leads.py`
- `GET /api/v1/leads` — paginated, filtered, sorted lead list
  - Query params: `page`, `limit`, `sort`, `order`, `profit_band`, `neighbourhood`, `source`, `min_score`
  - Returns: `{ leads: [...], total: int, page: int }`
- `GET /api/v1/leads/{lead_id}` — single lead + factor breakdown

### 3.3 Predict Endpoint (0.5h)
File: `backend/api/routes/predict.py`
- `POST /api/v1/predict`
  - Body: all 8 model features
  - Returns: `priority_score`, `predicted_profit_band`, `conversion_weight`, `top_factors`

### 3.4 Analyze Text Endpoint (0.5h)
File: `backend/api/routes/analyze.py` + `backend/services/gemini_client.py`
- `POST /api/v1/analyze-text`
  - Body: `{ text: string }`
  - Gemini extracts structured fields → validate → run through predict logic
  - Returns: extracted fields + priority score + plain-English explanation

### 3.5 Insights Endpoint (0.5h)
File: `backend/api/routes/insights.py`
- `GET /api/v1/insights`
  - Returns pre-computed aggregations: profit band distribution, avg score by source, avg sqft by neighbourhood, leads by week, top 10 leads

---

## Phase 4 – Frontend (4.0h)

### 4.1 Layout + Sidebar (0.5h)
- shadcn/ui Sidebar with 4 nav items: Dashboard, Leads, Analyze, Queue
- Queue nav item shows badge with "To Contact" count from localStorage

### 4.2 Dashboard Page (1.0h)
File: `app/dashboard/page.tsx`
- 4 KPI cards (fetch from `/api/v1/insights`)
- `ProfitBandChart` — donut
- `ConversionBySourceChart` — horizontal bar
- `NeighbourhoodChart` — bar
- `TopLeadsTable` — top 5 leads with "Add to Queue"

### 4.3 Leads Page (1.0h)
File: `app/leads/page.tsx`
- Filterable, sortable table, 50 per page
- Color-coded priority score badges
- Slide-out drawer with factor breakdown on row click
- "Add to Queue" on each row + in drawer

### 4.4 Analyze Page (1.0h)
File: `app/analyze/page.tsx`
- Textarea + .txt file upload
- POST to `/api/v1/analyze-text`
- Result card with extracted fields, score, explanation, "Add to Queue"

### 4.5 Queue Page (0.5h)
File: `app/queue/page.tsx`
- Read/write localStorage for queue items
- Status cycle: To Contact → In Progress → Done (click to advance)
- Remove items
- Sorted by priority score

---

## Phase 5 – LLM Text Analyzer (1.5h)

### 5.1 Gemini Client (0.5h)
File: `backend/services/gemini_client.py`
- System prompt: extract 8 lead fields, return JSON, use null for missing
- Map free-form values to canonical: "bungalow" → "Detached", "urgent" → "ASAP", etc.

### 5.2 Prompt Testing (0.5h)
Test with: formal email, casual call notes, short WhatsApp message

### 5.3 Graceful Degradation (0.5h)
- `GEMINI_API_KEY` not set → return 503 with user-friendly message
- Field not extracted → use median/mode default, label as "Defaulted"
- Explain which fields were found vs. assumed

---

## Phase 6 – Polish + Demo (1.5h)

- Loading states on all API calls
- Error boundaries (API down, bad input)
- Responsive layout check
- Demo script: Dashboard → Leads → Analyze → Queue (≤2 minutes)

---

## Phase 7 – Slide Deck (1.5h)

See `docs/slide_deck_plan.md`.
Export as PDF: `[Your Name] – Astra TCA Presentation.pdf`

---

## Build Order (Critical Path)

```
Phase 0 → Phase 1 (data pipeline) → Phase 2 (model) → Phase 3 (API)
                                                      → Phase 4 (frontend, parallel with 3)
→ Phase 5 (LLM) → Phase 6 (polish) → Phase 7 (slides)
```

**Minimum viable product**: Phases 0–4.3 (Dashboard + Leads table). Stop here if time is short.

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| Model F1 < 0.55 | Fall back to pure heuristic scoring — still tells a good story |
| Supabase API down | Use `inbound_leads.csv` (251-row sample) as fallback |
| Frontend too slow | Ship Dashboard + Leads only; drop Analyze + Queue |
| Gemini quota exceeded | Analyzer shows "API unavailable" — rest of app unaffected |
| Time overrun | Cut Phase 5–6; present data analysis as the core value |
