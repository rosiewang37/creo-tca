# Slide Deck Plan – CREO TCA Presentation
**Format**: 4–6 slides (excluding title + transitions) | 10 minutes | No code

---

## Narrative Arc

The story you're telling in 10 minutes:
> *"The sales team is drowning in leads. I built a tool that tells them exactly who to call first — and why — using the data you already have."*

Frame everything around **business impact**, not technical details.

---

## Slide 1: Title
**Title**: Lead Prioritization Engine for CREO Solutions
**Subtitle**: From 2500 Unranked Leads to a Clear Contact Priority List
**Your name + date**

*Say*: "Thank you for having me. Today I'll walk you through how I approached this problem, the analysis behind my decisions, and the tool I built."

---

## Slide 2: Intro — Problem + Tools + Process

### Left: The Problem
- CREO generates 200–400 leads/month
- Without ranking: equal time spent on every lead
- **Result**: low-value leads consume capacity that should go to high-value ones
- **Opportunity**: the data already tells us which leads are worth pursuing

### Middle: Tools Used
| Layer | Tool |
|---|---|
| Data | Python, pandas |
| Model | XGBoost (gradient boosting) |
| Backend | FastAPI |
| Frontend | Next.js, TypeScript, Tailwind |
| AI | Claude API (Anthropic) |
| Database | Supabase |

### Right: Process Breakdown (simple flow)
```
Fetch 2500 rows → Clean & Normalize data
        ↓
Exploratory Analysis → identify key patterns
        ↓
Build scoring model → rank all leads
        ↓
FastAPI backend + Next.js dashboard
        ↓
AI text analyzer → score any inquiry
```

*Say*: "I used Python and XGBoost for the data science layer, FastAPI for the API, and Next.js for the front end. The whole process started with understanding the data before writing a single line of model code."

---

## Slide 3: Analysis — Data Exploration & Key Insights

**Title**: What the Data Tells Us

**Use 3–4 charts from EDA output:**

### Chart 1: Profit Band Distribution
(Donut/bar chart: % of leads that are Low/Medium/High/Unlabeled)

*Say*: "About half our labeled leads fall into the High profit band — meaning there's real potential here, but we need to know which unlabeled leads also belong in that category."

### Chart 2: Referral Source vs. Profit Band
(Stacked bar: Facebook Ads / Lawn Signs / Door-to-Door / WOM × Low/Med/High %)

*Say*: "Word-of-mouth referrals have the highest proportion of High profit band leads — they already know us and have high intent. This is a key driver in our scoring."

### Chart 3: Job Size by Property Type
(Box plot or bar: Detached >> Heritage > Semi-Detached > Townhouse > Apartment)

*Say*: "Job size directly drives profit. Detached homes have 2–3× the square footage of apartments. Property type is our strongest predictor."

### Chart 4: Homeowner Status vs. Profit Band
(Bar: Own / Recently Purchased / Rent × % High band)

*Say*: "Renters almost never hire a painting company — they'd need landlord approval and have no financial stake. Homeownership status is a hard gate in our scoring."

---

## Slide 4: Analysis — Scoring Model

**Title**: How We Score Every Lead

### Two-Layer Scoring (the key insight — visualize as a diagram)

```
PRIORITY SCORE = Conversion Weight × Profit Band Score
                      (0.0 – 1.0)        (0.33 – 1.0)
```

**Conversion Weight** — *Domain-logic layer* (no ML needed):
- Homeowner status: Own=1.0, Recently Purchased=0.85, Rent=0.3
- Timeline urgency: ASAP=1.0, 1-2 weeks=0.8, 1 month=0.6, Flexible=0.4
- Multiply → normalize → this captures "will they commit?"

**Profit Band Score** — *Machine learning layer* (XGBoost):
- Trained on ~1,250 labeled rows (where profit band was provided)
- 8 features: job size, property type, neighbourhood, referral source, distance, age bracket
- Predicts Low/Medium/High for all 2,500 rows
- Top features: `estimated_job_size_sqft` > `property_type` > `referral_source`

