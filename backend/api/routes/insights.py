"""Insights endpoint — aggregated stats and chart data."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/insights")
def get_insights():
    from main import get_leads_df
    df = get_leads_df().copy()

    # Profit band distribution
    band_counts = df["expected_profit_band"].fillna("Unknown").value_counts().to_dict()

    # Avg lead quality score by referral source
    avg_score_by_source = (
        df.groupby("referral_source")["lead_quality_score"]
        .mean()
        .round(4)
        .sort_values(ascending=False)
        .to_dict()
    )

    # Avg sqft by neighbourhood
    avg_sqft_by_neighbourhood = (
        df.groupby("neighbourhood")["estimated_job_size_sqft"]
        .mean()
        .round(0)
        .sort_values(ascending=False)
        .to_dict()
    )

    # Lead quality score distribution by homeowner status
    avg_score_by_homeowner = (
        df.groupby("homeowner_status")["lead_quality_score"]
        .mean()
        .round(4)
        .to_dict()
    )

    # Top 10 leads
    top_leads = []
    for _, row in df.nsmallest(10, "priority_rank").iterrows():
        top_leads.append({
            "lead_id": row["lead_id"],
            "property_type": row.get("property_type"),
            "neighbourhood": row.get("neighbourhood"),
            "lead_quality_score": round(float(row["lead_quality_score"]), 4),
            "homeowner_status": row.get("homeowner_status"),
            "requested_timeline": row.get("requested_timeline"),
            "referral_source": row.get("referral_source"),
            "expected_profit_band": row.get("expected_profit_band") if str(row.get("expected_profit_band")) != "nan" else None,
            "priority_rank": int(row["priority_rank"]),
        })

    # Summary KPIs
    total_leads = len(df)
    high_quality_count = int((df["lead_quality_score"] >= 0.7).sum())
    avg_quality_score = round(float(df["lead_quality_score"].mean()), 4)
    leads_this_month = total_leads  # all leads in dataset

    # Score distribution for histogram
    bins = [0, 0.2, 0.35, 0.5, 0.6, 0.7, 0.8, 1.0]
    labels = ["0-0.2", "0.2-0.35", "0.35-0.5", "0.5-0.6", "0.6-0.7", "0.7-0.8", "0.8-1.0"]
    df["score_bin"] = pd.cut(df["lead_quality_score"], bins=bins, labels=labels, include_lowest=True)
    score_distribution = df["score_bin"].value_counts().sort_index().to_dict()
    score_distribution = {str(k): int(v) for k, v in score_distribution.items()}

    # Filter options (for frontend dropdowns)
    neighbourhoods = sorted(df["neighbourhood"].dropna().unique().tolist())
    referral_sources = sorted(df["referral_source"].dropna().unique().tolist())

    return {
        "kpis": {
            "total_leads": total_leads,
            "high_quality_count": high_quality_count,
            "avg_quality_score": avg_quality_score,
            "leads_this_month": leads_this_month,
        },
        "profit_band_dist": band_counts,
        "avg_score_by_source": avg_score_by_source,
        "avg_sqft_by_neighbourhood": avg_sqft_by_neighbourhood,
        "avg_score_by_homeowner": avg_score_by_homeowner,
        "score_distribution": score_distribution,
        "top_leads": top_leads,
        "filter_options": {
            "neighbourhoods": neighbourhoods,
            "referral_sources": referral_sources,
        },
    }


# Need pandas for the cut function
import pandas as pd
