"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { copy } from "@/content/site";
import { exploreHref, parseParams } from "@/features/explore/filter";
import { OPEN_SEARCH } from "@/features/search/search-dialog";

/**
 * Explore's search box. Enter searches, keeping the filters already set.
 * The ⌘K hint opens quick search, which jumps straight to a page.
 */
export function ExploreSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const onExplore = pathname === "/explore" || pathname === "/";
  const [q, setQ] = useState(onExplore ? (params.get("q") ?? "") : "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const base = onExplore ? parseParams(Object.fromEntries(params)) : {};
    router.push(exploreHref(base, { q: q.trim() || undefined }));
  }

  return (
    <form role="search" onSubmit={submit} className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full border border-line bg-surface pl-3.5 pr-1.5 focus-within:border-blue">
      <Search size={16} strokeWidth={2} aria-hidden className="shrink-0 text-icon" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={copy.header.search}
        aria-label={copy.header.search}
        className="h-full min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-muted"
      />
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH))}
        className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-kbd hover:bg-hover max-sm:hidden"
      >
        {copy.sidebar.searchKey}
      </button>
    </form>
  );
}
