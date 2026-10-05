-- Comments: anchored to a span of text in a published document's body.
--
-- Anchoring follows the W3C Web Annotation "text quote" selector: the
-- selected text itself (`quote`) plus a little surrounding context (`prefix`,
-- `suffix`). The app re-locates the quote in the rendered text at read time
-- rather than trusting a stored offset, so a comment still finds its place
-- after small edits elsewhere in the document; only an edit to the quoted
-- text itself orphans it (it still lists in the Comments tab, just unmarked).
--
-- Comments only ever attach to a published document (the foreign key), so
-- "can I comment here" is exactly "has this document been published", with
-- no separate permission to track.
create table public.comments (
  id           uuid primary key default gen_random_uuid(),
  document_id  text not null references public.documents (id) on delete cascade,
  author_id    uuid references auth.users (id) on delete set null,
  -- Denormalised from auth.users at insert time (the API never exposes that
  -- table directly), so the thread can show who wrote a comment without a
  -- second cross-schema lookup.
  author_email text,
  quote        text not null check (length(quote) between 1 and 2000),
  prefix       text not null default '',
  suffix       text not null default '',
  body         text not null check (length(body) between 1 and 10000),
  created_at   timestamptz not null default now()
);

create index comments_document_idx on public.comments (document_id, created_at);

alter table public.comments enable row level security;

create policy "members read" on public.comments for select to authenticated using (public.is_team_member());
create policy "members insert" on public.comments for insert to authenticated with check (public.is_team_member());
create policy "members update" on public.comments for update to authenticated using (public.is_team_member()) with check (public.is_team_member());
create policy "members delete" on public.comments for delete to authenticated using (public.is_team_member());
