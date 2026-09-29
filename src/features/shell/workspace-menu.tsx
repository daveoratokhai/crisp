"use client";

import { Check, ChevronDown, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/content/site";
import { Badge } from "./badge";
import { setTheme, THEMES, useTheme } from "./theme-toggle";

/**
 * The workspace switcher in the sidebar footer. Crisp has one workspace, so
 * the menu holds what does exist: who you are, appearance, and sign out.
 */
export function WorkspaceMenu({ userEmail }: { userEmail: string | null }) {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
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
    <div ref={ref} className="relative min-w-0 flex-1">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-full items-center gap-2.5 rounded-full pl-2 pr-2 text-left transition-colors hover:bg-hover"
      >
        <Badge letter={copy.workspace.charAt(0)} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-2">{copy.workspace}</span>
        <ChevronDown size={14} strokeWidth={2} aria-hidden className="shrink-0 text-icon" />
      </button>

      {open && (
        <div role="menu" aria-label={copy.sidebar.theme} className="absolute bottom-10 left-0 z-40 w-60 rounded-2xl border border-grid bg-surface p-1.5 shadow-menu">
          {userEmail && <p className="truncate px-2 pb-1.5 pt-1 text-xs text-muted">{userEmail}</p>}
          <p className="px-2 pb-1 pt-1.5 text-xs font-medium text-muted">{copy.sidebar.theme}</p>
          {THEMES.map((t) => (
            <button
              key={t}
              type="button"
              role="menuitemradio"
              aria-checked={theme === t}
              onClick={() => {
                setTheme(t);
                setOpen(false);
              }}
              className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-sm text-text transition-colors hover:bg-hover"
            >
              <span className="flex-1">{copy.sidebar.themes[t]}</span>
              {theme === t && <Check size={16} strokeWidth={2} aria-hidden className="text-link" />}
            </button>
          ))}
          {userEmail && (
            <form action="/auth/signout" method="post" className="mt-1 border-t border-grid pt-1">
              <button type="submit" className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-sm text-text transition-colors hover:bg-hover">
                <LogOut size={14} strokeWidth={2} aria-hidden className="text-icon" />
                {copy.auth.signOut}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
