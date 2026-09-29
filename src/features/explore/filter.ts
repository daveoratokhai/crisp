import { search, toEntry } from "../search/rank";
import type { Doc, DocState, DocType } from "../workspace/doc";

/**
 * Explore's filters, read from the URL. Plain data and pure functions, so the
 * page stays a server component and the logic is testable.
 *
 * `client` is a client slug, or NO_CLIENT for Evercrisp's own documents.
 */
export const NO_CLIENT = "_none";

export type ExploreParams = {
  q?: string;
  client?: string;
  process?: string;
  type?: DocType;
  state?: DocState;
  sort?: "updated" | "title";
  doc?: string;
};

const DOC_TYPES: DocType[] = ["note", "sop", "skill", "deliverable", "decision"];
const STATES: DocState[] = ["local", "published", "changed"];

type Raw = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

/** Parse searchParams, ignoring anything that is not a known value. */
export function parseParams(raw: Raw): ExploreParams {
  const type = first(raw.type);
  const state = first(raw.state);
  const sort = first(raw.sort);
  return {
    q: first(raw.q)?.slice(0, 200),
    client: first(raw.client),
    process: first(raw.process),
    type: DOC_TYPES.includes(type as DocType) ? (type as DocType) : undefined,
    state: STATES.includes(state as DocState) ? (state as DocState) : undefined,
    sort: sort === "title" ? "title" : undefined,
    doc: first(raw.doc),
  };
}

/** A URL for Explore with some params changed. `undefined` removes a param. Selection resets unless set. */
export function exploreHref(params: ExploreParams, changes: Partial<Record<keyof ExploreParams, string | undefined>>): string {
  const next: Record<string, string | undefined> = { ...params, doc: undefined, ...changes };
  const qs = new URLSearchParams();
  for (const key of ["q", "client", "process", "type", "state", "sort", "doc"] as const) {
    const v = next[key];
    if (v) qs.set(key, v);
  }
  const s = qs.toString();
  return s ? `/explore?${s}` : "/explore";
}

/** Documents matching every filter except the ones named in `ignore` (for counts). */
export function filterDocs(docs: Doc[], p: ExploreParams, ignore: (keyof ExploreParams)[] = []): Doc[] {
  const applies = (k: keyof ExploreParams) => !ignore.includes(k) && p[k] !== undefined;
  let out = docs.filter(
    (d) =>
      (!applies("client") || (p.client === NO_CLIENT ? !d.client : d.client === p.client)) &&
      (!applies("process") || d.process === p.process) &&
      (!applies("type") || d.docType === p.type) &&
      (!applies("state") || d.state === p.state)
  );

  if (applies("q")) {
    const ranked = search(out.map((d) => toEntry(d, "")), p.q!, out.length);
    const byId = new Map(out.map((d) => [d.id, d]));
    return ranked.map((h) => byId.get(h.entry.id)!);
  }

  out = [...out];
  if (p.sort === "title") out.sort((a, b) => a.title.localeCompare(b.title));
  else out.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  return out;
}

/** How many documents each option of `key` would show, given the other filters. */
export function countBy(docs: Doc[], p: ExploreParams, key: "client" | "process" | "type" | "state"): Map<string, number> {
  const pool = filterDocs(docs, p, [key, "q"]);
  const counts = new Map<string, number>();
  for (const d of pool) {
    const v = key === "client" ? (d.client ?? NO_CLIENT) : key === "process" ? d.process : key === "type" ? d.docType : d.state;
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return counts;
}

/** A short plain-text summary of a document's body, for cards and the detail panel. */
export function docSummary(doc: Doc, max = 200): string {
  const text = doc.blocks
    .map((b) => (b.type === "markdown" ? b.content.text : ""))
    .filter((t) => t && !/^#{1,6}\s/.test(t) && !/^(-{3,}|```)/.test(t))
    .map((t) => t.replace(/^[>\-*\d.]+\s+/gm, ""))
    .join(" ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*+|__|`/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, "")}…` : text;
}
