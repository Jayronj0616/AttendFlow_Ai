"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { AiAnalysisPanel } from "@/components/corrections/AiAnalysisPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  analyzeCorrection,
  type CorrectionAnalysis,
} from "@/lib/actions/corrections.actions";
import { AI_DECISION_DISPLAY } from "@/lib/status";

export function CorrectionRequestForm() {
  const [message, setMessage] = useState("");
  const [analysis, setAnalysis] = useState<CorrectionAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!analysis) return;
    // block: "nearest" moves the page only when the result is actually off screen, which
    // matters on a phone where it lands below the fold and would otherwise go unnoticed.
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [analysis]);

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
            disabled={isPending}
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
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Analysing…
                </>
              ) : analysis ? (
                "Analyse again"
              ) : (
                "Analyse request"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Screen readers get the outcome announced; sighted users get the panel below.
          Without this the decision arrives silently for anyone not watching the screen. */}
      <p className="sr-only" role="status" aria-live="polite">
        {isPending
          ? "Analysing the request."
          : analysis
            ? `Analysis complete. ${AI_DECISION_DISPLAY[analysis.evaluation.decision].label}. ${analysis.evaluation.reason}`
            : ""}
      </p>

      {isPending ? (
        <AnalysisSkeleton />
      ) : analysis ? (
        <div
          ref={resultRef}
          className="animate-in fade-in slide-in-from-bottom-2 space-y-6 duration-300"
        >
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
        </div>
      ) : null}
    </div>
  );
}

/** Mirrors the analysis panel's shape so the result settles in place rather than jumping. */
function AnalysisSkeleton() {
  return (
    <Card aria-hidden>
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-6 w-36 rounded-md" />
        </div>
        <Skeleton className="h-4 w-4/5" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
        <Skeleton className="h-24 rounded-md" />
      </CardContent>
    </Card>
  );
}

function submitHint(
  decision: CorrectionAnalysis["evaluation"]["decision"] | undefined,
) {
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
