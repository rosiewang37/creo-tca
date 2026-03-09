"""Analyze text endpoint — Gemini extraction + scoring."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ml.model import LeadScorer
from services.gemini_client import extract_lead_from_text

router = APIRouter()

scorer: LeadScorer | None = None


def _get_scorer() -> LeadScorer:
    global scorer
    if scorer is None:
        scorer = LeadScorer()
        scorer.load()
    return scorer


class AnalyzeRequest(BaseModel):
    text: str


@router.post("/analyze-text")
def analyze_text(req: AnalyzeRequest):
    if len(req.text.strip()) < 20:
        raise HTTPException(status_code=400, detail="Text too short. Please provide more details about the lead.")

    try:
        extraction = extract_lead_from_text(req.text)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze text: {str(e)}")

    # Score the extracted lead
    s = _get_scorer()
    fields = extraction["extracted_fields"]
    score_result = s.score_lead(fields)

    # Build explanation
    top = score_result["top_factors"]
    factor_strs = []
    for f in top:
        sign = "+" if f["direction"] == "+" else "-"
        factor_strs.append(f"{f['explanation']} ({sign})")
    explanation = ". ".join(factor_strs) + "."

    return {
        "extracted_fields": fields,
        "found_fields": extraction["found_fields"],
        "defaulted_fields": extraction["defaulted_fields"],
        "lead_quality_score": score_result["lead_quality_score"],
        "top_factors": score_result["top_factors"],
        "explanation": explanation,
    }
