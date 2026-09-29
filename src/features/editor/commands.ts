import type { BlockType } from "@/features/blocks/types";

/**
 * The "/" menu. Built commands are markdown, so choosing one just rewrites
 * the block's text: Heading 1 is "# ", a divider is "---". Commands for block
 * types that are declared but not built yet are listed as coming soon, so the
 * shape of the product is visible without pretending they work.
 */
export type CommandKey =
  | "text" | "h1" | "h2" | "h3" | "bullet" | "number" | "todo" | "quote" | "code" | "divider"
  | "image" | "file" | "table" | "video" | "embed" | "chart";

export type Command = {
  key: CommandKey;
  /** Text the block becomes, and where the caret goes. Absent: not built yet. */
  apply?: () => { text: string; caret: number; thenNewBlock?: boolean };
  /** For coming-soon entries, the block type they will create. */
  blockType?: BlockType;
  keywords: string;
};

const prefix = (text: string) => () => ({ text, caret: text.length });

export const COMMANDS: Command[] = [
  { key: "text", apply: prefix(""), keywords: "text paragraph plain" },
  { key: "h1", apply: prefix("# "), keywords: "heading 1 h1 title" },
  { key: "h2", apply: prefix("## "), keywords: "heading 2 h2 subtitle" },
  { key: "h3", apply: prefix("### "), keywords: "heading 3 h3" },
  { key: "bullet", apply: prefix("- "), keywords: "bulleted list bullet unordered ul" },
  { key: "number", apply: prefix("1. "), keywords: "numbered list number ordered ol" },
  { key: "todo", apply: prefix("- [ ] "), keywords: "to-do todo task checkbox check" },
  { key: "quote", apply: prefix("> "), keywords: "quote blockquote callout" },
  { key: "code", apply: () => ({ text: "```\n\n```", caret: 4 }), keywords: "code snippet fence" },
  { key: "divider", apply: () => ({ text: "---", caret: 3, thenNewBlock: true }), keywords: "divider line rule hr separator" },
  { key: "image", blockType: "image", keywords: "image picture photo" },
  { key: "file", blockType: "file", keywords: "file attachment upload" },
  { key: "table", blockType: "table", keywords: "table grid sheet spreadsheet" },
  { key: "video", blockType: "video", keywords: "video gif movie" },
  { key: "embed", blockType: "embed", keywords: "embed link figma loom sheet" },
  { key: "chart", blockType: "chart", keywords: "chart graph plot" },
];

/** Filter by what was typed after "/". Built commands first, then coming soon. */
export function filterCommands(query: string, labels: Record<CommandKey, string>): Command[] {
  const q = query.trim().toLowerCase();
  const hit = (c: Command) => !q || labels[c.key].toLowerCase().includes(q) || c.keywords.includes(q);
  const matches = COMMANDS.filter(hit);
  return [...matches.filter((c) => c.apply), ...matches.filter((c) => !c.apply)];
}

/**
 * True when Enter should insert a newline rather than start a new block.
 * A code fence is always a whole block of its own (see blocks/split.ts), so a
 * block that starts with one is code throughout.
 */
export function isCodeBlock(text: string): boolean {
  return /^(```|~~~)/.test(text.trimStart());
}
