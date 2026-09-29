import { ArrowUpDown, Building2, ChevronDown, FilePen, FileText, Filter, Landmark, Workflow, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { copy } from "@/content/site";
import { LinkMenu } from "@/features/shell/menu";
import { ExploreSearch } from "./explore-search";
import { StatusBadge } from "@/features/shell/status-badge";
import type { Doc, DocState, DocType } from "@/features/workspace/doc";
import { formatDate } from "@/features/workspace/format";
import { docHref } from "@/features/workspace/links";
import { breadcrumb, titleCase } from "@/features/workspace/tree";
import { countBy, docSummary, exploreHref, NO_CLIENT, type ExploreParams } from "./filter";

/*
 * Explore's pieces, laid out after OpenMetadata's explore screen: a filter
 * bar with a "Query" line, a browse tree, result cards, and a detail panel
 * for the selected card. All server components; the only client code is the
 * dropdown in LinkMenu.
 */

const DOC_TYPES: DocType[] = ["note", "sop", "skill", "deliverable", "decision"];
const STATES: DocState[] = ["local", "published", "changed"];

export type Place = { slug: string; label: string };

type Ctx = { docs: Doc[]; p: ExploreParams; clients: Place[]; stages: Place[] };

function placeLabel(ctx: Ctx, key: "client" | "process" | "type" | "state", value: string): string {
  if (key === "client") return value === NO_CLIENT ? copy.explore.internal : (ctx.clients.find((c) => c.slug === value)?.label ?? titleCase(value));
  if (key === "process") return ctx.stages.find((s) => s.slug === value)?.label ?? titleCase(value);
  if (key === "type") return copy.docTypes[value as DocType] ?? value;
  return copy.status[value as DocState] ?? value;
}

export function FilterBar(ctx: Ctx & { total: number }) {
  const { p, docs } = ctx;
  const menu = (key: "client" | "process" | "type" | "state", values: string[]) => {
    const counts = countBy(docs, p, key);
    const current = p[key];
    return (
      <LinkMenu
        key={key}
        label={copy.explore.filters[key]}
        value={current ? placeLabel(ctx, key, current) : undefined}
        emphasis={Boolean(current)}
        options={[
          { label: copy.explore.any, href: exploreHref(p, { [key]: undefined }), active: !current },
          ...values.map((v) => ({ label: placeLabel(ctx, key, v), href: exploreHref(p, { [key]: v }), active: current === v, count: counts.get(v) ?? 0 })),
        ]}
      />
    );
  };

  const active = (["type", "client", "process", "state"] as const).filter((k) => p[k]);

  return (
    <section className="rounded-2xl border border-grid bg-surface shadow-card">
      <div className="flex flex-wrap items-center gap-1 border-b border-grid px-3 py-2">
        <div className="mr-1 flex min-w-[200px] flex-1 basis-full sm:basis-auto sm:max-w-xs">
          {/* useSearchParams needs a Suspense boundary above it */}
          <Suspense fallback={<div className="h-9 flex-1" />}>
            <ExploreSearch />
          </Suspense>
        </div>
        {menu("type", DOC_TYPES)}
        {menu("client", [...ctx.clients.map((c) => c.slug), NO_CLIENT])}
        {menu("process", ctx.stages.map((s) => s.slug))}
        {menu("state", STATES)}
        <div className="ml-auto flex items-center gap-1 text-icon">
          <ArrowUpDown size={14} strokeWidth={2} aria-hidden />
          <LinkMenu
            label={p.sort === "title" ? copy.explore.sort.title : copy.explore.sort.updated}
            align="right"
            options={[
              { label: copy.explore.sort.updated, href: exploreHref(p, { sort: undefined }), active: p.sort !== "title" },
              { label: copy.explore.sort.title, href: exploreHref(p, { sort: "title" }), active: p.sort === "title" },
            ]}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-xs">
        <span className="flex items-center gap-1 font-semibold uppercase tracking-wide text-muted">
          <Filter size={12} strokeWidth={2} aria-hidden />
          {copy.explore.query}
        </span>
        {active.length === 0 && !p.q ? (
          <span className="text-muted">{copy.explore.everything}</span>
        ) : (
          <>
            {p.q && <Chip label={`"${p.q}"`} href={exploreHref(p, { q: undefined })} />}
            {active.map((k) => (
              <Chip key={k} label={`${copy.explore.filters[k]}: ${placeLabel(ctx, k, p[k]!)}`} href={exploreHref(p, { [k]: undefined })} />
            ))}
            <Link href="/explore" className="text-link hover:underline">
              {copy.explore.clear}
            </Link>
          </>
        )}
        <span className="ml-auto text-muted">{copy.explore.count(ctx.total)}</span>
      </div>
    </section>
  );
}

function Chip({ label, href }: { label: string; href: string }) {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full bg-accent-soft pl-2.5 pr-1 font-medium text-link">
      {label}
      <Link href={href} aria-label={copy.explore.remove(label)} className="grid size-4 place-items-center rounded-full hover:bg-surface">
        <X size={11} strokeWidth={2.5} aria-hidden />
      </Link>
    </span>
  );
}