### Feature Importance Chart
(Horizontal bar: feature name → importance score, from model output)

*Say*: "I separated conversion likelihood from profit potential deliberately — these are independent dimensions. A renter with a huge job is a bad lead because they can't make the decision. An owner who needs painting ASAP with a big house is exactly who we want. Multiplying the two gives us a single **expected value** score."

*Why XGBoost?* "It handles missing values natively, gives us interpretable feature importances, and consistently outperforms simpler models on tabular data at this scale. I also tested logistic regression as a baseline — XGBoost improved macro F1 by [X]%." *(fill in after running model)*

---

## Slide 5: Product — Features & Demo

**Title**: The Tool

**3 core views (screenshot from demo):**

### View 1: Dashboard
- At-a-glance: how many High/Medium/Low leads, avg priority score
- Charts: profit band by source, avg job size by neighbourhood
- *"Marketing can see which channels are bringing in the best leads"*

### View 2: Lead Priority Table
- All 2500 leads, ranked by priority score
- Color-coded badges (green=high, yellow=medium, red=low)
- Click any lead → see the exact factors driving its score
- *"Sales knows exactly who to call first, and why"*

### View 3: AI Text Analyzer
- Paste a call transcript, email, or WhatsApp message
- Claude extracts lead fields automatically
- Instantly scores and adds to priority queue
- *"No more manual data entry — drop in any inquiry and get a score"*

### View 4: Priority Queue
- Curated contact list the team manages
- Add leads from the analyzer or table
- Track contact status (Todo / In Progress / Done)
- *"The team's daily action list — always sorted by expected value"*

*Say*: "The key design principle was: non-technical employees should be able to use this without training. Everything is visual, and every score comes with a plain-English explanation."

---

## Slide 6: Summary — How It Solves the Problem

**Title**: From Intuition to Data-Driven Prioritization

### The Before vs. After

| Before | After |
|---|---|
| All leads treated equally | Every lead has a priority score |
| Manual gut-feel ranking | Objective, data-driven ranking |
| Wasted time on renters and low-intent leads | First call goes to highest expected value |
| No way to analyze inquiry texts quickly | Claude extracts and scores in seconds |
| No tracking of contact pipeline | Priority queue with status tracking |

### Key Takeaways
1. **Job size + homeowner status + urgency** are the three strongest predictors of lead quality
2. Word-of-mouth referrals are ~[X]× more likely to be High-band than Facebook Ads
3. The scoring model is explainable — the team can understand why any lead ranks where it does
4. The tool is built to scale: new leads automatically get scored when fetched from Supabase

### Next Steps (if time allowed)
- Collect actual conversion data → retrain model on real outcomes (not proxy profit band)
- A/B test: does following the priority queue actually improve close rate?
- Email/CRM integration to auto-import leads
- Mobile-friendly view for field teams

*Say*: "The most important thing I built is the infrastructure and the reasoning. As CREO collects real conversion data, the model can be retrained on actual outcomes and get meaningfully better over time."

---

## Presentation Tips

- **Do NOT show code** (per the brief)
- Start with the business problem, not the technology
- For every technical choice (XGBoost, two-layer scoring), have a 1-sentence business justification ready
- When asked about decisions: "I chose X because Y is what the business cares about"
- Likely Q&A questions to prepare for:
  - "How would you handle new leads that have different data fields?"
  - "What if the model predictions are wrong?"
  - "How do you retrain this as you get new data?"
  - "Why did you drop weather / weekday / pets?"
  - "How would you handle the dataset having no conversion labels?"
  - "What does the priority score actually mean in dollar terms?"

---

## Slide Checklist Before Presenting

- [ ] All chart images generated from actual 2500-row data (not the 251-row sample)
- [ ] Model accuracy metric filled in (slide 4)
- [ ] Feature importance chart generated from trained model
- [ ] Demo working end-to-end (have a fallback screenshot ready)
- [ ] PDF exported as: `[Your Name] – Astra TCA Presentation.pdf`
- [ ] Submitted to: https://forms.gle/BJFesJnBUshsBpxHA
