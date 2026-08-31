// Clerk Frontend API proxy for the production vercel.app deployment.
//
// Vercel owns *.vercel.app, so there is no DNS record to point at Clerk.
// Instead, Clerk is configured (in the dashboard, Domains) with the proxy
// URL https://sgbs-roster.vercel.app/__clerk, and this function forwards
// /__clerk/* requests to Clerk's shared Frontend API with the required
// headers:
//
//   Clerk-Proxy-Url : the registered proxy URL
//   Clerk-Secret-Key: the sk_live_ secret key (from env)
//   X-Forwarded-For : the original client IP (forwarded from Vercel)
//
// See clerk.com/docs/guides/dashboard/dns-domains/proxy-fapi.

const FAPI_ORIGIN = "https://frontend-api.clerk.dev";
const PROXY_URL = "https://sgbs-roster.vercel.app/__clerk";

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.searchParams.get("path") ?? "";
  const upstream = new URL(
    FAPI_ORIGIN + "/" + path.replace(/^\/+/, ""),
  );
  for (const [k, v] of url.searchParams) {
    if (k !== "path") upstream.searchParams.append(k, v);
  }

  const headers = new Headers(req.headers);
  // Hop-by-hop headers must not be forwarded.
  for (const h of [
    "connection",
    "keep-alive",
    "transfer-encoding",
    "upgrade",
    "content-length",
    "host",
  ]) {
    headers.delete(h);
  }
  headers.set("Clerk-Proxy-Url", PROXY_URL);
  headers.set("Clerk-Secret-Key", process.env.CLERK_SECRET_KEY ?? "");

  const hasBody = !["GET", "HEAD"].includes(req.method);
  const resp = await fetch(upstream, {
    method: req.method,
    headers,
    body: hasBody ? req.body : undefined,
    redirect: "manual",
  });

  const out = new Headers(resp.headers);
  // Rewrite redirects that point at the Frontend API origin so the
  // browser keeps following them through the proxy.
  const location = out.get("location");
  if (location && location.startsWith(FAPI_ORIGIN)) {
    out.set("location", PROXY_URL + location.slice(FAPI_ORIGIN.length));
  }
  // Preserve every Set-Cookie (the Headers container would join them).
  if (typeof resp.headers.getSetCookie === "function") {
    out.delete("set-cookie");
    for (const cookie of resp.headers.getSetCookie()) {
      out.append("set-cookie", cookie);
    }
  }

  return new Response(resp.body, { status: resp.status, headers: out });
}