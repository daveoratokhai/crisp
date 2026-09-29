"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { THEME_KEY as KEY } from "./theme-script";

export type Theme = "system" | "light" | "dark";
export const THEMES: Theme[] = ["system", "light", "dark"];

/*
 * The theme lives outside React (localStorage plus a data-theme attribute on
 * <html>), so it is an external store read through useSyncExternalStore.
 * The store owns every read and write. A per-viewer convenience, so storage
 * is best effort: blocked storage just means the choice is not remembered.
 */
const listeners = new Set<() => void>();

function read(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

function applyToDocument(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
}

export function setTheme(theme: Theme) {
  applyToDocument(theme);
  try {
    if (theme === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  // Another tab changed the theme: follow it here too.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    applyToDocument(read());
    listener();
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The server cannot know the saved theme, so it renders "system" and the
    client corrects it after hydration without a mismatch error. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, read, () => "system" as const);
}

/**
 * One-click light/dark switch for the sidebar. Flips whichever theme is on
 * screen now (the saved choice, or the OS setting when none is saved) and
 * saves the opposite. The system option stays in the Evercrisp menu.
 *
 * Both icons and labels render; CSS in globals.css (.theme-when-light and
 * .theme-when-dark) shows the right one, so the server needs no idea which
 * theme the viewer has and nothing flashes on load.
 */
export function ThemeButton({ toDark, toLight }: { toDark: string; toLight: string }) {
  function flip() {
    const saved = document.documentElement.dataset.theme;
    const dark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(dark ? "light" : "dark");
  }
  return (
    <button
      type="button"
      onClick={flip}
      className="grid size-7 shrink-0 place-items-center rounded-full text-icon transition-colors hover:bg-hover"
    >
      <span className="theme-when-light">
        <Moon size={17} strokeWidth={1.75} aria-hidden />
        <span className="sr-only">{toDark}</span>
      </span>
      <span className="theme-when-dark">
        <Sun size={17} strokeWidth={1.75} aria-hidden />
        <span className="sr-only">{toLight}</span>
      </span>
    </button>
  );
}
