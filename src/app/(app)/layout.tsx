import { copy } from "@/content/site";
import { toEntry } from "@/features/search/rank";
import { SearchDialog } from "@/features/search/search-dialog";
import { ShellFrame } from "@/features/shell/shell-frame";
import { Sidebar } from "@/features/shell/sidebar";
import type { Doc } from "@/features/workspace/doc";
import { loadWorkspace } from "@/features/workspace/local";
import { buildTree, titleCase } from "@/features/workspace/tree";
import { isReadOnlyHost } from "@/lib/deploy";
import { createClient, hasSupabase } from "@/lib/supabase/server";

/**
 * The app shell: the Notion-style sidebar and the quick search dialog.
 * Everything under this route group sits behind the proxy's sign-in fence
 * (see src/proxy.ts), so by the time this renders there is a real session,
 * except when Supabase is not configured at all.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const docs = await loadWorkspace();
  const tree = buildTree(docs, copy.org);
  const stageTitle = (slug: string) =>
    docs.find((d) => d.docType === "sop" && d.process === slug && !d.client)?.title ?? titleCase(slug);
  const where = (d: Doc) =>
    d.state === "local"
      ? copy.sidebar.private
      : d.client
        ? [titleCase(d.client), d.process && stageTitle(d.process)].filter(Boolean).join(" · ")
        : d.process
          ? copy.sidebar.processes
          : copy.org;
  const searchIndex = docs.map((d) => toEntry(d, where(d)));

  // No Supabase configured: nobody is signed in and the proxy gates nothing.
  let userEmail: string | null = null;
  if (hasSupabase()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
  }

  return (
    <>
      <ShellFrame sidebar={<Sidebar tree={tree} userEmail={userEmail} writable={!isReadOnlyHost()} />}>{children}</ShellFrame>
      <SearchDialog entries={searchIndex} recentIds={tree.recents.map((d) => d.id)} />
    </>
  );
}
