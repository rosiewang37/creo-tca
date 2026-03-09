# Technical Specification – CREO Lead Prioritization Tool

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         FRONTEND  (Next.js :3000)                    │
│  Dashboard | Lead Table | AI Analyzer | Priority Queue               │
│                              │ HTTP REST                             │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────────┐
│                    BACKEND  (FastAPI :8000)                          │
│  GET  /api/v1/leads          → paginated ranked lead list            │
│  GET  /api/v1/leads/{id}     → single lead + factor breakdown        │
│  POST /api/v1/predict        → score a structured lead payload       │
│  POST /api/v1/analyze-text   → Gemini extract + score freeform text  │
│  GET  /api/v1/insights       → aggregated chart/stats data           │
│                                                                      │
│  ┌──────────────────┐    ┌──────────────────────────────────────┐   │
│  │ ML Score Engine  │    │ Gemini Client (text → lead JSON)     │   │
│  │ (XGBoost .pkl)   │    │ (google-generativeai, gemini-2.0-flash)│  │
│  └──────────────────┘    └──────────────────────────────────────┘   │
│  Data loaded from data/leads_scored.csv on startup (in-memory)      │
└──────────────────────────────────────────────────────────────────────┘
                               │ REST (Supabase API)
┌──────────────────────────────▼──────────────────────────────────────┐
│   Supabase PostgreSQL — table: inbound_leads (2500 rows, read-only) │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Pipeline

### Supabase Fetch
- `GET https://dqcqexieqlfqylqwogsj.supabase.co/rest/v1/inbound_leads`
- Header: `Range: 0-499` (increment by 500 for each page)
- Header: `apikey: <SUPABASE_KEY>`
- 5 requests × 500 rows = 2500 rows → cache to `data/leads_raw.csv`

### Data Quality Issues (from 251-row sample)

| Issue | Example | Fix |
|---|---|---|
| Inconsistent dates | `01/24/2026`, `14-Feb-2026`, `02-Jan-2026` | `pd.to_datetime(col, infer_datetime_format=True)` |
| Neighbourhood typos | `Sydenhamm Ward`, `Down Town`, `Westend` | Apply `NEIGHBOURHOOD_MAP` |
| Referral source typos | `FaceBook`, `Door 2 Door`, `LawnSign` | Apply `REFERRAL_MAP` |
| Missing `estimated_job_size_sqft` | Null or 0.0 | Median per `property_type` |
| Missing `distance_to_queens_km` | Null | Overall median |
| Missing `customer_age_bracket` | Null | Mode |
| Missing `expected_profit_band` | ~half dataset | Target to predict |

### Canonical Value Maps

```python
NEIGHBOURHOOD_MAP = {
    "sydenhamm ward": "Sydenham Ward",
    "down town": "Downtown",
    "westend": "West End",
    "portsmoth village": "Portsmouth Village",
    # correct spellings pass through unchanged
}

REFERRAL_MAP = {
    "facebook": "Facebook Ads",
    "facebook ads": "Facebook Ads",
    "door 2 door": "Door-to-Door",
    "door-to-door": "Door-to-Door",
    "lawnsign": "Lawn Signs",
    "lawn signs": "Lawn Signs",
    "word of mouth/referral": "Word of Mouth/Referral",
    "word of mouth": "Word of Mouth/Referral",
}
```

---

## ML Model

### Priority Scoring Formula

```
priority_score = conversion_weight × profit_band_score

conversion_weight (heuristic, 0.0–1.0):
  homeowner_score: Own=1.0, Recently Purchased=0.85, Rent=0.3
  timeline_score:  ASAP=1.0, 1-2 weeks=0.8, 1 month=0.6, Flexible=0.4
  → multiply both, result is already in [0, 1]

profit_band_score (XGBoost prediction, 0.33–1.0):
  Low=0.33, Medium=0.67, High=1.0
  → use predict_proba weighted average for smoother scores
```

### Features

| Feature | Encoding |
|---|---|
| `estimated_job_size_sqft` | StandardScaler |
| `homeowner_status` | One-hot |
| `requested_timeline` | Ordinal: ASAP=4, 1-2 weeks=3, 1 month=2, Flexible=1 |
| `property_type` | One-hot |
| `referral_source` | One-hot |
| `neighbourhood` | One-hot |
| `distance_to_queens_km` | StandardScaler |
| `customer_age_bracket` | Ordinal: 18-24=1, 25-34=2, 35-44=3, 45-54=4, 55-64=5, 65+=6 |

### Model Config
```python
XGBClassifier(
    n_estimators=200,
    max_depth=4,
    learning_rate=0.1,
    random_state=42,
    use_label_encoder=False,
    eval_metric="mlogloss"
)
```

