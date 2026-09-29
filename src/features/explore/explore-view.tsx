import { copy } from "@/content/site";
import { loadWorkspace } from "@/features/workspace/local";
import { titleCase } from "@/features/workspace/tree";
import { BrowsePane, DetailPanel, FilterBar, ResultCard, type Place } from "./explore-parts";
import { filterDocs, parseParams } from "./filter";

/**
 * Every document, local and shared, with filters that stack: type, client,
 * process, status, search and sort all live in the URL, so any view can be
 * linked to. Browse pane from 1024px, detail panel from 1360px (the sidebar
 * takes 270px of that), results only on a phone. Home and /explore both
 * render this.
 */
export async function ExploreView({ raw }: { raw: Record<string, string | string[] | undefined> }) {
  const docs = await loadWorkspace();
  const p = parseParams(raw);
  const results = filterDocs(docs, p);
  const selected = results.find((d) => d.id === p.doc) ?? results[0];

  const clients: Place[] = [...new Set(docs.map((d) => d.client).filter((c): c is string => Boolean(c)))]
    .sort()
    .map((slug) => ({ slug, label: titleCase(slug) }));
  const stages: Place[] = docs
    .filter((d) => d.docType === "sop" && d.process && !d.client)
    .sort((a, b) => (a.stageOrder ?? 99) - (b.stageOrder ?? 99))
    .map((d) => ({ slug: d.process!, label: d.title }));

  const ctx = { docs, p, clients, stages };

  return (
    <div className="flex flex-col gap-4 p-4 max-md:pt-16 group-data-[collapsed=true]/shell:pt-16 lg:p-6">
      <h1 className="sr-only">{copy.explore.title}</h1>
      <FilterBar {...ctx} total={results.length} />
      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] wide:grid-cols-[220px_minmax(0,1fr)_320px]">
        <div className="max-lg:hidden">
          <BrowsePane {...ctx} />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          {results.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line bg-surface px-4 py-10 text-center text-sm text-muted">{copy.explore.empty}</p>
          ) : (
            results.map((d) => <ResultCard key={d.id} doc={d} docs={docs} p={p} selected={d.id === selected?.id} />)
          )}
        </div>
        {selected && (
          <div className="max-wide:hidden">
            <DetailPanel doc={selected} docs={docs} stages={stages} />
          </div>
        )}
      </div>
    </div>
  );
}
