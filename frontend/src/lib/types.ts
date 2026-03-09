export interface Lead {
  lead_id: string;
  lead_date: string;
  property_type: string;
  neighbourhood: string;
  estimated_job_size_sqft: number;
  requested_timeline: string;
  referral_source: string;
  homeowner_status: string;
  distance_to_queens_km: number;
  customer_age_bracket: string;
  expected_profit_band: string | null;
  lead_quality_score: number;
  top_factors: TopFactor[];
  priority_rank: number;
}

export interface TopFactor {
  feature: string;
  value: string;
  impact: number;
  direction: "+" | "-";
  explanation: string;
}

export interface LeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  limit: number;
}

export interface Insights {
  kpis: {
    total_leads: number;
    high_quality_count: number;
    avg_quality_score: number;
    urgent_high_priority: number;
    best_source_name: string;
    best_source_score: number;
  };
  top_leads: InsightLead[];
  avg_score_by_source: Record<string, number>;
  avg_score_by_homeowner: Record<string, number>;
  avg_score_by_timeline: Record<string, number>;
  avg_score_by_property: Record<string, number>;
  priority_tier_counts: Record<string, number>;
  scatter_data: ScatterPoint[];
  profit_band_dist: Record<string, number>;
  filter_options: {
    neighbourhoods: string[];
    referral_sources: string[];
  };
}

export interface InsightLead {
  lead_id: string;
  property_type: string;
  neighbourhood: string;
  lead_quality_score: number;
  homeowner_status: string;
  requested_timeline: string;
  referral_source: string;
  expected_profit_band: string | null;
  priority_rank: number;
  top_factors: TopFactor[];
  conversion_weight: number;
  priority_tier: "High" | "Medium" | "Low";
  recommended_action: string;
  why: string[];
  estimated_job_size_sqft: number;
  distance_to_queens_km: number;
  customer_age_bracket: string;
}

export interface ScatterPoint {
  distance: number;
  sqft: number;
  tier: "High" | "Medium" | "Low";
  score: number;
}

export interface AnalyzeResult {
  extracted_fields: Record<string, string | number | null>;
  found_fields: string[];
  defaulted_fields: string[];
  lead_quality_score: number;
  top_factors: TopFactor[];
  explanation: string;
}

export interface QueueItem {
  lead_id: string;
  lead_quality_score: number;
  property_type?: string;
  neighbourhood?: string;
  homeowner_status?: string;
  requested_timeline?: string;
  date_added: string;
  status: "To Contact" | "In Progress" | "Done";
  notes: string;
}
