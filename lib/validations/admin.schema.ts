import { z } from "zod";

/**
 * The numeric rules an administrator can change from the interface.
 *
 * Each entry names the single key inside that rule's `configuration` JSON, so the action
 * rebuilds the object rather than accepting arbitrary JSON from a form. Locked payroll
 * periods are absent deliberately: they are a list of date ranges, not a number, and a
 * free-form JSON field on a rule that governs payroll is not a safe control.
 */
export const EDITABLE_RULES = {
  maximum_auto_corrections: {
    key: "limit",
    label: "Automatic corrections per month",
    unit: "corrections",
    max: 50,
  },
  overtime_requires_approval: {
    key: "threshold_minutes",
    label: "Overtime before approval is required",
    unit: "minutes",
    max: 1440,
  },
  correction_submission_deadline: {
    key: "days",
    label: "Filing deadline after the attendance date",
    unit: "days",
    max: 365,
  },
} as const;

export type EditableRuleCode = keyof typeof EDITABLE_RULES;

export const updateRuleSchema = z.object({
  ruleCode: z.enum(
    Object.keys(EDITABLE_RULES) as [EditableRuleCode, ...EditableRuleCode[]],
  ),
  value: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});

export type UpdateRuleInput = z.infer<typeof updateRuleSchema>;
