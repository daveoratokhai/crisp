import type { Block, TableContent } from "./types";

/**
 * Serialise any block to markdown, so an agent reading through the MCP
 * server gets one coherent document whatever the underlying block types.
 * This is what keeps rich content from breaking agent access.
 *
 * Every block type must be handled here. The exhaustive switch makes the
 * compiler refuse a new type that has no serialisation.
 */
export function blockToMarkdown(block: Block, blocks: Block[] = []): string {
  switch (block.type) {
    case "markdown":
      return block.content.text;

    case "image":
    case "gif": {
      const img = `![${block.content.alt}](${block.storagePath ?? ""})`;
      return block.content.caption ? `${img}\n*${block.content.caption}*` : img;
    }

    case "file":
      return `[${block.content.name}](${block.storagePath ?? ""}) (${formatSize(block.content.size)})`;

    case "table":
      return tableToMarkdown(block.content);

    case "video":
      return `[Video${block.content.caption ? `: ${block.content.caption}` : ""}](${block.storagePath ?? ""})`;

    case "embed":
      return `[${block.content.title}](${block.content.url})`;

    case "chart": {
      // A chart has no data of its own. Describe it, then point at its table.
      const source = blocks.find((b) => b.id === block.content.tableBlockId);
      const label = `*${block.content.kind} chart of ${block.content.y} by ${block.content.x}*`;
      return source?.type === "table"
        ? `${label}\n\n${tableToMarkdown(source.content)}`
        : `${label} (source table missing)`;
    }

    default: {
      const unhandled: never = block;
      throw new Error(`No markdown serialisation for block ${JSON.stringify(unhandled)}`);
    }
  }
}

/** A whole document, blocks joined in order. What read_doc returns. */
export function documentToMarkdown(title: string, blocks: Block[]): string {
  return [`# ${title}`, ...blocks.map((b) => blockToMarkdown(b, blocks))].join("\n\n");
}

function tableToMarkdown({ columns, rows }: TableContent): string {
  if (columns.length === 0) return "";
  // Pipes inside cells would break the table, so escape them.
  const cell = (v: unknown) => String(v ?? "").replace(/\|/g, "\\|");
  const head = `| ${columns.map((c) => cell(c.label)).join(" | ")} |`;
  const rule = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${columns.map((c) => cell(r[c.key])).join(" | ")} |`);
  return [head, rule, ...body].join("\n");
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
