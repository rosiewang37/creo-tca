"use client";

import { useEffect, useState } from "react";
import { fetchInsights } from "@/lib/api";
import type { Insights, InsightLead, TopFactor, ScatterPoint } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addToQueue } from "@/lib/queue-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  Legend,
} from "recharts";
import { Phone, Mail, UserPlus, Copy, Send, Info } from "lucide-react";

/* ─── Fake contacts for demo ─── */
const FAKE_CONTACTS: Record<string, { phone: string; email: string; name: string }> = {};
function getContact(leadId: string) {
  if (!FAKE_CONTACTS[leadId]) {
    const num = Math.abs(hashCode(leadId));
    FAKE_CONTACTS[leadId] = {
      phone: `(613) ${String(200 + (num % 800)).padStart(3, "0")}-${String(1000 + (num % 9000)).padStart(4, "0")}`,
      email: `lead.${leadId.toLowerCase().replace(/[^a-z0-9]/g, "")}@email.com`,
      name: `Lead ${leadId}`,
    };
  }
  return FAKE_CONTACTS[leadId];
}
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

const TIER_COLORS: Record<string, string> = {
  High: "#16a34a",
  Medium: "#d97706",
  Low: "#dc2626",
};

const TIER_BG: Record<string, string> = {
  High: "bg-green-100 text-green-800",
  Medium: "bg-yellow-100 text-yellow-800",
  Low: "bg-red-100 text-red-800",
};

/* ─── Main Page ─── */

