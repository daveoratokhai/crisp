"use client";

import { useState } from "react";
import { copy } from "@/content/site";
import { createClient } from "@/lib/supabase/client";

/** Google's four-colour "G" mark. Trademark guidelines require the mark unaltered. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden focusable="false">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.61Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.19l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.95 10.69A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.69V4.98H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.02l3-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.98l3 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
    </svg>
  );
}

/**
 * Starts the Google OAuth flow. Runs in the browser: signInWithOAuth
 * navigates the tab to Google itself, so there is nothing to await past that.
 *
 * `hd` narrows Google's own account picker to the Evercrisp domain. It is a
 * UX hint, not a security boundary: the real boundary is the team_members
 * check in the callback route, since `hd` can be bypassed.
 */
export function GoogleSignInButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { hd: "evercrisp.ai" },
      },
    });
    // Success navigates away immediately; only failure returns control here.
    // Before Google is enabled in Supabase (setup step 5), this is where
    // that shows up, as "Unsupported provider" or similar.
    if (authError) {
      setPending(false);
      setError(authError.message);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={pending}
        className="flex h-11 w-full items-center justify-center gap-3 rounded-full border border-line bg-surface text-sm font-medium text-text transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleMark />
        {pending ? copy.auth.signingIn : copy.auth.google}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-center text-sm text-text-2">
          {error}
        </p>
      )}
    </div>
  );
}
