import type { Metadata } from "next";
import Link from "next/link";
import { copy } from "@/content/site";

export const metadata: Metadata = { title: copy.auth.notAuthorizedTitle };

/**
 * Reached only after a successful Google sign-in with no team_members row.
 * The callback route already signed this browser back out, so there is no
 * live session here to worry about, just an explanation.
 */
export default async function NotAuthorizedPage({ searchParams }: PageProps<"/auth/not-authorized">) {
  const { email } = await searchParams;
  const who = typeof email === "string" ? email : "Your account";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4">
      <div className="w-full max-w-[360px] text-center">
        <h1 className="text-xl font-bold text-text">{copy.auth.notAuthorizedTitle}</h1>
        <p className="mt-2 text-sm text-text-2">{copy.auth.notAuthorizedBody(who)}</p>
        <Link href="/login" className="mt-6 inline-block text-sm text-link underline underline-offset-2">
          {copy.auth.backToSignIn}
        </Link>
      </div>
    </main>
  );
}
