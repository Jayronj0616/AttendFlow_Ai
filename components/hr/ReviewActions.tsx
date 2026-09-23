"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  approveCorrectionAction,
  rejectCorrectionAction,
  requestClarificationAction,
} from "@/lib/actions/hr.actions";

export function ReviewActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action();

      if (result.ok) {
        setError(null);
        router.push("/hr/approvals");
        router.refresh();
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={isPending}
          onClick={() => run(() => approveCorrectionAction(requestId))}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Approve and apply
        </Button>

        <CommentDialog
          title="Reject correction"
          description="The employee sees this, so say why the correction was not accepted."
          label="Reason"
          confirmLabel="Reject"
          variant="destructive"
          trigger={
            <Button variant="outline" disabled={isPending}>
              Reject
            </Button>
          }
          onConfirm={(comment) =>
            run(() => rejectCorrectionAction(requestId, comment))
          }
        />

        <CommentDialog
          title="Request clarification"
          description="The request stays in the queue and the employee is asked for more detail."
          label="What is missing?"
          confirmLabel="Send request"
          trigger={
            <Button variant="ghost" disabled={isPending}>
              Request clarification
            </Button>
          }
          onConfirm={(comment) =>
            run(() => requestClarificationAction(requestId, comment))
          }
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function CommentDialog({
  title,
  description,
  label,
  confirmLabel,
  variant = "default",
  trigger,
  onConfirm,
}: {
  title: string;
  description: string;
  label: string;
  confirmLabel: string;
  variant?: "default" | "destructive";
  trigger: React.ReactNode;
  onConfirm: (comment: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor={`comment-${title}`}>{label}</Label>
          <Textarea
            id={`comment-${title}`}
            rows={4}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant={variant}
            onClick={() => {
              setOpen(false);
              onConfirm(comment);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
