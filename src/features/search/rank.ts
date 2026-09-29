import type { Doc } from "../workspace/doc";

/** What the search dialog knows about each document. Plain data, safe to send to the browser. */
export type SearchEntry = {
  id: string;
  title: string;
  /** Where it lives, e.g. "Givebacks · Workshop" or "Private". */
  where: string;
  /** The body as plain-ish text, capped so the index stays small. */
  text: string;
};

export type SearchHit = { entry: SearchEntry; snippet: string | null };

const MAX_TEXT = 5000;

export function toEntry(doc: Doc, where: string): SearchEntry {
  const text = doc.blocks
    .map((b) => (b.type === "markdown" ? b.content.text : ""))
    .join("\n")
    .replace(/[#>*_`|[\]()-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT);
  return { id: doc.id, title: doc.title, where, text };
}

/**
 * Every word typed must appear in the title or the body. Title matches rank
 * first (a title that starts with the query highest), then body matches.
 * An empty query returns nothing: the dialog shows recents instead.
 */
export function search(entries: SearchEntry[], query: string, limit = 20): SearchHit[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const scored = entries.flatMap((entry) => {
    const title = entry.title.toLowerCase();
    const text = entry.text.toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (title.includes(t)) score += title.startsWith(t) ? 30 : 20;
      else if (text.includes(t)) score += 5;
      else return [];
    }
    return [{ entry, score, snippet: snippetFor(entry.text, terms) }];
  });

  return scored
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .slice(0, limit)
    .map(({ entry, snippet }) => ({ entry, snippet }));
}

/** About 90 characters of body around the first term found there. */
function snippetFor(text: string, terms: string[]): string | null {
  const lower = text.toLowerCase();
  const at = terms.map((t) => lower.indexOf(t)).filter((i) => i >= 0).sort((a, b) => a - b)[0];
  if (at === undefined) return null;
  const start = Math.max(0, at - 30);
  const end = Math.min(text.length, at + 60);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}