export function BrowsePane(ctx: Ctx) {
  const { docs, p } = ctx;
  const all = countBy(docs, {}, "client");
  const byProcess = countBy(docs, {}, "process");
  const drafts = docs.filter((d) => d.state === "local").length;

  return (
    <nav aria-label={copy.explore.browse} className="rounded-2xl border border-grid bg-surface p-3 shadow-card">
      <p className="px-2 pb-2 text-sm font-semibold text-text">{copy.explore.browse}</p>
      <Group icon={Building2} label={copy.nav.clients}>
        {ctx.clients.map((c) => (
          <Leaf key={c.slug} label={c.label} count={all.get(c.slug) ?? 0} href={exploreHref({}, { client: c.slug })} active={p.client === c.slug} />
        ))}
      </Group>
      <Group icon={Workflow} label={copy.nav.processes}>
        {ctx.stages.map((s) => (
          <Leaf key={s.slug} label={s.label} count={byProcess.get(s.slug) ?? 0} href={exploreHref({}, { process: s.slug })} active={p.process === s.slug} />
        ))}
      </Group>
      <Leaf icon={Landmark} label={copy.explore.internal} count={all.get(NO_CLIENT) ?? 0} href={exploreHref({}, { client: NO_CLIENT })} active={p.client === NO_CLIENT} top />
      <Leaf icon={FilePen} label={copy.nav.drafts} count={drafts} href={exploreHref({}, { state: "local" })} active={p.state === "local" && !p.client && !p.process} top />
    </nav>
  );
}

function Group({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <details open className="group/b mb-1">
      <summary className="flex h-8 cursor-pointer list-none items-center gap-2 rounded-md px-2 text-sm text-text transition-colors hover:bg-hover [&::-webkit-details-marker]:hidden">
        <ChevronDown size={14} strokeWidth={2} aria-hidden className="-rotate-90 text-icon transition-transform group-open/b:rotate-0" />
        <Icon size={15} strokeWidth={1.75} aria-hidden className="text-icon" />
        {label}
      </summary>
      <div className="flex flex-col">{children}</div>
    </details>
  );
}

function Leaf({ label, count, href, active, icon: Icon, top = false }: { label: string; count: number; href: string; active: boolean; icon?: LucideIcon; top?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`flex h-8 items-center gap-2 rounded-md pr-2 text-sm transition-colors ${top ? "pl-[30px]" : "pl-[52px]"} ${
        active ? "bg-accent-soft font-medium text-link" : "text-text-2 hover:bg-hover"
      }`}
    >
      {Icon && <Icon size={15} strokeWidth={1.75} aria-hidden className={`-ml-[22px] ${active ? "text-link" : "text-icon"}`} />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="text-xs text-muted">{count}</span>
    </Link>
  );
}

function path(doc: Doc, docs: Doc[]): string[] {
  const crumbs = breadcrumb(doc, docs, undefined, copy.org).slice(0, -1);
  return crumbs.length ? crumbs : [copy.nav.drafts];
}

