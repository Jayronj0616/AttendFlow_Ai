import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { StatusBadge } from "@/components/attendance/StatusBadge";
import { ReviewActions } from "@/components/hr/ReviewActions";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EMPTY_VALUE, formatDate, formatTime } from "@/lib/datetime";
import {
  getCorrectionHistory,
  getRequestDetail,
  getTriggeredRules,
} from "@/lib/services/hr.service";
import {
  AI_DECISION_DISPLAY,
  describeRequestedChange,
  REQUEST_STATUS_DISPLAY,
} from "@/lib/status";

export const metadata: Metadata = { title: "Review correction" };

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getRequestDetail(id);

  if (!detail) notFound();

  const { request, employee, existing } = detail;
  const [rules, history] = await Promise.all([
    getTriggeredRules(id),
    getCorrectionHistory(request.employee_id, id),
  ]);

  const decision = request.ai_decision
    ? AI_DECISION_DISPLAY[request.ai_decision]
    : null;
  const status = REQUEST_STATUS_DISPLAY[request.status];
  const awaitingReview = request.status === "pending_hr";

  return (
    <>
      <TopBar
        title="Review correction"
        description={
          employee
            ? `${employee.first_name} ${employee.last_name} · ${formatDate(request.requested_date)}`
            : formatDate(request.requested_date)
        }
        actions={<StatusBadge label={status.label} tone={status.tone} />}
      />

      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader className="gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">Analysis</CardTitle>
                  {decision ? (
                    <StatusBadge
                      label={decision.label}
                      tone={decision.tone}
                      className="text-sm"
                    />
                  ) : null}
                </div>
                {request.ai_reason ? (
                  <p className="text-sm text-muted-foreground">
                    {request.ai_reason}
                  </p>
                ) : null}
              </CardHeader>

              <CardContent className="space-y-6">
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
                          <td className="px-3 py-2 text-muted-foreground">
                            Current
                          </td>
                          <td className="px-3 py-2 tabular-nums">
                            {formatTime(existing?.clock_in ?? null)}
                          </td>
                          <td className="px-3 py-2 tabular-nums">
                            {formatTime(existing?.clock_out ?? null)}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 text-muted-foreground">
                            Requested
                          </td>
                          <td className="px-3 py-2 font-medium tabular-nums">
                            {formatTime(request.requested_clock_in)}
                          </td>
                          <td className="px-3 py-2 font-medium tabular-nums">
                            {formatTime(request.requested_clock_out)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                {rules.length > 0 ? (
                  <section className="space-y-2">
                    <h3 className="text-xs font-medium text-muted-foreground">
                      Business rules triggered
                    </h3>
                    <ul className="space-y-2">
                      {rules.map((rule) => (
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

                <section className="space-y-2">
                  <h3 className="text-xs font-medium text-muted-foreground">
                    Employee reason
                  </h3>
                  <p className="text-sm">{request.employee_reason}</p>
                </section>
              </CardContent>
            </Card>

            {awaitingReview ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Decision</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReviewActions requestId={request.id} />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    This request has already been resolved, so no further action
                    is available.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Employee</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  <Field
                    label="Name"
                    value={
                      employee
                        ? `${employee.first_name} ${employee.last_name}`
                        : EMPTY_VALUE
                    }
                  />
                  <Field
                    label="Employee number"
                    value={employee?.employee_number ?? EMPTY_VALUE}
                  />
                  <Field
                    label="Position"
                    value={employee?.position ?? EMPTY_VALUE}
                  />
                  <Field
                    label="Submitted"
                    value={`${formatDate(request.submitted_at.slice(0, 10))} · ${formatTime(request.submitted_at)}`}
                  />
                  <Field
                    label="AI confidence"
                    value={
                      request.ai_confidence === null
                        ? EMPTY_VALUE
                        : `${Math.round(request.ai_confidence * 100)}%`
                    }
                  />
                </dl>
              </CardContent>
            </Card>

            <Card className="overflow-hidden pb-0">
              <CardHeader>
                <CardTitle className="text-base">
                  Previous corrections
                </CardTitle>
              </CardHeader>
              <div className="border-t">
                {history.length > 0 ? (
                  <ul className="divide-y">
                    {history.map((previous) => {
                      const previousStatus =
                        REQUEST_STATUS_DISPLAY[previous.status];

                      return (
                        <li
                          key={previous.id}
                          className="flex items-center justify-between gap-3 px-6 py-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">
                              {formatDate(previous.requested_date)}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {describeRequestedChange(previous)}
                            </p>
                          </div>
                          <StatusBadge
                            label={previousStatus.label}
                            tone={previousStatus.tone}
                          />
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="px-6 py-6 text-sm text-muted-foreground">
                    No earlier corrections for this employee.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
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
