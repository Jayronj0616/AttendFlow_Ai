import Link from "next/link";
import { Clock } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Clock className="size-3.5" />
              </span>
              AttendFlow AI
            </div>
            <p className="max-w-xs text-sm text-muted-foreground">
              Attendance corrections that explain themselves, escalate when they
              should, and leave a record either way.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <FooterColumn
              title="Product"
              links={[
                { label: "How it works", href: "#how-it-works" },
                { label: "Capabilities", href: "#capabilities" },
                { label: "Safeguards", href: "#safeguards" },
              ]}
            />
            <FooterColumn
              title="Access"
              links={[{ label: "Sign in", href: "/login" }]}
            />
          </div>
        </div>

        <p className="mt-10 border-t pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} AttendFlow AI
        </p>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div className="space-y-3">
      <p className="font-medium">{title}</p>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
