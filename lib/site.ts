/**
 * Absolute base for canonical URLs, Open Graph tags, robots and the sitemap.
 *
 * Vercel exposes VERCEL_PROJECT_PRODUCTION_URL on every deployment, so production works
 * without configuration; NEXT_PUBLIC_SITE_URL overrides it when a custom domain is in use.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const SITE_NAME = "AttendFlow AI";

/** Routes behind authentication. Kept in one place so robots and the sitemap agree. */
export const PRIVATE_ROUTES = [
  "/dashboard",
  "/attendance",
  "/corrections",
  "/notifications",
  "/hr",
  "/admin",
  "/login",
];
