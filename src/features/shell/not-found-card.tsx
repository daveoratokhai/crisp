import Link from "next/link";
import { copy } from "@/content/site";

/** The 404 message, shared by the root and in-app not-found pages. */
export function NotFoundCard() {
  return (
    <div className="mx-auto max-w-lg p-6 pt-16">
      <section className="rounded-2xl border border-grid bg-surface p-6 shadow-card">
        <h1 className="text-xl font-semibold text-text">{copy.notFound.title}</h1>
        <p className="mt-2 text-sm text-text-2">{copy.notFound.body}</p>
        <Link href="/" className="mt-5 inline-flex h-9 items-center rounded-full bg-blue px-4 text-sm font-medium text-on-blue hover:opacity-90">
          {copy.notFound.back}
        </Link>
      </section>
    </div>
  );
}
