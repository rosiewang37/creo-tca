"""Data pipeline: fetch from Supabase, clean, and export."""

import sys
import os
import pandas as pd
import httpx

# Allow running as `python -m ml.pipeline` from backend/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from core.config import SUPABASE_BASE_URL, SUPABASE_ENDPOINT, SUPABASE_KEY, PAGE_SIZE

# ── Canonical mappings ──────────────────────────────────────────────────────

NEIGHBOURHOOD_MAP = {
    "sydenhamm ward": "Sydenham Ward",
    "sydenhamm": "Sydenham Ward",
    "down town": "Downtown",
    "westend": "West End",
    "west end": "West End",
    "portsmoth village": "Portsmouth Village",
    "portsmouth village": "Portsmouth Village",
    "kingscourt": "Kingscourt",
    "calvin park": "Calvin Park",
    "inner harbour": "Inner Harbour",
    "williamsville": "Williamsville",
    "downtown": "Downtown",
    "sydenham ward": "Sydenham Ward",
    "strathcona prk": "Strathcona Park",
    "strathcona park": "Strathcona Park",
}

REFERRAL_MAP = {
    "facebook": "Facebook Ads",
    "facebook ads": "Facebook Ads",
    "door 2 door": "Door-to-Door",
    "door-to-door": "Door-to-Door",
    "lawnsign": "Lawn Signs",
    "lawn signs": "Lawn Signs",
    "lawn sign": "Lawn Signs",
    "word of mouth/referral": "Word of Mouth/Referral",
    "word of mouth": "Word of Mouth/Referral",
    "word-of-mouth": "Word of Mouth/Referral",
    "google search": "Google Search",
    "instagram": "Instagram",
    "kijiji": "Kijiji",
}


def fetch_all_leads() -> pd.DataFrame:
    """Fetch all 2500 rows from Supabase using Range header pagination."""
    url = f"{SUPABASE_BASE_URL}{SUPABASE_ENDPOINT}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Prefer": "count=exact",
    }

    all_rows: list[dict] = []
    for page in range(20):  # up to 20 pages × 250 = 5000 max
        start = page * PAGE_SIZE
        end = start + PAGE_SIZE - 1
        headers["Range"] = f"{start}-{end}"
        resp = httpx.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        rows = resp.json()
        if not rows:
            break
        all_rows.extend(rows)
        print(f"  Fetched rows {start}-{start + len(rows) - 1} ({len(rows)} rows)")

    df = pd.DataFrame(all_rows)
    print(f"Total rows fetched: {len(df)}")
    return df


def clean(df: pd.DataFrame) -> pd.DataFrame:
    """Clean and normalize the raw leads DataFrame."""
    df = df.copy()

    # Strip whitespace from string columns
    str_cols = df.select_dtypes(include="object").columns
    for col in str_cols:
        df[col] = df[col].astype(str).str.strip()
        df[col] = df[col].replace({"nan": None, "None": None, "": None})

    # Normalize dates
    df["lead_date"] = pd.to_datetime(df["lead_date"], format="mixed", dayfirst=False)

    # Normalize neighbourhood
    df["neighbourhood"] = df["neighbourhood"].apply(
        lambda x: NEIGHBOURHOOD_MAP.get(x.lower(), x) if pd.notna(x) and x else x
    )

    # Normalize referral source
    df["referral_source"] = df["referral_source"].apply(
        lambda x: REFERRAL_MAP.get(x.lower(), x) if pd.notna(x) and x else x
    )

    # Fix estimated_job_size_sqft: replace 0 with NaN, impute median by property_type
    df["estimated_job_size_sqft"] = pd.to_numeric(df["estimated_job_size_sqft"], errors="coerce")
    df.loc[df["estimated_job_size_sqft"] == 0, "estimated_job_size_sqft"] = None
    medians_by_type = df.groupby("property_type")["estimated_job_size_sqft"].transform("median")
    df["estimated_job_size_sqft"] = df["estimated_job_size_sqft"].fillna(medians_by_type)
    # If still NaN (property_type group had no values), use overall median
    df["estimated_job_size_sqft"] = df["estimated_job_size_sqft"].fillna(
        df["estimated_job_size_sqft"].median()
    )

    # Impute distance_to_queens_km
    df["distance_to_queens_km"] = pd.to_numeric(df["distance_to_queens_km"], errors="coerce")
    df["distance_to_queens_km"] = df["distance_to_queens_km"].fillna(
        df["distance_to_queens_km"].median()
    )

    # Impute customer_age_bracket with mode
    df["customer_age_bracket"] = df["customer_age_bracket"].fillna(
        df["customer_age_bracket"].mode()[0]
    )

    # Drop non-predictive columns
    drop_cols = ["preferred_contact", "lead_capture_weather", "has_pets", "lead_weekday"]
    df = df.drop(columns=[c for c in drop_cols if c in df.columns])

    return df


DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def run_pipeline() -> pd.DataFrame:
    """Execute the full pipeline: fetch → clean → save."""
    os.makedirs(DATA_DIR, exist_ok=True)

    raw_path = os.path.join(DATA_DIR, "leads_raw.csv")

    # Check if we already have a cached raw file
    if os.path.exists(raw_path):
        print(f"Loading cached raw data from {raw_path}")
        df = pd.read_csv(raw_path)
    else:
        print("Fetching data from Supabase...")
        df = fetch_all_leads()
        df.to_csv(raw_path, index=False)
        print(f"Saved raw data to {raw_path}")

    print("Cleaning data...")
    df_clean = clean(df)
    clean_path = os.path.join(DATA_DIR, "leads_clean.csv")
    df_clean.to_csv(clean_path, index=False)
    print(f"Saved cleaned data to {clean_path} ({len(df_clean)} rows)")

    return df_clean


if __name__ == "__main__":
    run_pipeline()
