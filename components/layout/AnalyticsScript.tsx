"use client";

import { OpenPanelComponent } from "@openpanel/nextjs";

const CLIENT_ID = process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID;

/** Inert until NEXT_PUBLIC_OPENPANEL_CLIENT_ID is set; that variable is the only gate. */
export function AnalyticsScript() {
  if (!CLIENT_ID) return null;

  return (
    <OpenPanelComponent
      clientId={CLIENT_ID}
      apiUrl="/api/op"
      scriptUrl="/api/op/op1.js"
      trackScreenViews
      trackOutgoingLinks
      trackAttributes
    />
  );
}
