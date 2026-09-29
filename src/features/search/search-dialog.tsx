"use client";

import { FileText, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { copy } from "@/content/site";
import { docHref } from "@/features/workspace/links";
import { search, type SearchEntry } from "./rank";

/** Fired by the sidebar's search box; ⌘K / Ctrl+K opens the dialog too. */
export const OPEN_SEARCH = "crisp:open-search";

/**
 * Quick search over every document, local and shared. The index comes from
 * the server on each render, so new pages and edits are searchable at once.
 * With nothing typed it lists recent pages.
 */
export function SearchDialog({ entries, recentIds }: { entries: SearchEntry[]; recentIds: string[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    if (query.trim()) return search(entries, query);
    return recentIds.flatMap((id) => {
      const entry = entries.find((e) => e.id === id);
      return entry ? [{ entry, snippet: null }] : [];
    });
  }, [entries, recentIds, query]);

  useEffect(() => {
    const show = () => {
      setQuery("");
      setActive(0);
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SEARCH, show);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_SEARCH, show);
    };
  }, []);

  if (!open) return null;

  const current = Math.min(active, Math.max(results.length - 1, 0));
  const go = (id: string) => {
    setOpen(false);
    router.push(docHref(id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh]" onMouseDown={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={copy.search.label}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-[620px] overflow-hidden rounded-2xl border border-grid bg-surface shadow-menu"
      >
        <div className="flex h-12 items-center gap-2.5 border-b border-grid px-4">
          <Search size={18} strokeWidth={1.75} aria-hidden className="text-icon" />
          <input
            ref={input}
            autoFocus
            value={query}
            placeholder={copy.search.placeholder}
            aria-label={copy.search.label}
            aria-controls="search-results"
            aria-activedescendant={results[current] ? `result-${results[current].entry.id}` : undefined}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                if (results.length) setActive((current + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length);
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (results[current]) go(results[current].entry.id);
              } else if (e.key === "Escape") {
                e.preventDefault();
                setOpen(false);
              }
            }}
            className="h-full flex-1 bg-transparent text-base text-text outline-none placeholder:text-muted"
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-1.5">
          <p className="px-2.5 pb-1 pt-1.5 text-xs font-medium text-muted">{query.trim() ? copy.search.results : copy.search.recent}</p>
          {results.length === 0 ? (
            <p className="px-2.5 py-3 text-sm text-muted">{copy.search.empty}</p>
          ) : (
            <ul id="search-results" role="listbox" aria-label={copy.search.results}>
              {results.map((r, i) => (
                <li
                  key={r.entry.id}
                  id={`result-${r.entry.id}`}
                  role="option"
                  aria-selected={i === current}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r.entry.id)}
                  className={`flex cursor-pointer gap-2.5 rounded-md px-2.5 py-2 ${i === current ? "bg-hover" : ""}`}
                >
                  <FileText size={18} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0 text-icon" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate text-sm font-medium text-text">{r.entry.title}</span>
                      <span className="shrink-0 truncate text-xs text-muted">{r.entry.where}</span>
                    </span>
                    {r.snippet && <span className="block truncate text-xs text-text-2">{r.snippet}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="border-t border-grid px-4 py-2 text-xs text-muted">{copy.search.hint}</p>
      </div>
    </div>
  );
}

/** The sidebar's "Search or ask" box: opens the dialog. */
export function SearchTrigger({ label, shortcut }: { label: string; shortcut: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH))}
      className="flex h-8 w-full cursor-text items-center justify-between rounded-full border border-line bg-surface pl-3 pr-1.5 text-left text-sm text-muted transition-colors hover:bg-hover"
    >
      {label}
      <kbd className="rounded-full bg-hover px-1.5 py-0.5 font-sans text-[11px] font-medium leading-[14px] text-kbd">{shortcut}</kbd>
    </button>
  );
}
