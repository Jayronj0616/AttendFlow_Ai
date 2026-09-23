import type { Metadata } from "next";
import { Settings2 } from "lucide-react";

import { RuleEditor } from "@/components/admin/RuleEditor";
import { StatusBadge } from "@/components/attendance/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/datetime";
import { getAttendanceRules } from "@/lib/services/admin.service";
import {
  EDITABLE_RULES,
  type EditableRuleCode,
} from "@/lib/validations/admin.schema";

export const metadata: Metadata = { title: "Attendance rules" };

export default async function RulesPage() {
  const rules = await getAttendanceRules();

  return (
    <>
      <TopBar
        title="Attendance rules"
        description="Changes take effect on the next correction analysed"
      />

      <div className="flex-1 space-y-4 p-4 md:p-6">
        {rules.length === 0 ? (
          <Card>
            <EmptyState
              icon={Settings2}
              title="No rules configured"
              description="Without rules every correction is sent to HR, because the approval gates fall back to their most restrictive setting."
            />
          </Card>
        ) : null}

        {rules.map((rule) => {
          const editable = isEditable(rule.rule_code);

          return (
            <Card key={rule.id}>
              <CardHeader className="gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{rule.rule_name}</CardTitle>
                  <StatusBadge
                    label={rule.is_active ? "Active" : "Inactive"}
                    tone={rule.is_active ? "success" : "neutral"}
                  />
                </div>
                {rule.description ? (
                  <p className="text-sm text-muted-foreground">
                    {rule.description}
                  </p>
                ) : null}
              </CardHeader>

              <CardContent className="space-y-3">
                {editable ? (
                  <RuleEditor
                    ruleCode={editable}
                    initialValue={readNumber(
                      rule.configuration,
                      EDITABLE_RULES[editable].key,
                    )}
                    initialActive={rule.is_active}
                  />
                ) : (
                  <>
                    {/* Locked payroll periods are a list of date ranges rather than a
                        number, and a free-form JSON field on a rule that governs payroll
                        is not a safe control. Shown read-only until it has a real editor. */}
                    <LockedPeriods configuration={rule.configuration} />
                    <p className="text-xs text-muted-foreground">
                      Edited directly in the database for now.
                    </p>
                  </>
                )}

                <p className="border-t pt-3 font-mono text-xs text-muted-foreground">
                  {rule.rule_code}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function isEditable(code: string): EditableRuleCode | null {
  return code in EDITABLE_RULES ? (code as EditableRuleCode) : null;
}

/** Reads one numeric key out of a jsonb value without trusting its shape. */
function readNumber(configuration: unknown, key: string) {
  if (
    typeof configuration !== "object" ||
    configuration === null ||
    Array.isArray(configuration)
  ) {
    return 0;
  }

  const value = (configuration as Record<string, unknown>)[key];
  return typeof value === "number" ? value : 0;
}

function LockedPeriods({ configuration }: { configuration: unknown }) {
  const periods = readPeriods(configuration);

  if (periods.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No payroll periods are currently locked.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {periods.map((period) => (
        <li
          key={`${period.start}-${period.end}`}
          className="rounded-md border border-dashed px-3 py-2 text-sm"
        >
          {formatDate(period.start)} &ndash; {formatDate(period.end)}
        </li>
      ))}
    </ul>
  );
}

function readPeriods(configuration: unknown) {
  if (
    typeof configuration !== "object" ||
    configuration === null ||
    Array.isArray(configuration)
  ) {
    return [];
  }

  const periods = (configuration as { periods?: unknown }).periods;
  if (!Array.isArray(periods)) return [];

  return periods.filter(
    (period): period is { start: string; end: string } =>
      typeof period === "object" &&
      period !== null &&
      typeof (period as { start?: unknown }).start === "string" &&
      typeof (period as { end?: unknown }).end === "string",
  );
}
