"use client";

import { GripVertical, Plus } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { saveDocBody } from "@/app/actions";
import { copy } from "@/content/site";
import { BlockView } from "@/features/blocks/render";
import { filterCommands, isCodeBlock } from "./commands";
import { SlashMenu, type SlashState } from "./slash-menu";

type EditorBlock = { key: string; text: string };
type Focus = { key: string; caret: number | "start" | "end" };

let keySeed = 0;
const newKey = () => `b${Date.now().toString(36)}${(keySeed++).toString(36)}`;
const SAVE_DELAY = 800;

/**
 * Notion-style block editor over a markdown body. Each block is one markdown
 * paragraph, list, table, quote or code fence. A block shows rendered until
 * clicked, then edits as markdown source.
 *
 *   Enter           new block (split at the caret); Shift+Enter a line break
 *   Backspace       at the start: delete an empty block, else merge upward
 *   Arrow up/down   at the edges: move to the neighbouring block
 *   Mod+Shift+Up/Dn move the block
 *   "/"             in an empty block: the block menu
 *
 * Saves the whole body shortly after typing stops and immediately after any
 * structural change. A failed save keeps the text and offers a retry.
 *
 * `writable` false (a read-only host, see src/lib/deploy.ts) renders every
 * block through BlockView only: nothing becomes editable, and the status
 * line explains why instead of ever showing Saving or a save error.
 */