export function ResultCard({ doc, docs, p, selected }: { doc: Doc; docs: Doc[]; p: ExploreParams; selected: boolean }) {
  const summary = docSummary(doc);
  return (
    <article
      className={`relative rounded-2xl border bg-surface p-4 shadow-card transition-colors ${
        selected ? "border-grid hover:border-line wide:border-blue wide:ring-1 wide:ring-blue" : "border-grid hover:border-line"
      }`}
    >
      {/* Wide screens: the card selects (details on the right). Narrow screens, with no detail panel: it opens the document. */}
      <Link href={exploreHref(p, { doc: doc.id })} scroll={false} aria-label={copy.explore.select(doc.title)} className="absolute inset-0 hidden rounded-2xl wide:block" />
      <Link href={docHref(doc.id)} aria-label={doc.title} className="absolute inset-0 rounded-2xl wide:hidden" />

      <p className="flex min-w-0 items-center gap-1 text-xs text-muted">
        {path(doc, docs).map((c, i) => (
          <span key={i} className="flex min-w-0 items-center gap-1">
            {i > 0 && <span aria-hidden>›</span>}
            <span className="truncate">{c}</span>
          </span>
        ))}
      </p>
      <h3 className="mt-1.5 flex items-center gap-2">
        <FileText size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-icon" />
        <Link href={docHref(doc.id)} className="relative z-10 min-w-0 truncate text-[15px] font-medium text-link hover:underline">
          {doc.title}
        </Link>
      </h3>
      <p className="mt-1.5 line-clamp-2 text-sm text-text-2">{summary || copy.explore.noBody}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>{copy.docTypes[doc.docType]}</span>
        <span aria-hidden>·</span>
        <StatusBadge state={doc.state} fromTeam={doc.fromTeam} />
        <span aria-hidden>·</span>
        <span>{formatDate(doc.updatedAt)}</span>
      </div>
    </article>
  );
}

export function DetailPanel({ doc, docs, stages }: { doc: Doc; docs: Doc[]; stages: Place[] }) {
  const stage = doc.process ? (stages.find((s) => s.slug === doc.process)?.label ?? titleCase(doc.process)) : null;
  const rows: [string, React.ReactNode][] = [
    [copy.database.columns.type, copy.docTypes[doc.docType]],
    [copy.database.columns.client, doc.client ? titleCase(doc.client) : copy.explore.internal],
    [copy.database.columns.process, stage ?? "–"],
    [copy.database.columns.status, <StatusBadge key="s" state={doc.state} fromTeam={doc.fromTeam} />],
    [copy.database.columns.updated, formatDate(doc.updatedAt)],
    [copy.explore.published, doc.publishedAt ? formatDate(doc.publishedAt) : "–"],
  ];

  return (
    <aside aria-label={copy.explore.details} className="sticky top-4 rounded-2xl border border-grid bg-surface shadow-card">
      <div className="flex items-center gap-2 border-b border-grid px-4 py-3">
        <FileText size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-icon" />
        <Link href={docHref(doc.id)} className="min-w-0 truncate text-sm font-medium text-link hover:underline">
          {doc.title}
        </Link>
      </div>
      <div className="border-b border-grid px-4 py-3">
        <p className="text-xs font-semibold text-text">{copy.explore.description}</p>
        <p className="mt-1.5 text-sm text-text-2">{docSummary(doc, 400) || copy.explore.noBody}</p>
        <p className="mt-2 text-xs text-muted">{path(doc, docs).join(" › ")}</p>
      </div>
      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-text">{copy.explore.overview}</p>
        <dl className="mt-2 grid grid-cols-[96px_1fr] gap-y-2 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd className="min-w-0 truncate text-text">{v}</dd>
            </div>
          ))}
        </dl>
        <Link href={docHref(doc.id)} className="mt-4 flex h-9 items-center justify-center rounded-full bg-blue text-sm font-medium text-on-blue transition-opacity hover:opacity-90">
          {copy.explore.open}
        </Link>
      </div>
    </aside>
  );
}
