"""Exploratory Data Analysis — generate chart PNGs from cleaned data."""

import sys
import os
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

CHARTS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "charts")


def generate_charts(df: pd.DataFrame) -> None:
    """Generate all EDA charts and save as PNG."""
    os.makedirs(CHARTS_DIR, exist_ok=True)
    sns.set_theme(style="whitegrid")

    # 1. Profit band distribution
    fig, ax = plt.subplots(figsize=(8, 5))
    band = df["expected_profit_band"].fillna("Unknown").value_counts()
    band.plot(kind="bar", ax=ax, color=["#2563eb", "#60a5fa", "#93c5fd", "#d1d5db"])
    ax.set_title("Profit Band Distribution")
    ax.set_ylabel("Count")
    ax.set_xlabel("Profit Band")
    plt.xticks(rotation=0)
    plt.tight_layout()
    fig.savefig(os.path.join(CHARTS_DIR, "eda_profit_band_dist.png"), dpi=150)
    plt.close(fig)
    print("  [OK] eda_profit_band_dist.png")

    # 2. Referral source × profit band
    labeled = df[df["expected_profit_band"].notna()].copy()
    fig, ax = plt.subplots(figsize=(10, 6))
    ct = pd.crosstab(labeled["referral_source"], labeled["expected_profit_band"], normalize="index")
    ct.plot(kind="barh", stacked=True, ax=ax, color=["#ef4444", "#f59e0b", "#22c55e"])
    ax.set_title("Referral Source × Profit Band %")
    ax.set_xlabel("Proportion")
    ax.legend(title="Profit Band")
    plt.tight_layout()
    fig.savefig(os.path.join(CHARTS_DIR, "eda_referral_vs_band.png"), dpi=150)
    plt.close(fig)
    print("  [OK] eda_referral_vs_band.png")

    # 3. Sqft by property type (box plot)
    fig, ax = plt.subplots(figsize=(10, 6))
    order = df.groupby("property_type")["estimated_job_size_sqft"].median().sort_values(ascending=False).index
    sns.boxplot(data=df, x="property_type", y="estimated_job_size_sqft", order=order, ax=ax, palette="Blues_d")
    ax.set_title("Job Size (sqft) by Property Type")
    ax.set_xlabel("Property Type")
    ax.set_ylabel("Estimated Job Size (sqft)")
    plt.xticks(rotation=15)
    plt.tight_layout()
    fig.savefig(os.path.join(CHARTS_DIR, "eda_sqft_by_property.png"), dpi=150)
    plt.close(fig)
    print("  [OK] eda_sqft_by_property.png")

    # 4. Timeline × profit band
    fig, ax = plt.subplots(figsize=(8, 5))
    ct2 = pd.crosstab(labeled["requested_timeline"], labeled["expected_profit_band"], normalize="index")
    timeline_order = ["ASAP", "1-2 weeks", "1 month", "Flexible"]
    ct2 = ct2.reindex([t for t in timeline_order if t in ct2.index])
    ct2.plot(kind="bar", stacked=True, ax=ax, color=["#ef4444", "#f59e0b", "#22c55e"])
    ax.set_title("Timeline × Profit Band %")
    ax.set_ylabel("Proportion")
    ax.legend(title="Profit Band")
    plt.xticks(rotation=0)
    plt.tight_layout()
    fig.savefig(os.path.join(CHARTS_DIR, "eda_timeline_vs_band.png"), dpi=150)
    plt.close(fig)
    print("  [OK] eda_timeline_vs_band.png")

    # 5. Avg sqft by neighbourhood
    fig, ax = plt.subplots(figsize=(10, 6))
    avg_sqft = df.groupby("neighbourhood")["estimated_job_size_sqft"].mean().sort_values(ascending=True)
    avg_sqft.plot(kind="barh", ax=ax, color="#2563eb")
    ax.set_title("Average Job Size by Neighbourhood")
    ax.set_xlabel("Avg Sqft")
    plt.tight_layout()
    fig.savefig(os.path.join(CHARTS_DIR, "eda_neighbourhood_avg_sqft.png"), dpi=150)
    plt.close(fig)
    print("  [OK] eda_neighbourhood_avg_sqft.png")

    # 6. Homeowner status × profit band
    fig, ax = plt.subplots(figsize=(8, 5))
    ct3 = pd.crosstab(labeled["homeowner_status"], labeled["expected_profit_band"], normalize="index")
    ct3.plot(kind="bar", stacked=True, ax=ax, color=["#ef4444", "#f59e0b", "#22c55e"])
    ax.set_title("Homeowner Status × Profit Band %")
    ax.set_ylabel("Proportion")
    ax.legend(title="Profit Band")
    plt.xticks(rotation=0)
    plt.tight_layout()
    fig.savefig(os.path.join(CHARTS_DIR, "eda_homeowner_vs_band.png"), dpi=150)
    plt.close(fig)
    print("  [OK] eda_homeowner_vs_band.png")

    print(f"\nAll EDA charts saved to {CHARTS_DIR}")


if __name__ == "__main__":
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    clean_path = os.path.join(data_dir, "leads_clean.csv")
    if not os.path.exists(clean_path):
        print("No cleaned data found. Running pipeline first...")
        from ml.pipeline import run_pipeline
        df = run_pipeline()
    else:
        df = pd.read_csv(clean_path)
    generate_charts(df)
