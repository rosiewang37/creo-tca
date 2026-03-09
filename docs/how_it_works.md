# How It Works – CREO Lead Prioritization Tool
**For your interview prep. Written in plain language, not for Claude.**

---

## The Big Picture

CREO has a spreadsheet of 2500 leads. Some are homeowners with big painting jobs who are ready to hire. Others are renters who will never hire a painter. Right now, the sales team calls them in random order.

**What this tool does**: reads those 2500 leads, assigns each one a priority score from 0 to 1, and sorts them so the most likely, most profitable leads are at the top. The sales rep opens the tool in the morning and calls top-to-bottom.

---

## What "Priority Score" Actually Means

The priority score answers: *"If we call this lead, how valuable is the expected outcome?"*

It's calculated by multiplying two independent things:

```
Priority Score = Conversion Weight × Profit Band Score
```

**Why multiply them?**
- A renter with a huge house = low priority (can't make the decision → won't convert)
- A homeowner with a tiny apartment = medium priority (will convert, but the job is small)
- A homeowner with a big house who calls ASAP = high priority (will convert AND the job is big)
- Multiplying ensures BOTH conditions must be true for a lead to rank highly

### Conversion Weight (0.0 to 1.0)

This is pure business logic — no machine learning. It answers: *"Will this person actually hire us?"*

| Signal | Values | Score |
|---|---|---|
| Homeowner status | Own | 1.0 |
| | Recently Purchased | 0.85 |
| | Rent | 0.3 |
| Timeline urgency | ASAP | 1.0 |
| | 1-2 weeks | 0.8 |
| | 1 month | 0.6 |
| | Flexible | 0.4 |

Multiply the two scores together. A homeowner (1.0) who needs it ASAP (1.0) = conversion weight of 1.0. A renter (0.3) with a flexible timeline (0.4) = 0.12.

**Why only these two?** These are the two things you can know from a brief inquiry that most directly gate the conversion. A renter literally cannot hire a painter without landlord approval. Someone who says "urgent" has already committed mentally.

### Profit Band Score (0.33 to 1.0)

This is the machine learning part. It answers: *"If this person does hire us, how big will the job be?"*

The ML model (XGBoost) was trained on ~1,250 rows where a human had already labeled the `expected_profit_band` as Low, Medium, or High. It learned patterns from those labels. Now it can predict the band for the other ~1,250 rows that weren't labeled.

The prediction gets converted to a number:
- Low = 0.33
- Medium = 0.67
- High = 1.0

(These aren't arbitrary — they're evenly spaced so each band is meaningfully different.)

---

## The Machine Learning Model

### Why XGBoost?

| Model | What it does | Why not chosen |
|---|---|---|
| Logistic Regression | Draws a straight line between classes | Too simple — can't capture "big detached home in West End" as a combined signal |
| Random Forest | Builds many decision trees, averages them | Almost as good as XGBoost, but slightly less accurate |
| **XGBoost** | Builds trees sequentially, each correcting the last | Best accuracy on small tabular datasets; natively handles missing values; gives feature importance |
| Neural Network | Learns complex patterns with many layers | Overkill for 2500 rows; black box; slow to tune |

XGBoost is the industry standard for tabular data at this scale.

### What the Model Learns

It looks at 8 features and learns which combinations predict High/Medium/Low profit:

| Feature | Why it matters |
|---|---|
| `estimated_job_size_sqft` | More sqft = more paint = more revenue. Direct causal link. |
| `homeowner_status` | Owners can make decisions; renters can't. |
| `requested_timeline` | ASAP = committed buyer. Flexible = still shopping around. |
| `property_type` | Detached homes have more exterior surface than apartments. |
| `referral_source` | Word-of-mouth leads already trust CREO; cold Facebook Ads don't. |
| `neighbourhood` | Some areas have higher homeownership rates and larger lots. |
| `distance_to_queens_km` | Closer jobs have lower travel overhead → better margin. |
| `customer_age_bracket` | 35–64 are the core homeowner/investor demographic. |

### What was dropped and why

| Feature | Reason dropped |
|---|---|
| `lead_date` | Day someone called doesn't predict whether they'll hire |
| `preferred_contact` | Operational preference, not a buying signal |
| `lead_capture_weather` | No causal mechanism — rain doesn't make people more likely to paint |
| `has_pets` | No impact on hiring a painter |
| `lead_weekday` | Day of week lead was captured has no predictive value |

The rule for dropping: *"Does this tell us something about whether the person will hire us, or how big the job will be?"* If no, drop it.

---

## The Data Problem (and Why It's Interesting)

The dataset has a twist: **about half the rows have no `expected_profit_band` label**.

This is actually a common real-world situation. The business labeled leads they knew about, but didn't get to the rest. This means:

- We can't train on all 2500 rows
- We train the ML model on the ~1250 labeled rows
- Then we use the trained model to **predict** the profit band for the other ~1250 rows
- Now all 2500 rows have a predicted profit band → all get a priority score → all get ranked

---

## How the AI Text Analyzer Works

When a sales rep pastes a call transcript like:

> *"Hi, I'm looking to get quotes for painting the exterior of my house in Kingston's West End area. It's a detached home, about 3000 sqft. We're hoping to get it done before summer, so ideally in the next few weeks."*

