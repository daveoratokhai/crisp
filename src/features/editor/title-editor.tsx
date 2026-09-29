"use client";

import { useState, useTransition } from "react";
import { renameDoc } from "@/app/actions";
import { copy } from "@/content/site";

/**
 * The page title, editable in place. Saves on Enter or when focus leaves.
 * `writable` false (a read-only host, see src/lib/deploy.ts) renders the
 * title as plain text instead of an editable field.
 */
export function TitleEditor({ docId, initialTitle, writable = true }: { docId: string; initialTitle: string; writable?: boolean }) {
  const [title, setTitle] = useState(initialTitle === copy.page.untitled ? "" : initialTitle);
  const [saved, setSaved] = useState(initialTitle);
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();

  function commit() {
    const clean = title.trim();
    // An emptied title falls back to "Untitled" rather than failing.
    const next = clean || copy.page.untitled;
    if (next === saved) return;
    startTransition(async () => {
      try {
        await renameDoc(docId, next);
        setSaved(next);
        setFailed(false);
      } catch {
        setFailed(true);
      }
    });
  }

  if (!writable) {
    // Not a heading element: the page itself renders the one real (sr-only)
    // h1 alongside this, the same as the editable textarea below does.
    return <p className="px-1 py-0.5 text-2xl font-semibold leading-snug text-text">{initialTitle}</p>;
  }

  return (
    <>
      <textarea
        value={title}
        rows={1}
        aria-label="Page title"
        placeholder={copy.editor.titlePlaceholder}
        ref={(el) => {
          if (!el) return;
          el.style.height = "0px";
          el.style.height = `${el.scrollHeight}px`;
        }}
        onChange={(e) => setTitle(e.target.value.replace(/\n/g, ""))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        onBlur={commit}
        className="block w-full resize-none overflow-hidden rounded-md bg-transparent px-1 py-0.5 text-2xl font-semibold leading-snug text-text outline-none placeholder:text-title-placeholder hover:bg-hover focus:bg-hover"
      />
      {failed && (
        <p role="alert" className="px-1 text-xs text-warning">
          {copy.editor.saveFailed}
        </p>
      )}
    </>
  );
}
