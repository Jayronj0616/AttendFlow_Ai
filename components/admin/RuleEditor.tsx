"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateAttendanceRule } from "@/lib/actions/admin.actions";
import {
  EDITABLE_RULES,
  type EditableRuleCode,
} from "@/lib/validations/admin.schema";

type RuleEditorProps = {
  ruleCode: EditableRuleCode;
  initialValue: number;
  initialActive: boolean;
};

export function RuleEditor({
  ruleCode,
  initialValue,
  initialActive,
}: RuleEditorProps) {
  const router = useRouter();
  const definition = EDITABLE_RULES[ruleCode];

  const [value, setValue] = useState(String(initialValue));
  const [isActive, setIsActive] = useState(initialActive);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const dirty =
    value !== String(initialValue) || isActive !== initialActive;

  function handleSave() {
    startTransition(async () => {
      const result = await updateAttendanceRule({
        ruleCode,
        value: Number(value),
        isActive,
      });

      if (result.ok) {
        setError(null);
        setSaved(true);
        router.refresh();
      } else {
        setSaved(false);
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor={`rule-${ruleCode}`}>{definition.label}</Label>
          <div className="flex items-center gap-2">
            <Input
              id={`rule-${ruleCode}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={definition.max}
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setSaved(false);
              }}
              className="w-28 tabular-nums"
            />
            <span className="text-sm text-muted-foreground">
              {definition.unit}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pb-2">
          <Switch
            id={`active-${ruleCode}`}
            checked={isActive}
            onCheckedChange={(checked) => {
              setIsActive(checked);
              setSaved(false);
            }}
          />
          <Label htmlFor={`active-${ruleCode}`} className="text-sm font-normal">
            Active
          </Label>
        </div>

        <Button
          className="ml-auto"
          disabled={!dirty || isPending}
          onClick={handleSave}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {saved && !dirty ? (
        <p className="flex items-center gap-1.5 text-sm text-success-subtle-foreground">
          <Check className="size-4" />
          Saved and recorded in the audit log.
        </p>
      ) : null}

      {!isActive ? (
        <p className="text-sm text-warning-subtle-foreground">
          While inactive this rule is not evaluated, and corrections it would have caught
          are sent to HR instead of being applied automatically.
        </p>
      ) : null}
    </div>
  );
}
