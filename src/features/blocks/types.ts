/**
 * The block model. A document is an ordered list of typed blocks, not a
 * single body of text. That is what lets Crisp hold tables, images, video
 * and charts later without a migration.
 *
 * Every type is declared here from the start, including ones not built yet.
 * `available` says which are real today. The slash menu shows the rest as
 * "coming soon" so the shape of the product is visible and honest.
 *
 * The `content` shape lives in the database as jsonb and varies by type.
 */

export type MarkdownContent = { text: string };

export type ImageContent = { alt: string; caption?: string };

export type FileContent = { name: string; size: number; mime: string };

export type TableContent = {
  columns: { key: string; label: string; kind: "text" | "number" | "date" }[];
  rows: Record<string, string | number | null>[];
};

export type VideoContent = { caption?: string };

export type EmbedContent = { url: string; title: string };

export type ChartContent = {
  /** A chart never owns data: it renders an existing table block. */
  tableBlockId: string;
  kind: "bar" | "line";
  x: string;
  y: string;
};

type BlockOf<T extends string, C> = {
  id: string;
  type: T;
  content: C;
  /** Supabase Storage object path, for types that hold a binary. */
  storagePath?: string;
};

export type Block =
  | BlockOf<"markdown", MarkdownContent>
  | BlockOf<"image", ImageContent>
  | BlockOf<"file", FileContent>
  | BlockOf<"table", TableContent>
  | BlockOf<"video", VideoContent>
  | BlockOf<"gif", ImageContent>
  | BlockOf<"embed", EmbedContent>
  | BlockOf<"chart", ChartContent>;

export type BlockType = Block["type"];
