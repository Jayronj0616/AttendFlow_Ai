"use client";

import { useState, useTransition } from "react";

import { AiAnalysisPanel } from "@/components/corrections/AiAnalysisPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  analyzeCorrection,
  type CorrectionAnalysis,
} from "@/lib/actions/corrections.actions";

export function CorrectionRequestForm() {
  const [message, setMessage] = useState("");
  const [analysis, setAnalysis] = useState<CorrectionAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAnalyze() {
    startTransition(async () => {
      const result = await analyzeCorrection(message);

      if (result.ok) {
        setAnalysis(result.analysis);
        setError(null);
      } else {
        setAnalysis(null);
        setError(result.error);
      }
    });
  }

  const decision = analysis?.evaluation.decision;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Request attendance correction
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="correction-message">
            Describe what needs correcting
          </Label>
          <Textarea
            id="correction-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="I forgot to clock out yesterday at 5:10 PM."
            rows={4}
            aria-describedby={error ? "correction-error" : undefined}
            aria-invalid={error ? true : undefined}
          />
          {error ? (
            <p
              id="correction-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button onClick={handleAnalyze} disabled={isPending}>
              {isPending
                ? "Analysing…"
                : analysis
                  ? "Analyse again"
                  : "Analyse request"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {analysis ? (
        <>
          <AiAnalysisPanel analysis={analysis} />

          <Card>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  {/* The spec is explicit that a recommendation must never read as a
                      completed action, so the unfiled state is stated outright. */}
                  <p className="text-sm font-medium">
                    Nothing has been filed yet.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {submitHint(decision)}
                  </p>
                </div>
                <Button disabled>Submit request</Button>
              </div>
              <p className="border-t pt-3 text-xs text-muted-foreground">
                Filing is enabled once the attendance database is connected.
              </p>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function submitHint(decision: CorrectionAnalysis["evaluation"]["decision"] | undefined) {
  switch (decision) {
    case "auto_approve":
      return "This correction meets the rules for automatic processing.";
    case "requires_hr_approval":
      return "Submitting sends this to HR for review before anything changes.";
    case "needs_clarification":
      return "Add the missing date or time above, then analyse again.";
    case "reject":
      return "This request cannot be filed as an attendance correction.";
    default:
      return "";
  }
}
