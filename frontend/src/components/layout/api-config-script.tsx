import Script from "next/script";

/**
 * Injects the Nest API base at request time so Render/Vercel runtime env works
 * even when NEXT_PUBLIC_API_URL was missing or loopback at build time.
 */
export function ApiConfigScript() {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "").trim();

  return (
    <Script id="tic-api-config" strategy="beforeInteractive">
      {`window.__TIC_API_URL__=${JSON.stringify(apiUrl)};`}
    </Script>
  );
}
