"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { analyzeText } from "@/lib/api";
import type { AnalyzeResult } from "@/lib/types";
import { addToQueue } from "@/lib/queue-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const SESSION_KEY = "creo_analyze_state";

interface PersistedState {
  text: string;
  result: AnalyzeResult | null;
  analysisId: string | null;
}

function loadPersistedState(): PersistedState {
  if (typeof window === "undefined") return { text: "", result: null, analysisId: null };
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { text: "", result: null, analysisId: null };
    return JSON.parse(raw);
  } catch {
    return { text: "", result: null, analysisId: null };
  }
}

function savePersistedState(state: PersistedState): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
}

function clearPersistedState(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export default function AnalyzePage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);

  // Restore persisted state on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const saved = loadPersistedState();
    if (saved.text) setText(saved.text);
    if (saved.result) setResult(saved.result);
    if (saved.analysisId) setAnalysisId(saved.analysisId);
  }, []);

  // Persist state whenever text/result change (skip initial mount)
  const persistState = useCallback((t: string, r: AnalyzeResult | null, id: string | null) => {
    savePersistedState({ text: t, result: r, analysisId: id });
  }, []);

  function handleTextChange(value: string) {
    setText(value);
    persistState(value, result, analysisId);
  }

  async function handleAnalyze() {
    if (text.trim().length < 20) {
      setError("Please provide more text (at least 20 characters).");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    setAnalysisId(null);
    try {
      const res = await analyzeText(text);
      const newId = `AI-${Date.now()}`;
      setResult(res);
      setAnalysisId(newId);
      persistState(text, res, newId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    }
    setLoading(false);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setText(content);
      persistState(content, result, analysisId);
    };
    reader.readAsText(file);
  }

  function handleAddToQueue() {
    if (!result || !analysisId) return;
    const fields = result.extracted_fields;
    const added = addToQueue({
      lead_id: analysisId,
      lead_quality_score: result.lead_quality_score,
      property_type: fields.property_type as string,
      neighbourhood: fields.neighbourhood as string,
      homeowner_status: fields.homeowner_status as string,
      requested_timeline: fields.requested_timeline as string,
    });
    if (added) {
      window.dispatchEvent(new Event("queue-updated"));
      // Clear the analysis after adding to queue
      setText("");
      setResult(null);
      setAnalysisId(null);
      setError("");
      clearPersistedState();
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">AI Text Analyzer</h1>
      <p className="text-gray-500 text-sm">
        Paste an email, call transcript, or message. The AI will extract lead information and score it.
      </p>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <Textarea
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Hi, I'm looking to get quotes for painting the exterior of my house in Kingston's West End area. It's a detached home, about 3000 sqft. We're hoping to get it done before summer, so ideally in the next few weeks..."
            className="min-h-[180px] resize-y"
          />
          <div className="flex gap-3 items-center">
            <Button onClick={handleAnalyze} disabled={loading}>
              {loading ? "Analyzing..." : "Analyze"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              Upload .txt
            </Button>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              Analysis Result
              <ScoreBadge score={result.lead_quality_score} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Extracted Fields */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Extracted Fields</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(result.extracted_fields).map(([key, value]) => {
                  const found = result.found_fields.includes(key);
                  return (
                    <div key={key} className={`flex justify-between p-2 rounded ${found ? "bg-green-50" : "bg-gray-50"}`}>
                      <span className="text-gray-600">{formatLabel(key)}</span>
                      <span className="font-medium flex items-center gap-1">
                        {String(value ?? "N/A")}
                        <span className={`text-xs ${found ? "text-green-600" : "text-gray-400"}`}>
                          {found ? "Found" : "Default"}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Factors */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Key Factors</h3>
              <div className="space-y-2">
                {result.top_factors.map((f, i) => (
                  <div key={i} className={`flex items-start gap-2 p-2 rounded text-sm ${
                    f.direction === "+" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                  }`}>
                    <span className="font-bold">{f.direction === "+" ? "+" : "-"}</span>
                    <span>{f.explanation}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Explanation */}
            <p className="text-sm text-gray-600 italic">{result.explanation}</p>

            <Button onClick={handleAddToQueue} className="w-full">
              Add to Queue
            </Button>
          </CardContent>
        </Card>
      )}
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
    <span className={`inline-flex px-2.5 py-1 rounded-full text-sm font-semibold ${color}`}>
      {pct}%
    </span>
  );
}

function formatLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
