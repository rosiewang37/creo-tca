"""FastAPI application — CREO Lead Prioritization Tool."""

import os
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import leads, predict, analyze, insights

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

app = FastAPI(title="CREO Lead Prioritization API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory dataframe loaded at startup
leads_df: pd.DataFrame = pd.DataFrame()


@app.on_event("startup")
def load_data():
    global leads_df
    scored_path = os.path.join(DATA_DIR, "leads_scored.csv")
    if not os.path.exists(scored_path):
        raise RuntimeError(f"Scored data not found at {scored_path}. Run `py -m ml.model` first.")
    leads_df = pd.read_csv(scored_path)
    # Ensure lead_quality_score is float
    leads_df["lead_quality_score"] = leads_df["lead_quality_score"].astype(float)
    print(f"Loaded {len(leads_df)} scored leads into memory")


def get_leads_df() -> pd.DataFrame:
    return leads_df


app.include_router(leads.router, prefix="/api/v1")
app.include_router(predict.router, prefix="/api/v1")
app.include_router(analyze.router, prefix="/api/v1")
app.include_router(insights.router, prefix="/api/v1")


@app.get("/")
def root():
    return {"status": "ok", "leads_loaded": len(leads_df)}
