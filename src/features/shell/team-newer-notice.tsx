"use client";

import { useEffect, useState, useTransition } from "react";
import { takeTeamVersion } from "@/app/actions";
import { copy } from "@/content/site";

const CONFIRM_WINDOW = 4000;

/**
 * Shown on a local copy when a teammate has published a newer version. The
 * one action, replacing this copy with theirs, discards local unpublished
 * edits, so it takes two clicks. Keeping your own copy needs no button: carry
 * on editing, and Share will ask before overwriting theirs.
 */
export function TeamNewerNotice({
  docId,
  when,
  changed,
  writable = true,
}: {
  docId: string;
  when: string;
  changed: boolean;
  /** False on a deployment with no writable disk (see src/lib/deploy.ts). */
  writable?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), CONFIRM_WINDOW);
    return () => clearTimeout(t);
  }, [armed]);

  function onClick() {
    if (pending || !writable) return;
    if (!armed) {
      setFailed(false);
      setArmed(true);
      return;
    }
    setArmed(false);
    startTransition(async () => {
      try {
        const result = await takeTeamVersion(docId);
        if (!result.ok) setFailed(true);
      } catch {
        setFailed(true);
      }
    });
  }

  return (
    <div role="status" className="rounded-2xl border border-warning bg-warning-bg px-4 py-3 text-sm">
      <p className="font-medium text-text">{copy.teamNewer.title}</p>
      <p className="mt-1 text-text-2">{copy.teamNewer.body(when, changed)}</p>
      <button
        type="button"
        onClick={onClick}
        disabled={pending || !writable}
        title={writable ? undefined : copy.topbar.readOnlyHost}
        className={`mt-2.5 rounded-full px-3 py-1 text-sm transition-colors disabled:opacity-60 ${
          armed ? "bg-blue text-on-blue" : "border border-line bg-surface text-text hover:bg-hover"
        }`}
      >
        {pending ? copy.teamNewer.taking : failed ? copy.teamNewer.takeFailed : armed ? copy.teamNewer.takeConfirm : copy.teamNewer.take}
      </button>
    </div>
  );
}
