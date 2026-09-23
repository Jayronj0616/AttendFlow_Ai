"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

import { AiAnalysisPanel } from "@/components/corrections/AiAnalysisPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  analyzeCorrection,
  submitCorrection,
  type CorrectionAnalysis,
} from "@/lib/actions/corrections.actions";
import { AI_DECISION_DISPLAY } from "@/lib/status";

type Outcome = {
  duplicate: boolean;
  /** Reflects what actually happened to the record, not what the decision permitted. */
  applied: boolean;
};

export function CorrectionRequestForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [analysis, setAnalysis] = useState<CorrectionAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, startSubmit] = useTransition();
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!analysis) return;
    // block: "nearest" moves the page only when the result is actually off screen, which
    // matters on a phone where it lands below the fold and would otherwise go unnoticed.
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [analysis]);

  function handleAnalyze() {
    setOutcome(null);
    setSubmitError(null);

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

  function handleSubmit() {
    if (!analysis?.requested_date) return;

    startSubmit(async () => {
      const result = await submitCorrection({
        requested_date: analysis.requested_date!,
        requested_clock_in: analysis.requested_clock_in,
        requested_clock_out: analysis.requested_clock_out,
        employee_reason: analysis.employee_reason,
      });

      if (result.ok) {
        setOutcome({ duplicate: result.duplicate, applied: result.applied });
        setSubmitError(null);
        router.refresh();
      } else {
        setSubmitError(result.error);
      }
    });
  }

  const decision = analysis?.evaluation.decision;
  const canSubmit =
    decision === "auto_approve" || decision === "requires_hr_approval";

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
            disabled={isPending || isSubmitting}
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
            <Button
              onClick={handleAnalyze}
              disabled={isPending || isSubmitting}
            >
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
          : outcome
            ? outcomeMessage(outcome)
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

          {outcome ? (
            <Card>
              <CardContent className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {outcome.duplicate
                        ? "Already submitted"
                        : outcome.applied
                          ? "Correction applied"
                          : "Sent to HR"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {outcomeMessage(outcome)}
                    </p>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/corrections">View requests</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
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
                  <Button
                    onClick={handleSubmit}
                    disabled={!canSubmit || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      "Submit request"
                    )}
                  </Button>
                </div>
                {submitError ? (
                  <p
                    role="alert"
                    className="border-t pt-3 text-sm text-destructive"
                  >
                    {submitError}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
}

function outcomeMessage(outcome: Outcome) {
  if (outcome.duplicate) {
    return "This exact correction was already filed, so nothing was duplicated.";
  }

  return outcome.applied
    ? "Your attendance record has been updated and the change is recorded in the audit log."
    : "An approval request is now waiting for HR. Your attendance is unchanged until they approve it.";
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
