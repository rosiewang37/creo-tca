import type { QueueItem, Lead } from "./types";

const QUEUE_KEY = "creo_priority_queue";

export function getQueue(): QueueItem[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveQueue(queue: QueueItem[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function addToQueue(lead: Partial<Lead> & { lead_id: string; lead_quality_score: number }): boolean {
  const queue = getQueue();
  if (queue.some((q) => q.lead_id === lead.lead_id)) return false;

  queue.push({
    lead_id: lead.lead_id,
    lead_quality_score: lead.lead_quality_score,
    property_type: lead.property_type,
    neighbourhood: lead.neighbourhood,
    homeowner_status: lead.homeowner_status,
    requested_timeline: lead.requested_timeline,
    date_added: new Date().toISOString(),
    status: "To Contact",
    notes: "",
  });

  queue.sort((a, b) => b.lead_quality_score - a.lead_quality_score);
  saveQueue(queue);
  return true;
}

export function removeFromQueue(leadId: string): void {
  const queue = getQueue().filter((q) => q.lead_id !== leadId);
  saveQueue(queue);
}

export function updateQueueItem(leadId: string, updates: Partial<QueueItem>): void {
  const queue = getQueue().map((q) =>
    q.lead_id === leadId ? { ...q, ...updates } : q
  );
  saveQueue(queue);
}

export function advanceStatus(leadId: string): void {
  const next: Record<string, QueueItem["status"]> = {
    "To Contact": "In Progress",
    "In Progress": "Done",
    "Done": "To Contact",
  };
  const queue = getQueue().map((q) =>
    q.lead_id === leadId ? { ...q, status: next[q.status] || "To Contact" } : q
  );
  saveQueue(queue);
}

export function getToContactCount(): number {
  return getQueue().filter((q) => q.status === "To Contact").length;
}
