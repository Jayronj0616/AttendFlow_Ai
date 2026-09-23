import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ClipboardCheck,
  FileSearch,
  Lock,
  MessageSquareText,
  ScrollText,
  ShieldCheck,
  Split,
  Workflow,
} from "lucide-react";

import { SignInDialog } from "@/components/marketing/SignInDialog";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const DESCRIPTION =
  "Employees describe an attendance correction in plain language. Deterministic rules decide whether it can be applied, anything sensitive goes to a person, and every outcome is auditable.";

export const metadata: Metadata = {
  title: "Attendance corrections without the paperwork",
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: "AttendFlow AI",
    description: DESCRIPTION,
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "AttendFlow AI", description: DESCRIPTION },
};

export default async function LandingPage() {
  // Only a cookie check, not a verified session. Calling getUser() here would add a round
  // trip to the auth server for every anonymous visitor purely to choose a button label,
  // and nothing on this page is protected by the answer — the proxy guards the app itself.
  const store = await cookies();
  const isSignedIn = store
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "AttendFlow AI",
            applicationCategory: "BusinessApplication",
            description: DESCRIPTION,
          }),
        }}
      />

      <SiteHeader isSignedIn={isSignedIn} />

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-4 py-20 md:px-6 md:py-28">
          <div className="max-w-2xl space-y-6">
            <p className="text-sm font-medium text-primary">
              Attendance operations
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Attendance corrections without the paperwork
            </h1>
            <p className="text-lg text-muted-foreground text-pretty">
              An employee writes &ldquo;I forgot to clock out yesterday at 5:10
              PM.&rdquo; The system works out what that means, checks it against
              your rules, and either fixes it or sends it to someone who can.
            </p>
            <div className="flex flex-wrap gap-3">
              {isSignedIn ? (
                <Button asChild size="lg">
                  <a href="/dashboard">Go to dashboard</a>
                </Button>
              ) : (
                <SignInDialog
                  trigger={<Button size="lg">Sign in</Button>}
                />
              )}
              <Button asChild size="lg" variant="outline">
                <a href="#how-it-works">See how it works</a>
              </Button>
            </div>
          </div>
        </section>

        <Section
          id="how-it-works"
          eyebrow="How it works"
          title="Three steps, and a person wherever it matters"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <Step
              icon={MessageSquareText}
              step="01"
              title="Describe it"
              body="No forms, no dropdowns. The request is written the way anyone would say it out loud, and the system shows back exactly what it understood before anything is filed."
            />
            <Step
              icon={FileSearch}
              step="02"
              title="Check it"
              body="Your schedule, the existing record, prior corrections, and the payroll calendar are all retrieved. Nothing is assumed; a missing detail becomes a question rather than a guess."
            />
            <Step
              icon={Split}
              step="03"
              title="Route it"
              body="Straightforward fixes apply immediately. Overtime, locked periods, and overwritten punches go to HR with the reasoning attached."
            />
          </div>
        </Section>

        <Section
          id="capabilities"
          eyebrow="Capabilities"
          title="Built around the awkward cases"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={Workflow}
              title="Deterministic rules"
              body="Correction limits, overtime thresholds, filing deadlines and payroll locks are configuration, not prompt text. Change a limit without touching the model."
            />
            <Feature
              icon={ClipboardCheck}
              title="Human approval"
              body="Anything unusual reaches a reviewer with the current record, the requested change, the rules that fired, and the employee's correction history."
            />
            <Feature
              icon={ScrollText}
              title="Full audit trail"
              body="Who asked, what was decided, which rules applied, what changed, and when. Every step is written down, including the failures."
            />
          </div>
        </Section>

        <Section
          id="safeguards"
          eyebrow="Safeguards"
          title="The parts that are deliberately not left to a model"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <Feature
              icon={ShieldCheck}
              title="Rules outrank interpretation"
              body="The model reads intent from a sentence. Whether a correction is allowed is decided by code that consults no model and returns the same answer every time."
            />
            <Feature
              icon={Lock}
              title="Enforced at the database"
              body="Row Level Security means an employee reaches only their own records. It holds even if application code is wrong, because the database applies it, not the app."
            />
            <Feature
              icon={ClipboardCheck}
              title="Verified, not assumed"
              body="After a change is written it is read back and compared. Success is only reported once the stored record actually matches what was asked for."
            />
          </div>
        </Section>

        <section className="border-t">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Already have an account?
                </h2>
                <p className="text-muted-foreground">
                  Sign in to review your attendance or file a correction.
                </p>
              </div>
              {isSignedIn ? (
                <Button asChild size="lg">
                  <a href="/dashboard">Go to dashboard</a>
                </Button>
              ) : (
                <SignInDialog trigger={<Button size="lg">Sign in</Button>} />
              )}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="border-t scroll-mt-16">
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-16 md:px-6 md:py-20">
        <div className="max-w-2xl space-y-2">
          <p className="text-sm font-medium text-primary">{eyebrow}</p>
          <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {title}
          </h2>
        </div>
        {children}
      </div>
    </section>
  );
}

function Step({
  icon: Icon,
  step,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  step: string;
  title: string;
  body: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {step}
          </span>
        </div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground text-pretty">{body}</p>
      </CardContent>
    </Card>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-3">
        <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground text-pretty">{body}</p>
      </CardContent>
    </Card>
  );
}
