import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/status";

const statusBadge = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        success: "bg-success-subtle text-success-subtle-foreground",
        warning: "bg-warning-subtle text-warning-subtle-foreground",
        info: "bg-info-subtle text-info-subtle-foreground",
        danger: "bg-destructive-subtle text-destructive-subtle-foreground",
        neutral: "bg-neutral-subtle text-neutral-subtle-foreground",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

type StatusBadgeProps = {
  label: string;
  tone: Tone;
  className?: string;
} & Omit<VariantProps<typeof statusBadge>, "tone">;

export function StatusBadge({ label, tone, className }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadge({ tone }), className)}>
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-full bg-current opacity-70"
      />
      {label}
    </span>
  );
}
