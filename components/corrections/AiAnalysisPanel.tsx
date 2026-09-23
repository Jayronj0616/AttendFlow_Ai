import { StatusBadge } from "@/components/attendance/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CorrectionAnalysis } from "@/lib/actions/corrections.actions";
import { EMPTY_VALUE, formatDate, formatTime } from "@/lib/datetime";
import { AI_DECISION_DISPLAY } from "@/lib/status";

type AiAnalysisPanelProps = {
  analysis: CorrectionAnalysis;
};

export function AiAnalysisPanel({ analysis }: AiAnalysisPanelProps) {
  const decision = AI_DECISION_DISPLAY[analysis.evaluation.decision];
  const timeZone = analysis.schedule?.timezone;

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Analysis</CardTitle>
          <StatusBadge
            label={decision.label}
            tone={decision.tone}
            className="text-sm"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {analysis.evaluation.reason}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <section className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground">
            What the system understood
          </h3>
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <Field
              label="Date"
              value={
                analysis.requested_date
                  ? formatDate(analysis.requested_date)
                  : EMPTY_VALUE
              }
            />
            <Field label="Reason given" value={analysis.employee_reason} />
          </dl>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground">
            Attendance
          </h3>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-3 py-2 font-medium">
                    <span className="sr-only">Record</span>
                  </th>
                  <th className="px-3 py-2 font-medium">Clock-in</th>
                  <th className="px-3 py-2 font-medium">Clock-out</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                    Current
                  </td>
                  <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                    {formatTime(analysis.existing?.clock_in ?? null, timeZone)}
                  </td>
                  <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                    {formatTime(analysis.existing?.clock_out ?? null, timeZone)}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                    Requested
                  </td>
                  <td className="px-3 py-2 tabular-nums font-medium whitespace-nowrap">
                    {formatTime(analysis.requested_clock_in, timeZone)}
                  </td>
                  <td className="px-3 py-2 tabular-nums font-medium whitespace-nowrap">
                    {formatTime(analysis.requested_clock_out, timeZone)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {analysis.evaluation.triggered_rules.length > 0 ? (
          <section className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground">
              Business rules triggered
            </h3>
            <ul className="space-y-2">
              {analysis.evaluation.triggered_rules.map((rule) => (
                <li
                  key={`${rule.code}-${rule.detail}`}
                  className="rounded-md border border-dashed px-3 py-2 text-sm"
                >
                  <span className="font-medium">{rule.label}</span>
                  <span className="text-muted-foreground">
                    {" — "}
                    {rule.detail}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
