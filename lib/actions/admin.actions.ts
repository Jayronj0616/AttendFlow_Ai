"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/services/profile.service";
import {
  EDITABLE_RULES,
  updateRuleSchema,
  type UpdateRuleInput,
} from "@/lib/validations/admin.schema";

export type UpdateRuleResult = { ok: true } | { ok: false; error: string };

/**
 * Changes one attendance rule.
 *
 * The write goes through the session client so the admin-only RLS policy on
 * attendance_rules is what authorizes it. These values decide whether corrections apply
 * automatically, so the change is also written to the audit log with both the old and new
 * configuration — a rule quietly loosening is exactly the kind of change that needs a
 * trail.
 */
export async function updateAttendanceRule(
  input: UpdateRuleInput,
): Promise<UpdateRuleResult> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "admin") {
    return { ok: false, error: "You are not authorised to change attendance rules." };
  }

  const parsed = updateRuleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const definition = EDITABLE_RULES[parsed.data.ruleCode];
  if (parsed.data.value > definition.max) {
    return {
      ok: false,
      error: `Enter a value no greater than ${definition.max} ${definition.unit}.`,
    };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("attendance_rules")
    .select("*")
    .eq("rule_code", parsed.data.ruleCode)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: "That rule no longer exists." };
  }

  const configuration = { [definition.key]: parsed.data.value };

  const { data: updated } = await supabase
    .from("attendance_rules")
    .update({ configuration, is_active: parsed.data.isActive })
    .eq("rule_code", parsed.data.ruleCode)
    .select()
    .maybeSingle();

  if (!updated) {
    return {
      ok: false,
      error: "The rule could not be updated. Please try again.",
    };
  }

  await createAdminClient().from("audit_logs").insert({
    actor_type: "admin",
    actor_id: user.userId,
    action: "attendance_rule_updated",
    entity_type: "attendance_rule",
    entity_id: existing.id,
    previous_data: {
      configuration: existing.configuration,
      is_active: existing.is_active,
    },
    new_data: { configuration, is_active: parsed.data.isActive },
  });

  revalidatePath("/admin/rules");
  revalidatePath("/hr/audit");

  return { ok: true };
}
