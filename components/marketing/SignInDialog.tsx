"use client";

import { SignInForm } from "@/components/auth/SignInForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function SignInDialog({ trigger }: { trigger: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Sign in</DialogTitle>
          <DialogDescription>
            Access your attendance history and correction requests.
          </DialogDescription>
        </DialogHeader>
        <SignInForm />
      </DialogContent>
    </Dialog>
  );
}