Training: labeled rows only (~1250 rows where `expected_profit_band` is not null)
Split: 80/20 stratified by `expected_profit_band`
Output per lead:
```json
{
  "lead_id": "LD-20260205-58429924",
  "predicted_profit_band": "High",
  "profit_band_confidence": 0.87,
  "conversion_weight": 0.80,
  "priority_score": 0.696,
  "priority_rank": 12,
  "top_factors": ["estimated_job_size_sqft", "homeowner_status", "requested_timeline"]
}
```

---

## API Endpoints

### GET /api/v1/leads
```
Query params: page (int), limit (int, default 50), sort (str), order (asc|desc),
              profit_band (Low|Medium|High), neighbourhood (str), source (str), min_score (float)
Returns: { leads: [...], total: int, page: int }
```

### GET /api/v1/leads/{lead_id}
```
Returns: full lead object + factor breakdown (top 3 features with direction labels)
```

### POST /api/v1/predict
```
Body: { property_type, neighbourhood, estimated_job_size_sqft, requested_timeline,
        referral_source, homeowner_status, distance_to_queens_km, customer_age_bracket }
Returns: { priority_score, predicted_profit_band, conversion_weight,
           top_factors: [{ feature, impact, direction }] }
```

### POST /api/v1/analyze-text
```
Body: { text: string }
Flow: Gemini extracts fields → validate + apply defaults → run predict logic
Returns: { extracted_fields: {...}, found_fields: [...], defaulted_fields: [...],
           priority_score, predicted_profit_band, explanation: string }
```

### GET /api/v1/insights
```
Returns: {
  profit_band_dist: { Low: int, Medium: int, High: int, Unknown: int },
  avg_score_by_source: { "Word of Mouth/Referral": float, ... },
  avg_sqft_by_neighbourhood: { Downtown: float, ... },
  leads_by_week: [...],
  top_leads: [top 10 by priority_score]
}
```

---

## File Structure

```
backend/
├── main.py                    # FastAPI app + CORS + startup data load
├── api/
│   └── routes/
│       ├── leads.py           # /leads endpoints
│       ├── predict.py         # /predict endpoint
│       ├── analyze.py         # /analyze-text endpoint
│       └── insights.py        # /insights endpoint
├── ml/
│   ├── pipeline.py            # fetch_all_leads(), clean(df)
│   ├── eda.py                 # generate_charts() → saves PNGs
│   ├── model.py               # train(), score_lead(), score_all()
│   └── model.pkl              # saved model (gitignored)
├── services/
│   └── gemini_client.py       # Gemini API wrapper + system prompt
├── core/
│   └── config.py              # env var loading (SUPABASE_KEY, GEMINI_API_KEY)
├── data/
│   ├── leads_raw.csv          # 2500-row fetch cache (gitignored)
│   ├── leads_scored.csv       # all leads with priority scores (gitignored)
│   └── charts/                # EDA + feature importance PNGs
└── requirements.txt

frontend/
├── app/
│   ├── page.tsx               # redirect to /dashboard
│   ├── dashboard/page.tsx
│   ├── leads/page.tsx
│   ├── analyze/page.tsx
│   └── queue/page.tsx
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── dashboard/
│   │   ├── MetricCard.tsx
│   │   ├── ProfitBandChart.tsx
│   │   ├── ConversionBySourceChart.tsx
│   │   ├── NeighbourhoodChart.tsx
│   │   └── TopLeadsTable.tsx
│   ├── leads/
│   │   ├── LeadTable.tsx
│   │   ├── LeadRow.tsx
│   │   └── LeadDetail.tsx     # slide-out drawer
│   ├── analyze/
│   │   ├── TextUploader.tsx
│   │   └── LeadResultCard.tsx
│   └── queue/
│       ├── QueueList.tsx
│       └── QueueItem.tsx
├── lib/
│   ├── api.ts                 # API client (all fetch calls to :8000)
│   ├── types.ts               # TypeScript interfaces for Lead, QueueItem, Insights
│   └── queue-store.ts         # localStorage read/write helpers
└── .env.local                 # NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Gemini System Prompt

```
You are a data extraction assistant for a residential painting company.
Extract lead information from the provided text and return ONLY a JSON object with these exact fields (use null for anything not mentioned):
{
  "property_type": null,         // Detached | Semi-Detached | Townhouse | Apartment | Heritage Home
  "neighbourhood": null,         // Kingston neighbourhood name
  "estimated_job_size_sqft": null,  // numeric
  "requested_timeline": null,    // ASAP | 1-2 weeks | 1 month | Flexible
  "referral_source": null,       // Facebook Ads | Door-to-Door | Lawn Signs | Word of Mouth/Referral
  "homeowner_status": null,      // Own | Rent | Recently Purchased
  "distance_to_queens_km": null, // numeric (estimate from neighbourhood if possible)
  "customer_age_bracket": null   // 18-24 | 25-34 | 35-44 | 45-54 | 55-64 | 65+
}
Map informal terms: "bungalow"→Detached, "condo"→Apartment, "urgent"→ASAP, "next week"→1-2 weeks.
```
