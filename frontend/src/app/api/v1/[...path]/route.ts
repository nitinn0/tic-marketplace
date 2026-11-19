import { handleAppApi } from "@/lib/server/app-api";
import { proxyToNest } from "@/lib/server/nest-proxy";

async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const joined = path.join("/");
  const method = request.method.toUpperCase();

  // Public marketplace reads (including onboarding-catalog) use the Supabase-backed
  // handlers first so Join works even when Nest is down or on the wrong port.
  if (method === "GET" && joined.startsWith("marketplace/")) {
    const local = await handleAppApi(request, joined);
    if (local.status !== 404) return local;
  }

  try {
    const proxied = await proxyToNest(request, joined);
    if (proxied.status !== 404) return proxied;
    const preview = await proxied.clone().text();
    if (!/Cannot GET|Cannot POST|Not Found/i.test(preview)) return proxied;
  } catch {
    // Nest may be down — use the in-process Next handlers when available.
  }

  return handleAppApi(request, joined);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
