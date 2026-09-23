import type { Metadata } from "next";
import { Poppins, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "AI-assisted attendance correction with deterministic business rules, human approval, and a complete audit trail.",
  // No global noindex. The landing page is public; the authenticated routes opt out
  // individually in their own layouts.
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // next-themes sets the class on <html> before paint, which React cannot account for
    // during hydration; suppressing the warning here is the documented handling.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
