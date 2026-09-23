"use client";

import Link from "next/link";
import { Clock, Menu } from "lucide-react";

import { SignInDialog } from "@/components/marketing/SignInDialog";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const NAV = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Capabilities", href: "#capabilities" },
  { label: "Safeguards", href: "#safeguards" },
];

export function SiteHeader({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Clock className="size-4" />
          </span>
          AttendFlow AI
        </Link>

        <nav
          aria-label="Main"
          className="hidden flex-1 items-center gap-1 md:flex"
        >
          {NAV.map((item) => (
            <Button key={item.href} asChild variant="ghost" size="sm">
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <ThemeToggle />

          {isSignedIn ? (
            <Button asChild size="sm">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          ) : (
            <SignInDialog trigger={<Button size="sm">Sign in</Button>} />
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="size-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav aria-label="Mobile" className="flex flex-col gap-1 px-4">
                {NAV.map((item) => (
                  <Button
                    key={item.href}
                    asChild
                    variant="ghost"
                    className="justify-start"
                  >
                    <Link href={item.href}>{item.label}</Link>
                  </Button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