export default function DashboardPage() {
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<InsightLead | null>(null);

  useEffect(() => {
    fetchInsights().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="text-red-500 p-4">Error: {error}</div>;
  if (!data) return <div className="p-4 text-gray-500">Loading dashboard...</div>;

  const { kpis } = data;

  /* Chart data */
  const sourceData = Object.entries(data.avg_score_by_source).map(([name, v]) => ({
    name,
    score: Math.round(v * 100),
  }));
  const homeownerData = Object.entries(data.avg_score_by_homeowner).map(([name, v]) => ({
    name,
    score: Math.round(v * 100),
  }));
  const timelineOrder = ["ASAP", "1-2 weeks", "1 month", "Flexible"];
  const timelineData = timelineOrder
    .filter((t) => data.avg_score_by_timeline[t] !== undefined)
    .map((name) => ({
      name,
      score: Math.round(data.avg_score_by_timeline[name] * 100),
    }));
  const propertyData = Object.entries(data.avg_score_by_property).map(([name, v]) => ({
    name,
    score: Math.round(v * 100),
  }));
  const tierOrder = ["High", "Medium", "Low"];
  const tierData = tierOrder.map((t) => ({
    name: t,
    count: data.priority_tier_counts[t] || 0,
    fill: TIER_COLORS[t],
  }));

  function handleAddToQueue(lead: InsightLead) {
    const added = addToQueue({
      lead_id: lead.lead_id,
      lead_quality_score: lead.lead_quality_score,
      property_type: lead.property_type,
      neighbourhood: lead.neighbourhood,
      homeowner_status: lead.homeowner_status,
      requested_timeline: lead.requested_timeline,
    });
    if (added) window.dispatchEvent(new Event("queue-updated"));
  }

  function handleCopyPhone(leadId: string, phone: string) {
    navigator.clipboard.writeText(phone);
    setCopiedId(leadId + "-phone");
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* ── Row 1: KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard title="Total Leads" value={kpis.total_leads.toLocaleString()} />
        <KPICard
          title="High Priority Leads"
          value={kpis.high_quality_count.toLocaleString()}
          subtitle="Priority Score >= 70%"
          accent
        />
        <KPICard
          title="Avg Priority Score"
          value={`${Math.round(kpis.avg_quality_score * 100)}%`}
        />
        <KPICard
          title="Top Source by Avg Priority"
          value={kpis.best_source_name}
          subtitle={`${Math.round(kpis.best_source_score * 100)}% avg`}
        />
        <KPICard
          title="Urgent High-Priority"
          value={kpis.urgent_high_priority.toLocaleString()}
          subtitle="High priority + ASAP/1-2 wk"
          accent
        />
      </div>

      {/* ── Row 2: Main Action Table ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-gray-900">
            Outreach Queue &mdash; Contact These First
          </CardTitle>
          <p className="text-sm text-gray-500">
            Click any row for full breakdown. Ranked by priority score.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b text-xs">
                  <th className="pb-2 pr-2">#</th>
                  <th className="pb-2 pr-2">Priority Score</th>
                  <th className="pb-2 pr-2">Tier</th>
                  <th className="pb-2 pr-2">Conv. Weight</th>
                  <th className="pb-2 pr-2">Profit Band</th>
                  <th className="pb-2 pr-2">Homeowner</th>
                  <th className="pb-2 pr-2">Timeline</th>
                  <th className="pb-2 pr-2">Property</th>
                  <th className="pb-2 pr-2">Source</th>
                  <th className="pb-2 pr-2">Action</th>
                  <th className="pb-2 pr-2">Why this lead?</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {data.top_leads.map((lead, i) => {
                  const pct = Math.round(lead.lead_quality_score * 100);
                  const cwPct = Math.round(lead.conversion_weight * 100);
                  const contact = getContact(lead.lead_id);
                  return (
                    <tr
                      key={lead.lead_id}
                      className="border-b last:border-0 hover:bg-blue-50/40 cursor-pointer transition-colors"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <td className="py-3 pr-2 text-gray-400 font-medium">{i + 1}</td>
                      <td className="py-3 pr-2">
                        <ScoreBadgeWithPopover pct={pct} factors={lead.top_factors} />
                      </td>
                      <td className="py-3 pr-2">
                        <TierBadge tier={lead.priority_tier} />
                      </td>
                      <td className="py-3 pr-2">
                        <span className="text-xs font-medium text-gray-700">{cwPct}%</span>
                      </td>
                      <td className="py-3 pr-2">
                        <ProfitBadge band={lead.expected_profit_band} />
                      </td>
                      <td className="py-3 pr-2">
                        <span className={lead.homeowner_status === "Own" || lead.homeowner_status === "Recently Purchased" ? "text-green-700 font-medium" : "text-gray-600"}>
                          {lead.homeowner_status}
                        </span>
                      </td>
                      <td className="py-3 pr-2">
                        <span className={lead.requested_timeline === "ASAP" ? "text-orange-600 font-medium" : "text-gray-600"}>
                          {lead.requested_timeline}
                        </span>
                      </td>
                      <td className="py-3 pr-2 text-gray-600">{lead.property_type}</td>
                      <td className="py-3 pr-2 text-gray-500 text-xs">{lead.referral_source}</td>
                      <td className="py-3 pr-2">
                        <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {lead.recommended_action}
                        </span>
                      </td>
                      <td className="py-3 pr-2 max-w-[180px]">
                        <ul className="text-[11px] text-gray-500 space-y-0.5 list-disc list-inside">
                          {lead.why.slice(0, 3).map((r, j) => (
                            <li key={j} className="truncate">{r}</li>
                          ))}
                        </ul>
                      </td>
                      <td className="py-3" onClick={(e) => e.stopPropagation()}>
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

      {/* ── Row 3: Core Scoring Insights (3 charts) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ChartCard title="Avg Priority Score by Referral Source" subtitle="Which channels bring the best leads?">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={sourceData} layout="vertical" margin={{ left: 110 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} unit="%" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="score" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Avg Priority Score by Homeowner Status" subtitle="Owners and recent buyers rank higher">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={homeownerData} margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} unit="%" />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="score" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Avg Priority Score by Timeline" subtitle="Urgency correlates with commitment">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={timelineData} margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} unit="%" />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="score" fill="#d97706" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Row 4: Deeper Segmentation (3 charts) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ChartCard title="Avg Priority Score by Property Type" subtitle="Detached and heritage homes score highest">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={propertyData} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} unit="%" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="score" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Priority Tier Count" subtitle="Distribution of actionable leads">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={tierData} margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {tierData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distance vs Job Size" subtitle="Spot high-value nearby leads">
          <DistanceScatter data={data.scatter_data} />
        </ChartCard>
      </div>

      {/* ── Side Drawer: Lead Breakdown ── */}
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

function LeadDrawer({
  lead,
  onAddToQueue,
}: {
  lead: InsightLead;
  onAddToQueue: (l: InsightLead) => void;
}) {
  const pct = Math.round(lead.lead_quality_score * 100);
  const cwPct = Math.round(lead.conversion_weight * 100);

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
          <ScoreCard label="Priority Score" value={`${pct}%`} tier={lead.priority_tier} />
          <ScoreCard label="Conversion Weight" value={`${cwPct}%`} />
          <ScoreCard label="Profit Band" value={lead.expected_profit_band || "Unknown"} />
          <ScoreCard label="Priority Tier" value={lead.priority_tier} tier={lead.priority_tier} />
        </div>

        {/* Recommended action */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-700 mb-0.5">Recommended Action</p>
          <p className="text-sm font-medium text-blue-900">{lead.recommended_action}</p>
        </div>

        {/* Top factors with bars */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Score Breakdown</h3>
          <p className="text-xs text-gray-400 mb-3">
            Conversion Weight = homeowner status x timeline urgency.
            Priority Score = ML model output combining all features.
          </p>
          <div className="space-y-2.5">
            {lead.top_factors.map((f, i) => {
              const maxImpact = Math.max(...lead.top_factors.map((x) => x.impact), 0.1);
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
            <DetailItem label="Property" value={lead.property_type} />
            <DetailItem label="Area" value={lead.neighbourhood} />
            <DetailItem label="Homeowner" value={lead.homeowner_status} />
            <DetailItem label="Timeline" value={lead.requested_timeline} />
            <DetailItem label="Source" value={lead.referral_source} />
            <DetailItem label="Job Size" value={`${lead.estimated_job_size_sqft?.toLocaleString()} sqft`} />
            <DetailItem label="Distance" value={`${lead.distance_to_queens_km} km`} />
            <DetailItem label="Age" value={lead.customer_age_bracket || "N/A"} />
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

function ScoreCard({
  label,
  value,
  tier,
}: {
  label: string;
  value: string;
  tier?: string;
}) {
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

/* Score badge with hover popover showing factor breakdown */
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

function KPICard({ title, value, subtitle, accent }: {
  title: string;
  value: string;
  subtitle?: string;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-blue-200 bg-blue-50/30" : ""}>
      <CardContent className="pt-5 pb-4">
        <p className="text-xs text-gray-500">{title}</p>
        <p className={`text-xl font-bold mt-0.5 ${accent ? "text-blue-700" : "text-gray-900"}`}>
          {value}
        </p>
        {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, subtitle, children }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/* Distance vs Job Size scatter plot */
function DistanceScatter({ data }: { data: ScatterPoint[] }) {
  const high = data.filter((d) => d.tier === "High");
  const medium = data.filter((d) => d.tier === "Medium");
  const low = data.filter((d) => d.tier === "Low");

  return (
    <ResponsiveContainer width="100%" height={250}>
      <ScatterChart margin={{ left: 10, right: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" dataKey="distance" name="Distance (km)" unit=" km" tick={{ fontSize: 11 }} />
        <YAxis type="number" dataKey="sqft" name="Job Size (sqft)" tick={{ fontSize: 11 }} />
        <ZAxis range={[30, 30]} />
        <Tooltip
          formatter={(value, name) => {
            if (name === "Distance (km)") return [`${value} km`, "Distance"];
            if (name === "Job Size (sqft)") return [`${value} sqft`, "Job Size"];
            return [value, name];
          }}
        />
        <Legend />
        <Scatter name="High" data={high} fill={TIER_COLORS.High} />
        <Scatter name="Medium" data={medium} fill={TIER_COLORS.Medium} />
        <Scatter name="Low" data={low} fill={TIER_COLORS.Low} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

/* Call dialog */
function CallDialog({
  lead,
  contact,
  copiedId,
  onCopy,
}: {
  lead: InsightLead;
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

/* Email dialog */
function EmailDialog({
  lead,
  contact,
}: {
  lead: InsightLead;
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
