"""Predict endpoint — score a single lead payload."""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from ml.model import LeadScorer

router = APIRouter()

scorer: LeadScorer | None = None


def _get_scorer() -> LeadScorer:
    global scorer
    if scorer is None:
        scorer = LeadScorer()
        scorer.load()
    return scorer


class PredictRequest(BaseModel):
    property_type: str = "Detached"
    neighbourhood: str = "Downtown"
    estimated_job_size_sqft: float = 1500.0
    requested_timeline: str = "Flexible"
    referral_source: str = "Facebook Ads"
    homeowner_status: str = "Own"
    distance_to_queens_km: float = 5.0
    customer_age_bracket: str = "35-44"
    expected_profit_band: Optional[str] = None


@router.post("/predict")
def predict_lead(req: PredictRequest):
    s = _get_scorer()
    result = s.score_lead(req.model_dump())
    return result
