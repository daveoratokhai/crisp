import type { LucideIcon } from "lucide-react";
import { copy } from "@/content/site";

/**
 * Props for a control copied from Notion's layout that has no feature behind
 * it yet. It keeps the look and the hover, but is marked disabled for
 * assistive tech and says so on hover, rather than silently doing nothing.
 */
export const notBuilt = {
  "aria-disabled": true,
  title: copy.notBuilt,
} as const;

type Props = {
  icon: LucideIcon;
  label: string;
  /** Icon size in px. Notion uses 20 in the sidebar and top bar, 16 in toolbars. */
  size?: number;
  /** Sidebar icons and top bar icons are different greys in Notion. */
  tone?: "sidebar" | "topbar";
  /** 32px tall instead of 28, for the Home pill row. */
  tall?: boolean;
  onClick?: () => void;
  /** Leave unset for controls that do nothing yet. */
  built?: boolean;
};

/**
 * Notion's square icon button. Variants are props rather than className
 * overrides: two Tailwind utilities for the same property do not resolve by
 * the order they are written in, so an override could silently lose.
 */
export function IconButton({ icon: Icon, label, size = 20, tone = "sidebar", tall = false, onClick, built = false }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={built ? onClick : undefined}
      {...(built ? { title: label } : notBuilt)}
      className={`grid w-7 shrink-0 place-items-center rounded-md transition-colors hover:bg-hover ${tall ? "h-8" : "h-7"} ${
        tone === "topbar" ? "text-topbar-icon" : "text-icon"
      }`}
    >
      <Icon size={size} strokeWidth={1.75} aria-hidden />
    </button>
  );
}
