/** Forwards browser `/api/v1/*` calls to the Nest API (server can reach localhost:4011). */

function nestBaseUrl() {
  const configured = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4011/api/v1").trim();
  if (!configured || configured.startsWith("/")) return "http://localhost:4011/api/v1";
  return configured.replace(/\/$/, "");
}

export async function proxyToNest(request: Request, path: string) {
  const target = new URL(`${nestBaseUrl()}/${path}`);
  const incoming = new URL(request.url);
  target.search = incoming.search;

  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("authorization", authorization);
  const organizationId = request.headers.get("x-organization-id");
  if (organizationId) headers.set("x-organization-id", organizationId);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  headers.set("accept", request.headers.get("accept") || "application/json");

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const response = await fetch(target, init);
  const body = await response.arrayBuffer();
  const outbound = new Headers();
  const responseType = response.headers.get("content-type");
  if (responseType) outbound.set("content-type", responseType);
  return new Response(body, { status: response.status, headers: outbound });
}
