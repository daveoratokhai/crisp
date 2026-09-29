import { Ellipsis, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { copy } from "@/content/site";
import { DocEditor } from "@/features/editor/doc-editor";
import { TitleEditor } from "@/features/editor/title-editor";
import { CopyLinkButton } from "@/features/shell/copy-link-button";
import { IconButton, notBuilt } from "@/features/shell/icon-button";
import { ShareButton } from "@/features/shell/share-button";
import { StatusBadge } from "@/features/shell/status-badge";
import { TeamNewerNotice } from "@/features/shell/team-newer-notice";
import { teamIsNewer } from "@/features/workspace/doc";
import { loadWorkspace } from "@/features/workspace/local";
import { formatDate } from "@/features/workspace/format";
import { breadcrumb, titleCase } from "@/features/workspace/tree";
import { isReadOnlyHost } from "@/lib/deploy";
import { hasSupabase } from "@/lib/supabase/server";

async function findDoc(id: string) {
  const docs = await loadWorkspace();
  return { doc: docs.find((d) => d.id === id), docs };
}

export async function generateMetadata({ params }: PageProps<"/d/[id]">): Promise<Metadata> {
  // Next 16: params is a Promise and must be awaited.
  const { id } = await params;
  const { doc } = await findDoc(decodeURIComponent(id));
  return { title: doc?.title ?? copy.notFound.title };
}

/**
 * A document as an entity page: a header card (path, title, publish
 * actions, a strip of properties), tabs, then the content card.
 */
export default async function DocPage({ params, searchParams }: PageProps<"/d/[id]">) {
  const { id } = await params;
  const { via } = await searchParams;
  const { doc, docs } = await findDoc(decodeURIComponent(id));
  if (!doc) notFound();
  const behindTeam = teamIsNewer(doc);
  const writable = !isReadOnlyHost();

  const stage = doc.process
    ? (docs.find((d) => d.docType === "sop" && d.process === doc.process && !d.client)?.title ?? titleCase(doc.process))
    : null;

  const crumbs = breadcrumb(doc, docs, via === "process" ? "process" : via === "client" ? "client" : undefined, copy.org).slice(0, -1);
  const crumbHref = (c: string) =>
    c === copy.org
      ? "/explore?client=_none"
      : c === copy.nav.processes
        ? "/explore"
        : doc.client && c === titleCase(doc.client)
          ? `/explore?client=${encodeURIComponent(doc.client)}`
          : doc.process && c === stage
            ? `/explore?process=${encodeURIComponent(doc.process)}`
            : "/explore";

  const properties: [string, React.ReactNode][] = [
    [copy.database.columns.client, doc.client ? titleCase(doc.client) : copy.explore.internal],
    [copy.database.columns.process, stage ?? "–"],
    [copy.database.columns.type, copy.docTypes[doc.docType]],
    [copy.database.columns.status, <StatusBadge key="s" state={doc.state} fromTeam={doc.fromTeam} />],
    [copy.database.columns.updated, formatDate(doc.updatedAt)],
    [copy.explore.published, doc.publishedAt ? formatDate(doc.publishedAt) : "–"],
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4 max-md:pt-16 group-data-[collapsed=true]/shell:pt-16 lg:p-6">
      <section className="rounded-2xl border border-grid bg-surface p-5 shadow-card">
        <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-1 text-xs text-muted">
          {(crumbs.length ? crumbs : [copy.nav.drafts]).map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden>›</span>}
              <Link href={crumbs.length ? crumbHref(c) : "/explore?state=local"} className="hover:text-link hover:underline">
                {c}
              </Link>
            </span>
          ))}
        </nav>

        <div className="mt-3 flex flex-wrap items-start gap-3">
          <span aria-hidden className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-link">
            <FileText size={20} strokeWidth={1.75} />
          </span>
          {/* On a phone the actions wrap below the title rather than squeezing it. */}
          <div className="min-w-[12rem] flex-1">
            <h1 className="sr-only">{doc.title || copy.page.untitled}</h1>
            <TitleEditor key={doc.id} docId={doc.id} initialTitle={doc.title || copy.page.untitled} writable={writable} />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <ShareButton docId={doc.id} state={doc.state} canPublish={hasSupabase()} writable={writable} teamNewer={behindTeam} />
            <CopyLinkButton />
            <IconButton icon={Ellipsis} label={copy.topbar.more} size={20} tone="topbar" />
          </div>
        </div>

        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-t border-grid pt-4 text-sm">
          {properties.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="text-text">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {behindTeam && doc.teamPublishedAt && (
        <TeamNewerNotice docId={doc.id} when={formatDate(doc.teamPublishedAt)} changed={doc.state === "changed"} writable={writable} />
      )}

      <section className="rounded-2xl border border-grid bg-surface shadow-card">
        <div role="tablist" aria-label={copy.doc.tabs.content} className="flex gap-6 border-b border-grid px-5">
          <span role="tab" aria-selected="true" className="-mb-px border-b-2 border-blue py-3 text-sm font-medium text-link">
            {copy.doc.tabs.content}
          </span>
          <span role="tab" aria-selected="false" {...notBuilt} className="py-3 text-sm text-muted">
            {copy.doc.tabs.comments}
          </span>
        </div>
        <article className="px-5 py-5 md:px-16">
          <DocEditor
            key={doc.id}
            docId={doc.id}
            initialBlocks={doc.blocks.map((b) => (b.type === "markdown" ? b.content.text : ""))}
            writable={writable}
          />
        </article>
      </section>
    </div>
  );
}
