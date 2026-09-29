"use client";

import Link from "next/link";
import { useEffect } from "react";
import { copy } from "@/content/site";

/**
 * Shown when a page inside the app throws. Keeps the sidebar (the boundary
 * sits inside the (app) layout) and never shows the error's details: in
 * production Next replaces them with a digest anyway, and the server log has
 * the full error.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("crisp: page error", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg p-6 pt-16">
      <section role="alert" className="rounded-2xl border border-grid bg-surface p-6 shadow-card">
        <h1 className="text-xl font-semibold text-text">{copy.error.title}</h1>
        <p className="mt-2 text-sm text-text-2">{copy.error.body}</p>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={reset} className="inline-flex h-9 items-center rounded-full bg-blue px-4 text-sm font-medium text-on-blue hover:opacity-90">
            {copy.error.retry}
          </button>
          <Link href="/" className="inline-flex h-9 items-center rounded-full border border-line px-4 text-sm text-text hover:bg-hover">
            {copy.error.home}
          </Link>
        </div>
      </section>
    </div>
  );
}
