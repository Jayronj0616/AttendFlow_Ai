import type { Metadata } from "next";
import { Clock } from "lucide-react";

import { SignInForm } from "@/components/auth/SignInForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Clock className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">AttendFlow AI</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to manage your attendance
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sign in</CardTitle>
          </CardHeader>
          <CardContent>
            <SignInForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
