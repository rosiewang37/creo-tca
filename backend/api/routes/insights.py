"""Insights endpoint — aggregated stats and chart data."""

import json
import math
import pandas as pd
from fastapi import APIRouter

router = APIRouter()

# Conversion-weight lookup tables (mirrors model.py)
_HOMEOWNER_QUALITY = {"Own": 1.0, "Recently Purchased": 0.8, "Rent": 0.15}
_TIMELINE_QUALITY = {"ASAP": 1.0, "1-2 weeks": 0.75, "1 month": 0.45, "Flexible": 0.2}


def _conversion_weight(homeowner: str, timeline: str) -> float:
    """Conversion weight from the two heuristic drivers (homeowner + timeline)."""
    h = _HOMEOWNER_QUALITY.get(homeowner, 0.5)
    t = _TIMELINE_QUALITY.get(timeline, 0.3)
    # Normalised: homeowner 55%, timeline 45% (reflects 30/25 weight ratio)
    return round(h * 0.545 + t * 0.455, 4)


def _priority_tier(score: float) -> str:
    if score >= 0.7:
        return "High"
    if score >= 0.45:
        return "Medium"
    return "Low"


def _recommended_action(score: float, timeline: str) -> str:
    urgent = timeline in ("ASAP", "1-2 weeks")
    if score >= 0.7 and urgent:
        return "Call today"
    if score >= 0.7:
        return "Call this week"
    if score >= 0.45 and urgent:
        return "Call soon"
    if score >= 0.45:
        return "Send email"
    return "Add to nurture list"


@router.get("/insights")
def get_insights():
    from main import get_leads_df
    df = get_leads_df().copy()

    # ── Per-lead derived columns ────────────────────────────────────────────
    df["conversion_weight"] = df.apply(
        lambda r: _conversion_weight(r.get("homeowner_status", ""), r.get("requested_timeline", "")),
        axis=1,
    )
    df["priority_tier"] = df["lead_quality_score"].apply(_priority_tier)

    # ── KPIs ────────────────────────────────────────────────────────────────
    total_leads = len(df)
    high_quality_count = int((df["lead_quality_score"] >= 0.7).sum())
    avg_quality_score = round(float(df["lead_quality_score"].mean()), 4)

    # Urgent high-priority: score >= 0.7 AND timeline is ASAP or 1-2 weeks
    urgent_high = int(
        ((df["lead_quality_score"] >= 0.7) & (df["requested_timeline"].isin(["ASAP", "1-2 weeks"]))).sum()
    )

    # Best source
    source_avgs = df.groupby("referral_source")["lead_quality_score"].mean()
    best_source_name = source_avgs.idxmax() if len(source_avgs) > 0 else "N/A"
    best_source_score = round(float(source_avgs.max()), 4) if len(source_avgs) > 0 else 0

    # ── Top 10 leads (enriched) ─────────────────────────────────────────────
    top_leads = []
    for _, row in df.nsmallest(10, "priority_rank").iterrows():
        tf_raw = row.get("top_factors", "[]")
        try:
            top_factors = json.loads(tf_raw) if isinstance(tf_raw, str) else tf_raw
        except (json.JSONDecodeError, TypeError):
            top_factors = []

        score = float(row["lead_quality_score"])
        timeline = row.get("requested_timeline", "")
        cw = _conversion_weight(row.get("homeowner_status", ""), timeline)

        # Build "why" reasons from top_factors
        why = [f["explanation"] for f in top_factors if f.get("direction") == "+"]

        epb = row.get("expected_profit_band")
        epb_clean = epb if isinstance(epb, str) and epb in ("Low", "Medium", "High") else None

        top_leads.append({
            "lead_id": row["lead_id"],
            "property_type": row.get("property_type"),
            "neighbourhood": row.get("neighbourhood"),
            "lead_quality_score": round(score, 4),
            "homeowner_status": row.get("homeowner_status"),
            "requested_timeline": timeline,
            "referral_source": row.get("referral_source"),
            "expected_profit_band": epb_clean,
            "priority_rank": int(row["priority_rank"]),
            "top_factors": top_factors,
            "conversion_weight": cw,
            "priority_tier": _priority_tier(score),
            "recommended_action": _recommended_action(score, timeline),
            "why": why,
            "estimated_job_size_sqft": float(row.get("estimated_job_size_sqft", 0)),
            "distance_to_queens_km": float(row.get("distance_to_queens_km", 0)),
            "customer_age_bracket": row.get("customer_age_bracket"),
        })

    # ── Aggregations ────────────────────────────────────────────────────────

    avg_score_by_source = (
        df.groupby("referral_source")["lead_quality_score"]
        .mean().round(4).sort_values(ascending=False).to_dict()
    )

    avg_score_by_homeowner = (
        df.groupby("homeowner_status")["lead_quality_score"]
        .mean().round(4).to_dict()
    )

    avg_score_by_timeline = (
        df.groupby("requested_timeline")["lead_quality_score"]
        .mean().round(4).to_dict()
    )

    avg_score_by_property = (
        df.groupby("property_type")["lead_quality_score"]
        .mean().round(4).sort_values(ascending=False).to_dict()
    )

    # Priority tier counts
    priority_tier_counts = df["priority_tier"].value_counts().to_dict()

    # Scatter data (distance vs sqft, coloured by tier) — sample 200 for perf
    scatter_sample = df.sample(n=min(200, len(df)), random_state=42)
    scatter_data = []
    for _, r in scatter_sample.iterrows():
        dist = r.get("distance_to_queens_km", 0)
        sqft = r.get("estimated_job_size_sqft", 0)
        if not (math.isnan(dist) or math.isnan(sqft)):
            scatter_data.append({
                "distance": round(float(dist), 1),
                "sqft": round(float(sqft), 0),
                "tier": _priority_tier(float(r["lead_quality_score"])),
                "score": round(float(r["lead_quality_score"]), 2),
            })

    # Profit band distribution
    band_counts = df["expected_profit_band"].fillna("Unknown").value_counts().to_dict()

    # Filter options
    neighbourhoods = sorted(df["neighbourhood"].dropna().unique().tolist())
    referral_sources = sorted(df["referral_source"].dropna().unique().tolist())

    return {
        "kpis": {
            "total_leads": total_leads,
            "high_quality_count": high_quality_count,
            "avg_quality_score": avg_quality_score,
            "urgent_high_priority": urgent_high,
            "best_source_name": best_source_name,
            "best_source_score": best_source_score,
        },
        "top_leads": top_leads,
        "avg_score_by_source": avg_score_by_source,
        "avg_score_by_homeowner": avg_score_by_homeowner,
        "avg_score_by_timeline": avg_score_by_timeline,
        "avg_score_by_property": avg_score_by_property,
        "priority_tier_counts": priority_tier_counts,
        "scatter_data": scatter_data,
        "profit_band_dist": band_counts,
        "filter_options": {
            "neighbourhoods": neighbourhoods,
            "referral_sources": referral_sources,
        },
    }
