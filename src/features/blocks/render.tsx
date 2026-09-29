import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { copy } from "@/content/site";
import type { Block, BlockType } from "./types";

/**
 * The block registry: block type to component. Adding a type later means
 * adding an entry here and in to-markdown.ts, not refactoring the page.
 */
const registry: Partial<Record<BlockType, (block: Block) => React.ReactNode>> = {
  markdown: (block) =>
    block.type === "markdown" ? (
      <div className="prose-crisp">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content.text}</ReactMarkdown>
      </div>
    ) : null,
};

export function BlockView({ block }: { block: Block }) {
  const render = registry[block.type];
  if (render) return <>{render(block)}</>;
  // Honest about what is not built, rather than silently dropping content.
  return (
    <p className="rounded-md border border-dashed border-grid px-3 py-2 text-sm text-muted">
      {copy.blocks.unsupported(block.type)}
    </p>
  );
}
