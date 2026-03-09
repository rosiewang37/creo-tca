"use client";

import { useEffect, useState } from "react";
import type { QueueItem } from "@/lib/types";
import { getQueue, removeFromQueue, advanceStatus, updateQueueItem } from "@/lib/queue-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function QueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);

  const refresh = () => {
    setQueue(getQueue());
    window.dispatchEvent(new Event("queue-updated"));
  };

  useEffect(() => {
    refresh();
  }, []);

  function handleAdvance(leadId: string) {
    advanceStatus(leadId);
    refresh();
  }

  function handleRemove(leadId: string) {
    removeFromQueue(leadId);
    refresh();
  }

  function handleNotesChange(leadId: string, notes: string) {
    updateQueueItem(leadId, { notes });
    refresh();
  }

  const statusColors: Record<string, string> = {
    "To Contact": "bg-blue-100 text-blue-800",
    "In Progress": "bg-yellow-100 text-yellow-800",
    "Done": "bg-green-100 text-green-800",
  };

  if (queue.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Priority Queue</h1>
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            <p className="text-lg mb-2">No leads in queue</p>
            <p className="text-sm">Add leads from the Lead Table or AI Analyzer</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Priority Queue</h1>
      <p className="text-gray-500 text-sm">
        {queue.filter((q) => q.status === "To Contact").length} leads to contact.
        Click the status badge to advance: To Contact &rarr; In Progress &rarr; Done.
      </p>

      <div className="space-y-3">
        {queue.map((item) => (
          <Card key={item.lead_id}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-gray-500">{item.lead_id}</span>
                    <button
                      onClick={() => handleAdvance(item.lead_id)}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${statusColors[item.status]}`}
                    >
                      {item.status}
                    </button>
                    <ScoreBadge score={item.lead_quality_score} />
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500">
                    {item.property_type && <span>{item.property_type}</span>}
                    {item.neighbourhood && <span>{item.neighbourhood}</span>}
                    {item.homeowner_status && <span>{item.homeowner_status}</span>}
                    {item.requested_timeline && <span>{item.requested_timeline}</span>}
                    <span>Added {new Date(item.date_added).toLocaleDateString()}</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Add notes..."
                    value={item.notes}
                    onChange={(e) => handleNotesChange(item.lead_id, e.target.value)}
                    className="mt-2 w-full text-sm border rounded px-2 py-1 text-gray-700 placeholder:text-gray-300"
                  />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-400 hover:text-red-600"
                  onClick={() => handleRemove(item.lead_id)}
                >
                  Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 70 ? "bg-green-100 text-green-800" :
    pct >= 45 ? "bg-yellow-100 text-yellow-800" :
    "bg-red-100 text-red-800";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {pct}%
    </span>
  );
}
