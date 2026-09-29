import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// The browser only ever talks to this app and, for sign-in, to the Supabase project.
let supabaseOrigin = "";
try {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
} catch {
  // A malformed URL just means no extra origin is allowed.
}

/**
 * Content Security Policy without nonces (Next's "Without Nonces" guide).
 * 'unsafe-inline' scripts are needed for Next's inline bootstrap and the
 * before-paint theme script; 'unsafe-eval' only in development, for React's
 * dev tooling. Fonts are self-hosted by next/font, so font-src is 'self'.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ""}${isDev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // No upgrade-insecure-requests: Crisp runs locally over plain http, and
  // upgrading would send its own assets to an https port that is not there.
  // Add it (with HSTS, below) once Crisp is served over https.
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  // Ignored by browsers over plain http (localhost); takes effect once served over https.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
