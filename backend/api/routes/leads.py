"""Lead list and detail endpoints."""

import json
from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter()


@router.get("/leads")
def get_leads(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    sort: str = Query("lead_quality_score"),
    order: str = Query("desc"),
    profit_band: Optional[str] = None,
    neighbourhood: Optional[str] = None,
    source: Optional[str] = None,
    homeowner_status: Optional[str] = None,
    min_score: Optional[float] = None,
):
    from main import get_leads_df
    df = get_leads_df().copy()

    # Filters
    if profit_band:
        df = df[df["expected_profit_band"] == profit_band]
    if neighbourhood:
        df = df[df["neighbourhood"] == neighbourhood]
    if source:
        df = df[df["referral_source"] == source]
    if homeowner_status:
        df = df[df["homeowner_status"] == homeowner_status]
    if min_score is not None:
        df = df[df["lead_quality_score"] >= min_score]

    total = len(df)

    # Sort
    ascending = order.lower() == "asc"
    if sort in df.columns:
        if sort == "lead_quality_score":
            # Secondary tiebreaker: higher profit band ranks above on score ties
            profit_order = {"High": 3, "Medium": 2, "Low": 1}
            df["_pb_num"] = df["expected_profit_band"].map(profit_order).fillna(0)
            df = df.sort_values(
                ["lead_quality_score", "_pb_num"],
                ascending=[ascending, ascending],
                na_position="last",
            )
            df = df.drop(columns=["_pb_num"])
        else:
            df = df.sort_values(sort, ascending=ascending, na_position="last")

    # Paginate
    start = (page - 1) * limit
    end = start + limit
    page_df = df.iloc[start:end]

    leads_list = []
    for _, row in page_df.iterrows():
        lead = _row_to_dict(row)
        leads_list.append(lead)

    return {"leads": leads_list, "total": total, "page": page, "limit": limit}


@router.get("/leads/{lead_id}")
def get_lead(lead_id: str):
    from main import get_leads_df
    df = get_leads_df()

    match = df[df["lead_id"] == lead_id]
    if match.empty:
        return {"error": "Lead not found"}, 404

    row = match.iloc[0]
    lead = _row_to_dict(row)

    # Parse top_factors JSON
    try:
        lead["top_factors"] = json.loads(row.get("top_factors", "[]"))
    except (json.JSONDecodeError, TypeError):
        lead["top_factors"] = []

    return lead


def _row_to_dict(row) -> dict:
    """Convert a DataFrame row to a clean dict for API response."""
    d = {}
    for col in row.index:
        val = row[col]
        if hasattr(val, 'item'):
            val = val.item()
        if isinstance(val, float) and val != val:  # NaN check
            val = None
        d[col] = val

    # Parse top_factors if it's a string
    if isinstance(d.get("top_factors"), str):
        try:
            d["top_factors"] = json.loads(d["top_factors"])
        except (json.JSONDecodeError, TypeError):
            d["top_factors"] = []

    return d
