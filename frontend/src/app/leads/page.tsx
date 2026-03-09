"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchLeads, fetchInsights } from "@/lib/api";
import type { Lead, Insights, TopFactor } from "@/lib/types";
import { addToQueue } from "@/lib/queue-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Phone, Mail, UserPlus, Copy, Send, Info } from "lucide-react";

/* ─── Conversion-weight helpers (mirrors backend logic) ─── */
const HOMEOWNER_QUALITY: Record<string, number> = { Own: 1.0, "Recently Purchased": 0.8, Rent: 0.15 };
const TIMELINE_QUALITY: Record<string, number> = { ASAP: 1.0, "1-2 weeks": 0.75, "1 month": 0.45, Flexible: 0.2 };

function conversionWeight(homeowner: string, timeline: string): number {
  const h = HOMEOWNER_QUALITY[homeowner] ?? 0.5;
  const t = TIMELINE_QUALITY[timeline] ?? 0.3;
  return h * 0.545 + t * 0.455;
}

function priorityTier(score: number): "High" | "Medium" | "Low" {
  if (score >= 0.7) return "High";
  if (score >= 0.45) return "Medium";
  return "Low";
}

function recommendedAction(score: number, timeline: string): string {
  const urgent = timeline === "ASAP" || timeline === "1-2 weeks";
  if (score >= 0.7 && urgent) return "Call today";
  if (score >= 0.7) return "Call this week";
  if (score >= 0.45 && urgent) return "Call soon";
  if (score >= 0.45) return "Send email";
  return "Add to nurture list";
}

/* ─── Fake contacts for demo ─── */
const FAKE_CONTACTS: Record<string, { phone: string; email: string; name: string }> = {};
function getContact(leadId: string) {
  if (!FAKE_CONTACTS[leadId]) {
    let h = 0;
    for (let i = 0; i < leadId.length; i++) h = (Math.imul(31, h) + leadId.charCodeAt(i)) | 0;
    const num = Math.abs(h);
    FAKE_CONTACTS[leadId] = {
      phone: `(613) ${String(200 + (num % 800)).padStart(3, "0")}-${String(1000 + (num % 9000)).padStart(4, "0")}`,
      email: `lead.${leadId.toLowerCase().replace(/[^a-z0-9]/g, "")}@email.com`,
      name: `Lead ${leadId}`,
    };
  }
  return FAKE_CONTACTS[leadId];
}

const TIER_BG: Record<string, string> = {
  High: "bg-green-100 text-green-800",
  Medium: "bg-yellow-100 text-yellow-800",
  Low: "bg-red-100 text-red-800",
};

