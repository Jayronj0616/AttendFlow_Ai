import { createRouteHandler } from "@openpanel/nextjs/server";

// First-party proxy for OpenPanel, so ad blockers that block the third-party host
// do not drop events.
export const { GET, POST } = createRouteHandler();
