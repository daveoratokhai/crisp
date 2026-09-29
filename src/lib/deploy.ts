import "server-only";

/**
 * True when this process has no persistent, writable local disk to save
 * drafts to: Vercel (and other serverless hosts) run each request on a
 * throwaway instance, so a file written here is gone by the next request.
 *
 * Vercel sets `VERCEL=1` on every one of its environments (build, preview,
 * production); it is unset when running `next dev` or `next start` on an
 * actual machine, which is how Crisp is meant to run day to day.
 */
export function isReadOnlyHost(): boolean {
  return process.env.VERCEL === "1";
}