export function DocEditor({ docId, initialBlocks, writable = true }: { docId: string; initialBlocks: string[]; writable?: boolean }) {
  const [blocks, setBlocks] = useState<EditorBlock[]>(() =>
    (initialBlocks.length ? initialBlocks : [""]).map((text) => ({ key: newKey(), text }))
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [slash, setSlash] = useState<SlashState | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [, startTransition] = useTransition();

  const areas = useRef(new Map<string, HTMLTextAreaElement>());
  const pendingFocus = useRef<Focus | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(blocks);
  const dirty = useRef(false);

  const persist = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    if (!dirty.current) return;
    dirty.current = false;
    const texts = latest.current.map((b) => b.text);
    setStatus("saving");
    startTransition(async () => {
      try {
        await saveDocBody(docId, texts);
        setStatus("idle");
      } catch {
        dirty.current = true;
        setStatus("error");
      }
    });
  }, [docId]);

  /** Apply a change to the blocks. Structural changes save at once; typing waits. */
  const change = useCallback(
    (next: EditorBlock[], { immediate = false, focus }: { immediate?: boolean; focus?: Focus } = {}) => {
      latest.current = next;
      dirty.current = true;
      setBlocks(next);
      if (focus) {
        pendingFocus.current = focus;
        setEditing(focus.key);
      }
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (immediate) persist();
      else saveTimer.current = setTimeout(persist, SAVE_DELAY);
    },
    [persist]
  );

  // Put the caret where the last action asked, after React has rendered it.
  useLayoutEffect(() => {
    const f = pendingFocus.current;
    if (!f) return;
    const el = areas.current.get(f.key);
    if (!el) return;
    pendingFocus.current = null;
    el.focus();
    const pos = f.caret === "start" ? 0 : f.caret === "end" ? el.value.length : f.caret;
    el.setSelectionRange(pos, pos);
  });

  // Leaving the page with unsaved typing: save it.
  useEffect(() => () => persist(), [persist]);

  const indexOf = (key: string) => latest.current.findIndex((b) => b.key === key);

  function onInput(key: string, text: string) {
    const i = indexOf(key);
    const next = latest.current.map((b) => (b.key === key ? { ...b, text } : b));
    // "/" typed into an empty block opens the menu; the rest filters it.
    if (text.startsWith("/") && !text.includes("\n") && (latest.current[i]?.text === "" || slash?.key === key)) {
      setSlash({ key, query: text.slice(1), active: 0 });
    } else if (slash?.key === key) {
      setSlash(null);
    }
    change(next);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>, key: string) {
    const el = e.currentTarget;
    const i = indexOf(key);
    const list = latest.current;
    const text = list[i].text;
    const atStart = el.selectionStart === 0 && el.selectionEnd === 0;
    const atEnd = el.selectionStart === text.length && el.selectionEnd === text.length;
    const mod = e.metaKey || e.ctrlKey;

    // The "/" menu's keys are handled here, in the same handler as everything
    // else, so one key press can never be acted on twice.
    if (slash?.key === key) {
      const built = filterCommands(slash.query, copy.editor.commands).filter((c) => c.apply);
      const active = Math.min(slash.active, Math.max(built.length - 1, 0));
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (built.length) setSlash({ ...slash, active: (active + (e.key === "ArrowDown" ? 1 : -1) + built.length) % built.length });
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const cmd = built[active];
        if (cmd?.apply) applyCommand(key, cmd.apply());
        else setSlash(null);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSlash(null);
        return;
      }
    }

    if (mod && e.shiftKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      const to = e.key === "ArrowUp" ? i - 1 : i + 1;
      if (to < 0 || to >= list.length) return;
      const next = [...list];
      [next[i], next[to]] = [next[to], next[i]];
      change(next, { immediate: true, focus: { key, caret: el.selectionStart } });
      return;
    }

    if (e.key === "Enter" && !e.shiftKey && !isCodeBlock(text)) {
      e.preventDefault();
      const before = text.slice(0, el.selectionStart);
      const after = text.slice(el.selectionEnd);
      const fresh = { key: newKey(), text: after };
      const next = [...list.slice(0, i), { ...list[i], text: before }, fresh, ...list.slice(i + 1)];
      change(next, { immediate: true, focus: { key: fresh.key, caret: "start" } });
      return;
    }

    if (e.key === "Backspace" && atStart && i > 0) {
      e.preventDefault();
      const prev = list[i - 1];
      const merged = { ...prev, text: prev.text + text };
      const next = [...list.slice(0, i - 1), merged, ...list.slice(i + 1)];
      change(next, { immediate: true, focus: { key: prev.key, caret: prev.text.length } });
      return;
    }

    if (e.key === "ArrowUp" && atStart && i > 0) {
      e.preventDefault();
      pendingFocus.current = { key: list[i - 1].key, caret: "end" };
      setEditing(list[i - 1].key);
      return;
    }
    if (e.key === "ArrowDown" && atEnd && i < list.length - 1) {
      e.preventDefault();
      pendingFocus.current = { key: list[i + 1].key, caret: "start" };
      setEditing(list[i + 1].key);
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      el.blur();
    }
  }

  function applyCommand(key: string, result: { text: string; caret: number; thenNewBlock?: boolean }) {
    setSlash(null);
    const list = latest.current;
    const i = indexOf(key);
    const next = list.map((b) => (b.key === key ? { ...b, text: result.text } : b));
    if (result.thenNewBlock) {
      const fresh = { key: newKey(), text: "" };
      next.splice(i + 1, 0, fresh);
      change(next, { immediate: true, focus: { key: fresh.key, caret: "start" } });
    } else {
      change(next, { immediate: true, focus: { key, caret: result.caret } });
    }
  }

  function addBelow(key: string) {
    const list = latest.current;
    const i = indexOf(key);
    const fresh = { key: newKey(), text: "" };
    change([...list.slice(0, i + 1), fresh, ...list.slice(i + 1)], { focus: { key: fresh.key, caret: "start" } });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    if (dragKey == null || dropIndex == null) return;
    const list = [...latest.current];
    const from = indexOf(dragKey);
    const [moved] = list.splice(from, 1);
    list.splice(dropIndex > from ? dropIndex - 1 : dropIndex, 0, moved);
    setDragKey(null);
    setDropIndex(null);
    change(list, { immediate: true });
  }

  const onlyEmpty = blocks.length === 1 && blocks[0].text === "";

  return (
    <div onDragOver={(e) => dragKey && e.preventDefault()} onDrop={onDrop} className="flex flex-col">
      {blocks.map((b, i) => {
        const isEditing = editing === b.key;
        return (
          <div
            key={b.key}
            onDragOver={(e) => {
              if (!dragKey) return;
              e.preventDefault();
              const r = e.currentTarget.getBoundingClientRect();
              setDropIndex(e.clientY < r.top + r.height / 2 ? i : i + 1);
            }}
            className={`group/block relative rounded-[3px] ${dragKey === b.key ? "opacity-40" : ""} ${
              dropIndex === i && dragKey ? "shadow-[0_-2px_0_0_var(--blue)]" : ""
            } ${dropIndex === i + 1 && dragKey && i === blocks.length - 1 ? "shadow-[0_2px_0_0_var(--blue)]" : ""}`}
          >
            {/* Gutter: add and drag, on hover, as in Notion */}
            {writable && (
              <div className="absolute -left-12 top-1 flex opacity-0 transition-opacity group-hover/block:opacity-100 max-md:hidden">
                <button
                  type="button"
                  aria-label={copy.editor.add}
                  title={copy.editor.add}
                  onClick={() => addBelow(b.key)}
                  className="grid size-6 place-items-center rounded-[4px] text-icon hover:bg-hover"
                >
                  <Plus size={16} strokeWidth={2} aria-hidden />
                </button>
                <button
                  type="button"
                  draggable
                  aria-label={copy.editor.drag}
                  title={copy.editor.drag}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", b.key);
                    setDragKey(b.key);
                  }}
                  onDragEnd={() => {
                    setDragKey(null);
                    setDropIndex(null);
                  }}
                  className="grid size-6 cursor-grab place-items-center rounded-[4px] text-icon hover:bg-hover"
                >
                  <GripVertical size={16} strokeWidth={2} aria-hidden />
                </button>
              </div>
            )}

            {writable && isEditing ? (
              <textarea
                ref={(el) => {
                  if (el) {
                    areas.current.set(b.key, el);
                    el.style.height = "0px";
                    el.style.height = `${el.scrollHeight}px`;
                  } else areas.current.delete(b.key);
                }}
                value={b.text}
                rows={1}
                spellCheck
                placeholder={copy.editor.placeholder}
                aria-label={`Block ${i + 1}`}
                onChange={(e) => onInput(b.key, e.target.value)}
                onKeyDown={(e) => onKeyDown(e, b.key)}
                onBlur={() => {
                  // The slash menu's buttons never take focus (mousedown is
                  // prevented), so a blur always means the block was left.
                  setSlash((s) => (s?.key === b.key ? null : s));
                  setEditing((k) => (k === b.key ? null : k));
                  persist();
                }}
                className={`block w-full resize-none overflow-hidden bg-transparent px-0.5 py-[3px] text-base leading-[1.5] text-text outline-none placeholder:text-muted ${
                  isCodeBlock(b.text) ? "font-mono text-[85%]" : ""
                }`}
              />
            ) : (
              <div
                role={writable ? "button" : undefined}
                tabIndex={writable ? 0 : undefined}
                onClick={
                  writable
                    ? () => {
                        pendingFocus.current = { key: b.key, caret: "end" };
                        setEditing(b.key);
                      }
                    : undefined
                }
                onKeyDown={
                  writable
                    ? (e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          pendingFocus.current = { key: b.key, caret: "end" };
                          setEditing(b.key);
                        }
                      }
                    : undefined
                }
                className={`min-h-[30px] rounded-[3px] ${writable ? "cursor-text focus-visible:outline-offset-2" : ""}`}
              >
                {b.text.trim() ? (
                  <BlockView block={{ id: b.key, type: "markdown", content: { text: b.text } }} />
                ) : (
                  <p className="px-0.5 py-[3px] text-muted">{onlyEmpty ? copy.editor.emptyHint : " "}</p>
                )}
              </div>
            )}

            {writable && slash?.key === b.key && (
              <SlashMenu state={slash} onApply={(r) => applyCommand(b.key, r)} />
            )}
          </div>
        );
      })}

      <div aria-live="polite" className="mt-3 min-h-5 text-xs text-muted">
        {!writable && copy.editor.readOnly}
        {writable && status === "saving" && copy.editor.saving}
        {writable && status === "error" && (
          <span className="text-text-2">
            {copy.editor.saveFailed}{" "}
            <button type="button" onClick={() => { dirty.current = true; persist(); }} className="underline underline-offset-2">
              {copy.editor.retry}
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