/* ─── Main Page ─── */
export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("lead_quality_score");
  const [order, setOrder] = useState("desc");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filterOptions, setFilterOptions] = useState<Insights["filter_options"] | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const limit = 50;

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchLeads({ page, limit, sort, order, ...filters });
      setLeads(res.leads);
      setTotal(res.total);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [page, sort, order, filters]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    fetchInsights().then((d) => setFilterOptions(d.filter_options));
  }, []);

  function handleSort(col: string) {
    if (sort === col) {
      setOrder(order === "desc" ? "asc" : "desc");
    } else {
      setSort(col);
      setOrder("desc");
    }
    setPage(1);
  }

  function handleFilter(key: string, value: string) {
    const next = { ...filters };
    if (value === "all") {
      delete next[key];
    } else {
      next[key] = value;
    }
    setFilters(next);
    setPage(1);
  }

  function handleAddToQueue(lead: Lead) {
    const added = addToQueue(lead);
    if (added) window.dispatchEvent(new Event("queue-updated"));
  }

  function handleCopyPhone(leadId: string, phone: string) {
    navigator.clipboard.writeText(phone);
    setCopiedId(leadId + "-phone");
    setTimeout(() => setCopiedId(null), 2000);
  }

  const totalPages = Math.ceil(total / limit);

  const columns = [
    { key: "priority_rank", label: "#" },
    { key: "lead_quality_score", label: "Priority Score" },
    { key: "", label: "Tier" },
    { key: "", label: "Conv. Weight" },
    { key: "expected_profit_band", label: "Profit Band" },
    { key: "homeowner_status", label: "Homeowner" },
    { key: "requested_timeline", label: "Timeline" },
    { key: "property_type", label: "Property" },
    { key: "neighbourhood", label: "Neighbourhood" },
    { key: "referral_source", label: "Source" },
    { key: "", label: "Action" },
    { key: "", label: "Why this lead?" },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Lead Priority Table</h1>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <FilterSelect
          label="Neighbourhood"
          value={filters.neighbourhood || "all"}
          options={filterOptions?.neighbourhoods || []}
          onChange={(v) => handleFilter("neighbourhood", v)}
        />
        <FilterSelect
          label="Referral Source"
          value={filters.source || "all"}
          options={filterOptions?.referral_sources || []}
          onChange={(v) => handleFilter("source", v)}
        />
        <FilterSelect
          label="Homeowner"
          value={filters.homeowner_status || "all"}
          options={["Own", "Recently Purchased", "Rent"]}
          onChange={(v) => handleFilter("homeowner_status", v)}
        />
        <FilterSelect
          label="Profit Band"
          value={filters.profit_band || "all"}
          options={["Low", "Medium", "High"]}
          onChange={(v) => handleFilter("profit_band", v)}
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-gray-500 text-xs">
                  {columns.map(({ key, label }, idx) => (
                    <th
                      key={idx}
                      className={`px-3 py-3 select-none ${key ? "cursor-pointer hover:text-gray-900" : ""}`}
                      onClick={key ? () => handleSort(key) : undefined}
                    >
                      {label}
                      {key && sort === key && (order === "desc" ? " \u2193" : " \u2191")}
                    </th>
                  ))}
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={13} className="text-center py-8 text-gray-400">Loading...</td></tr>
                ) : leads.length === 0 ? (
                  <tr><td colSpan={13} className="text-center py-8 text-gray-400">No leads match your filters</td></tr>
                ) : leads.map((lead) => {
                  const pct = Math.round(lead.lead_quality_score * 100);
                  const tier = priorityTier(lead.lead_quality_score);
                  const cw = Math.round(conversionWeight(lead.homeowner_status, lead.requested_timeline) * 100);
                  const action = recommendedAction(lead.lead_quality_score, lead.requested_timeline);
                  const why = (lead.top_factors || []).filter((f) => f.direction === "+").map((f) => f.explanation);
                  const contact = getContact(lead.lead_id);

                  return (
                    <tr
                      key={lead.lead_id}
                      className="border-b last:border-0 hover:bg-blue-50/40 cursor-pointer transition-colors"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <td className="px-3 py-3 text-gray-400 font-medium">{lead.priority_rank}</td>
                      <td className="px-3 py-3">
                        <ScoreBadgeWithPopover pct={pct} factors={lead.top_factors} />
                      </td>
                      <td className="px-3 py-3">
                        <TierBadge tier={tier} />
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs font-medium text-gray-700">{cw}%</span>
                      </td>
                      <td className="px-3 py-3">
                        <ProfitBadge band={lead.expected_profit_band} />
                      </td>
                      <td className="px-3 py-3">
                        <span className={lead.homeowner_status === "Own" || lead.homeowner_status === "Recently Purchased" ? "text-green-700 font-medium" : "text-gray-600"}>
                          {lead.homeowner_status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={lead.requested_timeline === "ASAP" ? "text-orange-600 font-medium" : "text-gray-600"}>
                          {lead.requested_timeline}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-600">{lead.property_type}</td>
                      <td className="px-3 py-3 text-gray-600">{lead.neighbourhood}</td>
                      <td className="px-3 py-3 text-gray-500 text-xs">{lead.referral_source}</td>
                      <td className="px-3 py-3">
                        <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {action}
                        </span>
                      </td>
                      <td className="px-3 py-3 max-w-[170px]">
                        <ul className="text-[11px] text-gray-500 space-y-0.5 list-disc list-inside">
                          {why.slice(0, 3).map((r, j) => (
                            <li key={j} className="truncate">{r}</li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <CallDialog
                            lead={lead}
                            contact={contact}
                            copiedId={copiedId}
                            onCopy={handleCopyPhone}
                          />
                          <EmailDialog lead={lead} contact={contact} />
                          <Button
                            size="icon-xs"
                            variant="outline"
                            title="Add to Queue"
                            onClick={() => handleAddToQueue(lead)}
                          >
                            <UserPlus className="size-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Showing {(page - 1) * limit + 1}--{Math.min(page * limit, total)} of {total}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="flex items-center px-2">Page {page} of {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      </div>

      {/* Detail Drawer — matches dashboard style */}
      <Sheet open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <SheetContent className="!w-[480px] !max-w-[480px] overflow-y-auto">
          {selectedLead && <LeadDrawer lead={selectedLead} onAddToQueue={handleAddToQueue} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Sub-components                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

function LeadDrawer({ lead, onAddToQueue }: { lead: Lead; onAddToQueue: (l: Lead) => void }) {
  const pct = Math.round(lead.lead_quality_score * 100);
  const cw = Math.round(conversionWeight(lead.homeowner_status, lead.requested_timeline) * 100);
  const tier = priorityTier(lead.lead_quality_score);
  const action = recommendedAction(lead.lead_quality_score, lead.requested_timeline);

  const FACTOR_LABELS: Record<string, string> = {
    homeowner_status: "Homeowner",
    requested_timeline: "Timeline",
    referral_source: "Source",
    property_type: "Property",
    estimated_job_size_sqft: "Job Size",
    neighbourhood: "Area",
    distance_to_queens_km: "Distance",
    customer_age_bracket: "Age",
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle className="text-lg">Lead Breakdown</SheetTitle>
      </SheetHeader>

      <div className="mt-4 space-y-5 px-4">
        {/* Score summary */}
        <div className="grid grid-cols-2 gap-3">
          <ScoreCard label="Priority Score" value={`${pct}%`} tier={tier} />
          <ScoreCard label="Conversion Weight" value={`${cw}%`} />
          <ScoreCard label="Profit Band" value={lead.expected_profit_band || "Unknown"} />
          <ScoreCard label="Priority Tier" value={tier} tier={tier} />
        </div>

        {/* Recommended action */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-700 mb-0.5">Recommended Action</p>
          <p className="text-sm font-medium text-blue-900">{action}</p>
        </div>

        {/* Top factors with bars */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Score Breakdown</h3>
          <p className="text-xs text-gray-400 mb-3">
            Conversion Weight = homeowner status x timeline urgency. Priority
            Score = ML model output combining all features.
          </p>
          <div className="space-y-2.5">
            {(lead.top_factors || []).map((f, i) => {
              const maxImpact = Math.max(...(lead.top_factors || []).map((x) => x.impact), 0.1);
              const barWidth = Math.max((f.impact / maxImpact) * 100, 8);
              const isPositive = f.direction === "+";
              return (
                <div key={i}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="text-gray-600 font-medium">
                      {FACTOR_LABELS[f.feature] || f.feature}
                    </span>
                    <span className={`font-semibold ${isPositive ? "text-green-700" : "text-red-600"}`}>
                      {isPositive ? "+" : "-"} {f.value}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${isPositive ? "bg-green-400" : "bg-red-400"}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">{f.explanation}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lead details */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Lead Details</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <DetailItem label="Lead ID" value={lead.lead_id} />
            <DetailItem label="Date" value={lead.lead_date} />
            <DetailItem label="Property" value={lead.property_type} />
            <DetailItem label="Neighbourhood" value={lead.neighbourhood} />
            <DetailItem label="Homeowner" value={lead.homeowner_status} />
            <DetailItem label="Timeline" value={lead.requested_timeline} />
            <DetailItem label="Source" value={lead.referral_source} />
            <DetailItem label="Job Size" value={`${lead.estimated_job_size_sqft?.toLocaleString()} sqft`} />
            <DetailItem label="Distance" value={`${lead.distance_to_queens_km} km`} />
            <DetailItem label="Age" value={lead.customer_age_bracket} />
            <DetailItem label="Rank" value={`#${lead.priority_rank}`} />
          </div>
        </div>

        <Button className="w-full" onClick={() => onAddToQueue(lead)}>
          Add to Queue
        </Button>
      </div>
    </>
  );
}

function ScoreCard({ label, value, tier }: { label: string; value: string; tier?: string }) {
  const bg = tier
    ? tier === "High" ? "bg-green-50 border-green-200"
      : tier === "Medium" ? "bg-yellow-50 border-yellow-200"
      : "bg-red-50 border-red-200"
    : "bg-gray-50 border-gray-200";
  return (
    <div className={`rounded-lg border p-3 ${bg}`}>
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-500 text-xs">{label}</span>
      <p className="font-medium text-gray-800">{value}</p>
    </div>
  );
}

function ScoreBadgeWithPopover({ pct, factors }: { pct: number; factors?: TopFactor[] }) {
  const color =
    pct >= 70 ? "bg-green-100 text-green-800" :
    pct >= 45 ? "bg-yellow-100 text-yellow-800" :
    "bg-red-100 text-red-800";

  const FACTOR_LABELS: Record<string, string> = {
    homeowner_status: "Homeowner",
    requested_timeline: "Timeline",
    referral_source: "Source",
    property_type: "Property",
    estimated_job_size_sqft: "Job Size",
  };

  const maxImpact = factors?.length
    ? Math.max(...factors.map((f) => f.impact), 0.1)
    : 0.1;

  return (
    <span className="relative group/match inline-flex">
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-default ${color}`}>
        {pct}%
        {factors && factors.length > 0 && (
          <Info className="size-3 opacity-40 group-hover/match:opacity-100 transition-opacity" />
        )}
      </span>
      {factors && factors.length > 0 && (
        <div className="absolute left-0 top-full mt-2 z-50 hidden group-hover/match:block">
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-60">
            <p className="text-[11px] font-semibold text-gray-700 mb-2">Score Breakdown</p>
            <div className="space-y-1.5">
              {factors.map((f, i) => {
                const barW = Math.max((f.impact / maxImpact) * 100, 8);
                const pos = f.direction === "+";
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-[11px] mb-0.5">
                      <span className="text-gray-600">{FACTOR_LABELS[f.feature] || f.feature}</span>
                      <span className={`font-semibold ${pos ? "text-green-700" : "text-red-600"}`}>
                        {pos ? "+" : "-"} {f.value}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1">
                      <div
                        className={`h-1 rounded-full ${pos ? "bg-green-400" : "bg-red-400"}`}
                        style={{ width: `${barW}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </span>
  );
}

function TierBadge({ tier }: { tier: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${TIER_BG[tier] || "bg-gray-100 text-gray-600"}`}>
      {tier}
    </span>
  );
}

function ProfitBadge({ band }: { band: string | null }) {
  if (!band) return <span className="text-gray-400 text-xs">Unknown</span>;
  const colors: Record<string, string> = {
    High: "bg-green-100 text-green-700",
    Medium: "bg-yellow-100 text-yellow-700",
    Low: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${colors[band] || "bg-gray-100 text-gray-600"}`}>
      {band}
    </span>
  );
}

function FilterSelect({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-44 rounded-md border border-input bg-white px-3 text-sm"
    >
      <option value="all">All {label}s</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}

/* ─── Call Dialog ─── */
function CallDialog({
  lead,
  contact,
  copiedId,
  onCopy,
}: {
  lead: Lead;
  contact: { phone: string; name: string };
  copiedId: string | null;
  onCopy: (id: string, phone: string) => void;
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="icon-xs" variant="outline" title="Call" />}>
        <Phone className="size-3" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Call Lead</DialogTitle>
          <DialogDescription>
            {contact.name} &mdash; {lead.property_type}, {lead.neighbourhood}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <Phone className="size-5 text-blue-600" />
            <span className="text-lg font-mono font-semibold">{contact.phone}</span>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1 gap-2" onClick={() => onCopy(lead.lead_id, contact.phone)}>
              <Copy className="size-3.5" />
              {copiedId === lead.lead_id + "-phone" ? "Copied!" : "Copy Phone"}
            </Button>
            <Button variant="outline" className="flex-1 gap-2">
              <Phone className="size-3.5" />
              Call
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Email Dialog ─── */
function EmailDialog({
  lead,
  contact,
}: {
  lead: Lead;
  contact: { email: string; name: string };
}) {
  const [subject, setSubject] = useState(
    `Painting Estimate - ${lead.property_type} in ${lead.neighbourhood}`
  );
  const [body, setBody] = useState(
    `Hi,\n\nThank you for your interest in CREO Solutions. We'd love to provide a quote for your ${lead.property_type?.toLowerCase()} in ${lead.neighbourhood}.\n\nWould you be available for a quick call this week to discuss the project?\n\nBest regards,\nCREO Solutions Team`
  );
  const [sent, setSent] = useState(false);

  function handleSend() {
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button size="icon-xs" variant="outline" title="Email" />}>
        <Mail className="size-3" />
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Compose Email</DialogTitle>
          <DialogDescription>Draft an email to {contact.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">To</label>
            <Input value={contact.email} readOnly className="bg-gray-50 text-gray-600" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Subject</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Message</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[140px] resize-y"
            />
          </div>
          <Button className="w-full gap-2" onClick={handleSend} disabled={sent}>
            <Send className="size-3.5" />
            {sent ? "Sent!" : "Send Email"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
