/**
 * A markdown body as Notion-style blocks: one block per paragraph, heading,
 * list, table, quote or code fence. Blocks are separated by blank lines,
 * except inside a code fence, where blank lines belong to the code.
 *
 * joinMarkdown is the inverse, so a file survives load and save unchanged
 * (modulo trailing whitespace and runs of extra blank lines).
 */
export function splitMarkdown(body: string): string[] {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];
  let current: string[] = [];
  let fence: string | null = null;

  const flush = () => {
    const text = current.join("\n").trim();
    if (text) blocks.push(text);
    current = [];
  };

  for (const line of lines) {
    const marker = line.trimStart().match(/^(```|~~~)/)?.[1];
    if (fence) {
      current.push(line);
      if (marker === fence) fence = null;
      continue;
    }
    if (marker) {
      fence = marker;
      current.push(line);
      continue;
    }
    if (line.trim() === "") flush();
    else current.push(line);
  }
  flush();
  return blocks;
}

export function joinMarkdown(blocks: string[]): string {
  return blocks
    .map((b) => b.trim())
    .filter(Boolean)
    .join("\n\n");
}
