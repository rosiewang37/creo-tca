"""Gemini API client for extracting lead fields from freeform text."""

import json
import os
from core.config import GEMINI_API_KEY

SYSTEM_PROMPT = """You are a data extraction assistant for a residential painting company.
Extract lead information from the provided text and return ONLY a JSON object with these exact fields (use null for anything not mentioned):
{
  "property_type": null,
  "neighbourhood": null,
  "estimated_job_size_sqft": null,
  "requested_timeline": null,
  "referral_source": null,
  "homeowner_status": null,
  "distance_to_queens_km": null,
  "customer_age_bracket": null
}

Valid values:
- property_type: Detached | Semi-Detached | Townhouse | Apartment | Heritage Home
- neighbourhood: Downtown | West End | Sydenham Ward | Portsmouth Village | Kingscourt | Calvin Park | Inner Harbour | Williamsville
- requested_timeline: ASAP | 1-2 weeks | 1 month | Flexible
- referral_source: Facebook Ads | Door-to-Door | Lawn Signs | Word of Mouth/Referral | Google Search | Instagram | Kijiji
- homeowner_status: Own | Rent | Recently Purchased
- customer_age_bracket: 18-24 | 25-34 | 35-44 | 45-54 | 55-64 | 65+

Map informal terms: "bungalow"->Detached, "condo"->Apartment, "urgent"/"right away"->"ASAP", "next week"->"1-2 weeks", "no rush"->"Flexible", "my house"/"I own"->"Own", "my landlord"->"Rent".
If someone mentions a friend or neighbor recommended them, set referral_source to "Word of Mouth/Referral".
For distance_to_queens_km, estimate based on the neighbourhood if mentioned (Downtown~1, West End~3, Sydenham~2, Portsmouth~4, etc.)
Return ONLY valid JSON, no markdown, no explanation."""


# Default values for fields the LLM can't extract
DEFAULTS = {
    "property_type": "Detached",
    "neighbourhood": "Downtown",
    "estimated_job_size_sqft": 1500.0,
    "requested_timeline": "Flexible",
    "referral_source": "Facebook Ads",
    "homeowner_status": "Own",
    "distance_to_queens_km": 5.0,
    "customer_age_bracket": "35-44",
}


def extract_lead_from_text(text: str) -> dict:
    """Use Gemini to extract structured lead fields from freeform text.

    Returns: {extracted_fields, found_fields, defaulted_fields}
    """
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not configured")

    import google.generativeai as genai
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-2.5-flash")

    response = model.generate_content(
        [{"role": "user", "parts": [{"text": SYSTEM_PROMPT + "\n\nText to extract from:\n" + text}]}],
    )

    # Parse JSON from response
    raw_text = response.text.strip()
    # Remove markdown code fences if present
    if raw_text.startswith("```"):
        raw_text = raw_text.split("\n", 1)[1]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3].strip()

    extracted = json.loads(raw_text)

    # Track which fields were found vs defaulted
    found_fields = []
    defaulted_fields = []
    final_fields = {}

    for key, default_val in DEFAULTS.items():
        if extracted.get(key) is not None:
            final_fields[key] = extracted[key]
            found_fields.append(key)
        else:
            final_fields[key] = default_val
            defaulted_fields.append(key)

    return {
        "extracted_fields": final_fields,
        "found_fields": found_fields,
        "defaulted_fields": defaulted_fields,
    }
