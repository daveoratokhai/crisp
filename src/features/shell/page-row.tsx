"use client";

import { ChevronRight, Ellipsis, FileText } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { copy } from "@/content/site";
import { docHref } from "@/features/workspace/links";
import type { PageNode } from "@/features/workspace/tree";
import { notBuilt } from "./icon-button";

/** Pixels of left padding per nesting level, measured from Notion. */
const INDENT = 8;

/**
 * A page in the sidebar, as Notion draws it: 30px row, 20px icon, and on
 * hover the icon becomes a chevron that expands the page's children.
 * A row containing the open document starts expanded, so you can see where
 * you are.
 */
export function PageRow({
  node,
  depth = 0,
  expandable = true,
}: {
  node: PageNode;
  depth?: number;
  /** Recents rows do not expand in Notion. */
  expandable?: boolean;
}) {
  const pathname = usePathname();
  const href = docHref(node.doc.id, node.via);
  const active = pathname === href.split("?")[0];
  const containsActive = node.children.some((c) => pathname === docHref(c.doc.id).split("?")[0]);
  const [open, setOpen] = useState(containsActive);

  return (
    <div>
      <div
        className={`group relative flex h-[30px] items-center rounded-md pr-1 transition-colors ${
          active ? "bg-hover text-text" : "text-text-2 hover:bg-hover"
        }`}
        style={{ paddingLeft: 8 + depth * INDENT }}
      >
        <span className="relative grid size-[22px] shrink-0 place-items-center">
          <FileText
            size={20}
            strokeWidth={1.75}
            aria-hidden
            className={`text-icon ${expandable ? "group-hover:invisible" : ""}`}
          />
          {expandable && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-label={open ? copy.sidebar.collapse : copy.sidebar.expand}
              className="invisible absolute inset-0 grid place-items-center rounded-[4px] text-icon hover:bg-hover group-hover:visible"
            >
              <ChevronRight size={16} strokeWidth={2} aria-hidden className={`transition-transform ${open ? "rotate-90" : ""}`} />
            </button>
          )}
        </span>

        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className="ml-2 min-w-0 flex-1 truncate text-sm leading-[30px]"
        >
          {node.doc.title}
        </Link>

        {/* Page actions (rename, move, delete) will live here. Not built yet. */}
        <span className="hidden items-center group-hover:flex">
          <span {...notBuilt} role="button" aria-label={copy.topbar.more} className="grid size-6 place-items-center rounded-[4px] text-icon hover:bg-hover">
            <Ellipsis size={16} strokeWidth={2} aria-hidden />
          </span>
        </span>
      </div>

      {expandable && open && (
        <div className="flex flex-col gap-px pt-px">
          {node.children.length === 0 ? (
            <p className="h-[30px] text-sm leading-[30px] text-muted" style={{ paddingLeft: 8 + (depth + 1) * INDENT + 30 }}>
              {copy.sidebar.noPages}
            </p>
          ) : (
            node.children.map((c) => <PageRow key={c.doc.id + (c.via ?? "")} node={c} depth={depth + 1} />)
          )}
        </div>
      )}
    </div>
  );
}
