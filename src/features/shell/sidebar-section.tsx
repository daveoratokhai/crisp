"use client";

import { useState } from "react";
import { Badge } from "./badge";

/**
 * A sidebar section ("Recents", "Private", ...). In Notion, clicking the
 * label folds the section away.
 */
export function SidebarSection({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="mb-[18px]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex h-[30px] w-full items-center rounded-md px-2 text-left text-xs font-medium text-muted transition-colors hover:bg-hover"
      >
        {label}
      </button>
      {open && <div className="flex flex-col gap-px">{children}</div>}
    </section>
  );
}

/** A teamspace header: letter badge and name. Clicking folds its pages. */
export function TeamspaceGroup({ label, badge, children }: { label: string; badge: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-1.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mx-2 flex h-7 w-[calc(100%-16px)] items-center gap-[9px] rounded-md text-left transition-colors hover:bg-hover"
      >
        <Badge letter={badge} />
        <span className="truncate text-sm font-medium text-text-2">{label}</span>
      </button>
      {open && <div className="mt-px flex flex-col gap-px">{children}</div>}
    </div>
  );
}
