import type { LeadsResponse, Insights, AnalyzeResult, Lead } from "./types";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchLeads(params: Record<string, string | number>): Promise<LeadsResponse> {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== "" && v !== undefined && v !== null) query.set(k, String(v));
  }
  const res = await fetch(`${API}/api/v1/leads?${query}`);
  if (!res.ok) throw new Error("Failed to fetch leads");
  return res.json();
}

export async function fetchLead(leadId: string): Promise<Lead> {
  const res = await fetch(`${API}/api/v1/leads/${leadId}`);
  if (!res.ok) throw new Error("Lead not found");
  return res.json();
}

export async function fetchInsights(): Promise<Insights> {
  const res = await fetch(`${API}/api/v1/insights`);
  if (!res.ok) throw new Error("Failed to fetch insights");
  return res.json();
}

export async function analyzeText(text: string): Promise<AnalyzeResult> {
  const res = await fetch(`${API}/api/v1/analyze-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Analysis failed" }));
    throw new Error(err.detail || "Analysis failed");
  }
  return res.json();
}

export async function predictLead(fields: Record<string, unknown>) {
  const res = await fetch(`${API}/api/v1/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error("Prediction failed");
  return res.json();
}
