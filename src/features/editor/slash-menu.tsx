"use client";

import {
  ChartColumn,
  Code,
  Globe,
  Heading1,
  Heading2,
  Heading3,
  Image,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Paperclip,
  Pilcrow,
  Quote,
  Table,
  Video,
  type LucideIcon,
} from "lucide-react";
import { copy } from "@/content/site";
import { filterCommands, type CommandKey } from "./commands";

export type SlashState = { key: string; query: string; active: number };

const ICONS: Record<CommandKey, LucideIcon> = {
  text: Pilcrow, h1: Heading1, h2: Heading2, h3: Heading3, bullet: List, number: ListOrdered,
  todo: ListTodo, quote: Quote, code: Code, divider: Minus,
  image: Image, file: Paperclip, table: Table, video: Video, embed: Globe, chart: ChartColumn,
};

/**
 * The "/" block menu, display only. Its keys (arrows, Enter, Tab, Escape) are
 * handled by the editor's own key handler, so a key press is acted on once.
 * Mouse presses are prevented from taking focus away from the block.
 */
export function SlashMenu({
  state,
  onApply,
}: {
  state: SlashState;
  onApply: (r: { text: string; caret: number; thenNewBlock?: boolean }) => void;
}) {
  const items = filterCommands(state.query, copy.editor.commands);
  const built = items.filter((c) => c.apply);
  const active = Math.min(state.active, Math.max(built.length - 1, 0));

  return (
    <div
      role="listbox"
      aria-label={copy.editor.menuLabel}
      className="absolute left-0 top-full z-30 mt-1 max-h-80 w-64 overflow-y-auto rounded-[10px] bg-sidebar p-1 shadow-menu"
    >
      <p className="px-2 pb-1 pt-1.5 text-xs font-medium text-muted">{copy.editor.menuLabel}</p>
      {items.length === 0 && <p className="px-2 py-1.5 text-sm text-muted">{copy.editor.noMatch}</p>}
      {items.map((c) => {
        const Icon = ICONS[c.key];
        const isActive = c.apply && built[active]?.key === c.key;
        return (
          <button
            key={c.key}
            type="button"
            role="option"
            aria-selected={Boolean(isActive)}
            aria-disabled={!c.apply}
            title={c.apply ? undefined : copy.editor.comingSoon}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => c.apply && onApply(c.apply())}
            className={`flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-left text-sm ${
              c.apply ? "text-text hover:bg-hover" : "cursor-default text-muted"
            } ${isActive ? "bg-hover" : ""}`}
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-[4px] border border-line">
              <Icon size={14} strokeWidth={1.75} aria-hidden />
            </span>
            <span className="flex-1">{copy.editor.commands[c.key]}</span>
            {!c.apply && <span className="text-xs">{copy.editor.comingSoon}</span>}
          </button>
        );
      })}
    </div>
  );
}
