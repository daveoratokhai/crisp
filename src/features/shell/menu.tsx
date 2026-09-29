"use client";

import { Check, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type MenuOption = { label: string; href: string; active: boolean; count?: number };

/**
 * A button that opens a list of links: the header's client picker and
 * Explore's filter chips. Options arrive as plain data (href already built on
 * the server), so no function crosses from server to client.
 */
export function LinkMenu({
  label,
  value,
  options,
  align = "left",
  emphasis = false,
}: {
  label: string;
  /** What is currently picked, shown after the label. */
  value?: string;
  options: MenuOption[];
  align?: "left" | "right";
  /** Filled style when a value is set, like an applied filter. */
  emphasis?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-sm transition-colors ${
          emphasis ? "bg-accent-soft font-medium text-link" : "text-text-2 hover:bg-hover"
        }`}
      >
        <span>
          {label}
          {value && <span className="font-medium">{`: ${value}`}</span>}
        </span>
        <ChevronDown size={14} strokeWidth={2} aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          aria-label={label}
          className={`absolute top-9 z-40 max-h-80 w-56 overflow-y-auto rounded-2xl border border-grid bg-surface p-1.5 shadow-menu ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {options.map((o) => (
            <Link
              key={o.href + o.label}
              href={o.href}
              role="menuitemradio"
              aria-checked={o.active}
              onClick={() => setOpen(false)}
              className="flex h-8 items-center gap-2 rounded-lg px-2 text-sm text-text transition-colors hover:bg-hover"
            >
              <span className="min-w-0 flex-1 truncate">{o.label}</span>
              {o.count !== undefined && <span className="text-xs text-muted">{o.count}</span>}
              <Check size={14} strokeWidth={2} aria-hidden className={o.active ? "text-link" : "invisible"} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
