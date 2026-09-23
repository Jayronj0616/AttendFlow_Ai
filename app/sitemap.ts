import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

// Only the landing page. Everything else sits behind authentication and is excluded in
// robots.ts, so listing it here would advertise routes no crawler can reach.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
