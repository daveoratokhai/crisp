"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { addComment } from "@/app/actions";
import { copy } from "@/content/site";
import type { Comment } from "@/features/comments/types";
import { formatDateTime } from "@/features/workspace/format";

type Tab = "content" | "comments";

/** A pending text selection, waiting on the floating "Comment" button or the open composer. */
type Pending = { quote: string; prefix: string; suffix: string; top: number; left: number };

const CONTEXT_CHARS = 40;
const FLASH_MS = 2000;

/**
 * The document page's Content/Comments tabs, plus the whole highlight-to-
 * comment feature: selecting text inside the Content panel offers a Comment
 * button, posting one anchors it to that text (see actions.ts's addComment),
 * and every comment's quote is re-located and underlined in the rendered
 * text on every render — re-located, not stored as an offset, so a comment
 * still finds its place after an unrelated edit elsewhere in the document.
 *
 * `children` is the existing Content tab body (DocEditor), rendered by the
 * server component that owns this; this component only wraps it.
 */
export function DocTabs({
  docId,
  comments,
  commentsEnabled,
  disabledReason,
  children,
}: {
  docId: string;
  comments: Comment[];
  /** False when this document has never been published, or there's no team database. */
  commentsEnabled: boolean;
  disabledReason: string | null;
  children: React.ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("content");
  const [pending, setPending] = useState<Pending | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [orphaned, setOrphaned] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const commentsRef = useRef<HTMLElement>(null);
  const marksRef = useRef(new Map<string, HTMLElement[]>());

  const openComment = useCallback((id: string) => {
    setTab("comments");
    setActiveId(id);
    requestAnimationFrame(() => {
      commentsRef.current?.querySelector(`[data-comment-id="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  const viewInContent = useCallback((id: string) => {
    setTab("content");
    setActiveId(id);
    requestAnimationFrame(() => marksRef.current.get(id)?.[0]?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }, []);

  // Re-locate every comment's quote in the rendered text and underline it.
  // Runs after every render of the content (new comments, or the content
  // itself changing), always starting from a clean slate so it never stacks
  // marks from a previous pass on top of each other.
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    unwrapAll(marksRef.current);
    const next = new Map<string, HTMLElement[]>();
    const missing = new Set<string>();
    const fullText = root.textContent ?? "";
    for (const c of comments) {
      const span = locateQuote(fullText, c.quote, c.prefix, c.suffix);
      if (!span) {
        missing.add(c.id); // orphaned: the text it was anchored to has changed
        continue;
      }
      const made = wrapOffsetRange(root, span.start, span.end, () => {
        const mark = document.createElement("mark");
        mark.dataset.commentId = c.id;
        mark.className = "cursor-pointer rounded-[2px] bg-accent-soft text-inherit decoration-link decoration-2 underline-offset-2 hover:bg-hover";
        return mark;
      });
      if (made.length) next.set(c.id, made);
      else missing.add(c.id);
    }
    marksRef.current = next;
    setOrphaned(missing);
  }, [comments, children]);

  // A click on a highlighted span jumps to its comment.
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      const mark = (e.target as HTMLElement).closest?.("mark[data-comment-id]");
      const id = mark?.getAttribute("data-comment-id");
      if (id) openComment(id);
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [openComment]);

  // A fresh selection inside the content area offers a Comment button.
  useEffect(() => {
    if (!commentsEnabled) return;
    const onMouseUp = () => {
      const root = contentRef.current;
      const sel = window.getSelection();
      if (!root || !sel || sel.isCollapsed || sel.rangeCount === 0) return setPending(null);
      if (!root.contains(sel.anchorNode) || !root.contains(sel.focusNode)) return setPending(null);
      const range = sel.getRangeAt(0);
      const quote = range.toString().trim();
      if (!quote) return setPending(null);
      const { start, end } = rangeToOffsets(root, range);
      const fullText = root.textContent ?? "";
      const rect = range.getBoundingClientRect();
      const containerRect = sectionRef.current?.getBoundingClientRect();
      setPending({
        quote,
        prefix: fullText.slice(Math.max(0, start - CONTEXT_CHARS), start),
        suffix: fullText.slice(end, end + CONTEXT_CHARS),
        top: rect.top - (containerRect?.top ?? 0),
        left: rect.left - (containerRect?.left ?? 0),
      });
      setComposerOpen(false);
    };
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, [commentsEnabled]);

  useEffect(() => {
    if (!activeId) return;
    const t = setTimeout(() => setActiveId(null), FLASH_MS);
    return () => clearTimeout(t);
  }, [activeId]);

  function submit() {
    if (!pending || !draft.trim() || isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await addComment(docId, pending, draft);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setPending(null);
      setComposerOpen(false);
      setDraft("");
      window.getSelection()?.removeAllRanges();
    });
  }

  return (
    <section ref={sectionRef} className="relative rounded-2xl border border-grid bg-surface shadow-card">
      <div role="tablist" aria-label={copy.doc.tabs.content} className="flex gap-6 border-b border-grid px-5">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "content"}
          onClick={() => setTab("content")}
          className={`-mb-px border-b-2 py-3 text-sm font-medium ${tab === "content" ? "border-blue text-link" : "border-transparent text-muted hover:text-text"}`}
        >
          {copy.doc.tabs.content}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "comments"}
          onClick={() => setTab("comments")}
          className={`-mb-px border-b-2 py-3 text-sm font-medium ${tab === "comments" ? "border-blue text-link" : "border-transparent text-muted hover:text-text"}`}
        >
          {copy.doc.tabs.comments} · {copy.comments.count(comments.length)}
        </button>
      </div>

      <article hidden={tab !== "content"} className="px-5 py-5 md:px-16">
        <div ref={contentRef}>{children}</div>
      </article>

      <article ref={commentsRef} hidden={tab !== "comments"} className="flex flex-col gap-4 px-5 py-5 md:px-16">
        {!commentsEnabled ? (
          <p className="text-sm text-muted">{disabledReason}</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted">{copy.comments.empty}</p>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              data-comment-id={c.id}
              className={`rounded-xl border p-4 transition-colors ${activeId === c.id ? "border-blue bg-accent-soft" : "border-grid"}`}
            >
              <button
                type="button"
                onClick={() => viewInContent(c.id)}
                title={copy.comments.jump}
                className="block w-full truncate rounded-[3px] border-l-2 border-line pl-2 text-left text-sm italic text-muted hover:border-link hover:text-link"
              >
                &ldquo;{c.quote}&rdquo;
              </button>
              {orphaned.has(c.id) && <p className="mt-1 text-xs text-muted">{copy.comments.orphaned}</p>}
              <p className="mt-2 whitespace-pre-wrap text-sm text-text">{c.body}</p>
              <p className="mt-2 text-xs text-muted">
                {c.authorEmail ?? "–"} · {formatDateTime(c.createdAt)}
              </p>
            </div>
          ))
        )}
      </article>

      {commentsEnabled && pending && (
        <div style={{ position: "absolute", top: pending.top - 44, left: pending.left }} className="z-10 flex flex-col gap-2">
          {!composerOpen ? (
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="flex items-center gap-1 rounded-full bg-blue px-3 py-1.5 text-xs font-medium text-on-blue shadow-card hover:opacity-90"
            >
              {copy.comments.addButton}
            </button>
          ) : (
            <div className="w-72 rounded-xl border border-grid bg-surface p-3 shadow-card">
              <p className="mb-2 truncate text-xs italic text-muted">&ldquo;{pending.quote}&rdquo;</p>
              <textarea
                autoFocus
                rows={3}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={copy.comments.placeholder}
                className="w-full resize-none rounded-md border border-grid bg-transparent px-2 py-1.5 text-sm outline-none focus:border-blue"
              />
              {error && <p className="mt-1 text-xs text-text-2">{error}</p>}
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPending(null);
                    setComposerOpen(false);
                    setDraft("");
                    setError(null);
                  }}
                  className="rounded-full px-3 py-1 text-xs text-muted hover:bg-hover"
                >
                  {copy.comments.cancel}
                </button>
                <button
                  type="button"
                  disabled={!draft.trim() || isPending}
                  onClick={submit}
                  className="rounded-full bg-blue px-3 py-1 text-xs font-medium text-on-blue hover:opacity-90 disabled:opacity-50"
                >
                  {isPending ? copy.comments.posting : copy.comments.post}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** Undo a previous highlight pass: replace each `<mark>` with its own text, then merge runs of text back together. */
function unwrapAll(marks: Map<string, HTMLElement[]>) {
  const parents = new Set<Node>();
  for (const els of marks.values()) {
    for (const mark of els) {
      if (!mark.isConnected) continue;
      const parent = mark.parentNode;
      if (!parent) continue;
      parent.replaceChild(document.createTextNode(mark.textContent ?? ""), mark);
      parents.add(parent);
    }
  }
  for (const p of parents) p.normalize();
}

/** The character offset of a Range's boundary within `root`'s full text, via the browser's own Range.toString(). */
function rangeToOffsets(root: Node, range: Range): { start: number; end: number } {
  const pre = document.createRange();
  pre.selectNodeContents(root);
  pre.setEnd(range.startContainer, range.startOffset);
  const start = pre.toString().length;
  return { start, end: start + range.toString().length };
}

/**
 * Where a comment's quote sits in `fullText` now. Prefers the fully
 * contextualised match (prefix+quote+suffix) to disambiguate a quote that
 * appears more than once; falls back to the bare quote if the surrounding
 * text has shifted since the comment was made.
 */
function locateQuote(fullText: string, quote: string, prefix: string, suffix: string): { start: number; end: number } | null {
  if (!quote) return null;
  const withContext = prefix + quote + suffix;
  const ctxIndex = fullText.indexOf(withContext);
  if (ctxIndex !== -1) return { start: ctxIndex + prefix.length, end: ctxIndex + prefix.length + quote.length };
  const bare = fullText.indexOf(quote);
  return bare === -1 ? null : { start: bare, end: bare + quote.length };
}

/** Wrap the text between two character offsets of `root`'s full text in elements made by `build()`, across as many text nodes as the span crosses. */
function wrapOffsetRange(root: HTMLElement, start: number, end: number, build: () => HTMLElement): HTMLElement[] {
  if (start >= end) return [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const spans: { node: Text; from: number; to: number }[] = [];
  let pos = 0;
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const len = node.textContent?.length ?? 0;
    const nodeStart = pos;
    pos += len;
    if (pos <= start || nodeStart >= end) continue;
    spans.push({ node: node as Text, from: Math.max(0, start - nodeStart), to: Math.min(len, end - nodeStart) });
  }
  const made: HTMLElement[] = [];
  for (const { node, from, to } of spans) {
    if (from >= to) continue;
    try {
      const range = document.createRange();
      range.setStart(node, from);
      range.setEnd(node, to);
      const el = build();
      range.surroundContents(el);
      made.push(el);
    } catch {
      // The DOM shape didn't allow a clean wrap here (e.g. it would split a
      // non-text node); skip this fragment rather than corrupt the content.
    }
  }
  return made;
}