The tool calls the **Gemini 2.5 Flash** API with a system prompt instructing it to extract structured fields from freeform text. Gemini returns JSON:

```json
{
  "property_type": "Detached",
  "neighbourhood": "West End",
  "estimated_job_size_sqft": 3000,
  "requested_timeline": "1-2 weeks",
  "homeowner_status": "Own",
  ...
}
```

That JSON gets passed through the same scoring model. The result: a priority score in under 5 seconds, without manual data entry.

**Why Gemini and not a regex parser?**
Sales reps don't write in structured formats. "Before summer", "urgent", "bungalow", "I own it" — a regex can't handle this. Gemini understands natural language and maps it to canonical values. Zero-shot, no training required.

---

## The Full Data Flow (One Lead, Start to Finish)

```
1. Supabase API → raw CSV row:
   { lead_id: "LD-001", property_type: "Detached", neighbourhood: "Westend",
     homeowner_status: "Own", requested_timeline: "ASAP",
     estimated_job_size_sqft: 2800, expected_profit_band: null, ... }

2. Data cleaning:
   - "Westend" → "West End" (typo map)
   - estimated_job_size_sqft: 2800 (no change)
   - expected_profit_band: null → this lead is unlabeled

3. ML model prediction:
   - Encodes all 8 features
   - XGBoost predicts: P(Low)=0.05, P(Medium)=0.18, P(High)=0.77
   - profit_band_score = 0.05×0.33 + 0.18×0.67 + 0.77×1.0 = 0.913

4. Conversion weight:
   - homeowner: Own → 1.0
   - timeline: ASAP → 1.0
   - conversion_weight = 1.0 × 1.0 = 1.0

5. Priority score:
   priority_score = 1.0 × 0.913 = 0.913

6. Result:
   { priority_score: 0.913, priority_rank: 4, predicted_profit_band: "High",
     top_factors: ["Large job size (+)", "Homeowner owns property (+)", "ASAP timeline (+)"] }
```

---

## Likely Interview Questions & Answers

**Q: Why not just use the profit band label directly instead of a model?**
A: Half the rows don't have a label. We need to fill in those 1250 unknowns so we can rank all 2500 leads. The model learns patterns from the labeled half and applies them to the unlabeled half.

**Q: Why multiply conversion and profit instead of adding them?**
A: Adding would still give a renter a decent score if they have a big job. Multiplying means a renter (0.3 conversion weight) can never reach a high final score, no matter how big the job. This matches the business reality — renters almost never hire.

**Q: What if the model is wrong on a prediction?**
A: The model gives probabilities, not hard predictions. A lead predicted as "High" with 60% confidence gets a lower profit_band_score than one with 90% confidence. Also, the conversion weight is pure business logic — that part can't be "wrong" in the ML sense, it's a deliberate design choice.

**Q: Why did you drop weather/weekday/pets?**
A: No causal mechanism. A lead captured on a rainy Tuesday with a dog is just as likely to convert as one on a sunny Monday without pets. Including them would be spurious correlation — the model might "learn" something that doesn't generalize. Features should have a business reason.

**Q: How would you retrain this as CREO gets more data?**
A: Replace the proxy target (`expected_profit_band`) with real conversion outcomes once the sales team logs actual deal results. Re-run `python -m ml.model` — the pipeline is already set up. The model improves automatically as more labeled data accumulates.

**Q: What does a priority score of 0.7 mean in dollar terms?**
A: Right now, it's a relative ranking — 0.7 is better than 0.5. To convert to dollars, CREO would need historical conversion rates and average job sizes by profit band. Once they collect that, `expected_value = priority_score × avg_job_value_if_converts`. The infrastructure is ready for that calculation.

**Q: Why not use a neural network for better accuracy?**
A: 2500 rows total, ~1250 labeled. Neural networks need large datasets to avoid overfitting. XGBoost consistently outperforms neural nets on small-to-medium tabular datasets. The principle: use the simplest model that achieves the goal.

**Q: How does the tool handle a completely new lead type that wasn't in the training data?**
A: XGBoost handles new categorical values gracefully (treats them as unknown → falls back to majority class behavior). The conversion weight uses explicit rules, so it always computes correctly. The model is more likely to be uncertain (lower confidence scores) on novel leads, which is the right behavior.

---

## Decision Summary Table

| Decision | What was chosen | Why |
|---|---|---|
| ML model | XGBoost | Best accuracy on tabular data at this scale; handles missing values; gives feature importance |
| Scoring formula | Conversion Weight × Profit Band | Separates the "will they hire?" question from "how profitable is it?" — logically independent |
| LLM for text extraction | Gemini 2.5 Flash | Free tier; handles natural language better than any regex; zero-shot structured extraction |
| Queue persistence | localStorage | No auth needed, no backend writes, fast, sufficient for single-user demo |
| Features dropped | weather, weekday, pets, preferred_contact | No causal mechanism linking them to conversion or profitability |
| Half-labeled dataset | Train on labeled, predict for unlabeled | Standard semi-supervised approach for proxy-labeled datasets |
| Priority score range | 0.0–1.0 | Interpretable; easily mapped to red/yellow/green UI badges |
