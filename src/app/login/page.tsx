import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { copy } from "@/content/site";
import { GoogleSignInButton } from "@/features/auth/google-button";
import { createClient, hasSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: copy.auth.title };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;

  // Already signed in: nothing to do here. The proxy would also catch this
  // on the next navigation, but redirecting now avoids a flash of this page.
  if (hasSupabase()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4">
      <div className="w-full max-w-[400px] rounded-2xl border border-grid bg-surface p-8 shadow-card">
        <div className="mb-8 flex flex-col items-center text-center">
          <span aria-hidden className="grid size-10 place-items-center rounded-lg bg-blue text-base font-bold text-on-blue">
            C
          </span>
          <h1 className="mt-4 text-xl font-bold text-text">{copy.auth.title}</h1>
          <p className="mt-1.5 text-sm text-text-2">{copy.auth.sub}</p>
        </div>

        {hasSupabase() ? (
          <GoogleSignInButton />
        ) : (
          <p className="rounded-lg border border-dashed border-grid px-4 py-3 text-center text-sm text-muted">
            {copy.auth.noBackend}
          </p>
        )}

        {error && (
          <>
            <p role="alert" className="mt-4 text-center text-sm text-text-2">
              {copy.auth.oauthError}
            </p>
            <Link href="/login" className="mt-2 block text-center text-xs text-muted underline underline-offset-2">
              {copy.auth.tryAgain}
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
