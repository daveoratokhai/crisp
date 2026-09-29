"use client";

import { Lock } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { publishDoc } from "@/app/actions";
import { copy } from "@/content/site";
import type { DocState } from "@/features/workspace/doc";

const CONFIRM_WINDOW = 4000;
const ERROR_SHOWN_FOR = 5000;

/**
 * Publish this page to the team. Two clicks, never one: the first arms it and
 * says what will happen, the second (within a few seconds) publishes.
 *
 * When a teammate has published a newer version (`teamNewer`), the armed
 * state says it will overwrite theirs, and only then is overwrite requested.
 * The server checks again at the moment of writing, so a teammate publishing
 * after this page loaded is caught too, and shown as a conflict.
 *
 * Enabled only when there is something to publish (local, or edited since
 * publishing) and the team database is configured.
 */
export function ShareButton({
  docId,
  state,
  canPublish,
  writable = true,
  teamNewer = false,
}: {
  docId: string;
  state: DocState;
  canPublish: boolean;
  /** False on a deployment with no writable disk (see src/lib/deploy.ts). */
  writable?: boolean;
  teamNewer?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const enabled = writable && canPublish && state !== "published";

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), CONFIRM_WINDOW);
    return () => clearTimeout(t);
  }, [armed]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), ERROR_SHOWN_FOR);
    return () => clearTimeout(t);
  }, [error]);

  function onClick() {
    if (!enabled || pending) return;
    if (!armed) {
      setError(null);
      setArmed(true);
      return;
    }
    setArmed(false);
    startTransition(async () => {
      try {
        const result = await publishDoc(docId, { overwrite: teamNewer });
        if (!result.ok) setError(result.conflict ? copy.topbar.shareConflict : result.message);
      } catch {
        setError(copy.topbar.shareFailed);
      }
    });
  }

  const reason = !writable
    ? copy.topbar.readOnlyHost
    : !canPublish
      ? copy.topbar.shareNoBackend
      : state === "published"
        ? copy.topbar.shareUpToDate
        : null;
  const armedLabel = teamNewer ? copy.topbar.shareOverwrite : copy.topbar.shareConfirm;
  const armedHint = teamNewer ? copy.topbar.shareOverwriteHint : copy.topbar.shareConfirmHint;
  const label = pending
    ? copy.topbar.sharing
    : error
      ? error === copy.topbar.shareConflict
        ? error
        : copy.topbar.shareFailed
      : armed
        ? armedLabel
        : copy.topbar.share;
  const title = error ?? reason ?? (armed ? armedHint : copy.topbar.shareHint);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-disabled={!enabled || pending}
      title={title}
      className={`flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition ${
        !enabled
          ? "cursor-default border border-line text-muted"
          : armed
            ? "bg-blue text-on-blue ring-2 ring-blue ring-offset-2 ring-offset-surface"
            : "bg-blue text-on-blue hover:opacity-90"
      }`}
    >
      <Lock size={13} strokeWidth={2} aria-hidden />
      <span aria-live="polite">{label}</span>
      {error && (
        <span role="alert" className="sr-only">
          {error}
        </span>
      )}
    </button>
  );
}
