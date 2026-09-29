-- Crisp: the shared (published) layer.
--
-- Local documents live as markdown files on each person's machine. This
-- database holds only what has been published to the team. Publishing is an
-- upsert keyed on the same text id the local file carries in its frontmatter.
--
-- Security: row-level security on every table from this first migration.
-- Access is by membership in team_members, not by email domain. Rows are
-- added to team_members by an admin with the service role, never from the app.

-- ---------------------------------------------------------------- membership

create table public.team_members (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.team_members enable row level security;

-- security definer so policies can call it without granting direct reads of
-- team_members; search_path pinned so it cannot be hijacked.
create function public.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.team_members where user_id = auth.uid());
$$;

revoke all on function public.is_team_member() from public;
grant execute on function public.is_team_member() to authenticated;

create policy "members see the team"
  on public.team_members for select to authenticated
  using (public.is_team_member());

-- ---------------------------------------------------------------- structure

create table public.clients (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name       text not null,
  status     text not null default 'active' check (status in ('prospect', 'active', 'paused', 'closed')),
  created_at timestamptz not null default now()
);

create table public.processes (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name        text not null,
  stage_order int  not null unique
);

-- Phases follow Evercrisp's methodology: discovery once per client, then
-- implementation repeating one opportunity at a time.
create table public.engagements (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clients (id) on delete cascade,
  name       text not null,
  phase      text not null default 'intake'
             check (phase in ('intake', 'assessment', 'workshop', 'backlog', 'implementation')),
  started_at date not null default current_date
);

-- ---------------------------------------------------------------- documents

create table public.documents (
  id            text primary key check (length(id) between 1 and 200),
  title         text not null check (length(title) between 1 and 300),
  doc_type      text not null default 'note'
                check (doc_type in ('note', 'sop', 'skill', 'deliverable', 'decision')),
  client_id     uuid references public.clients (id) on delete set null,
  engagement_id uuid references public.engagements (id) on delete set null,
  process_id    uuid references public.processes (id) on delete set null,
  -- The markdown serialisation of all blocks, written on publish. It is what
  -- search indexes and what an agent reads; the blocks table is the structure.
  body_markdown text not null default '',
  local_path    text,
  published_at  timestamptz not null default now(),
  published_by  uuid references auth.users (id) on delete set null,
  search        tsvector generated always as (
                  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                  setweight(to_tsvector('english', coalesce(body_markdown, '')), 'B')
                ) stored
);

create index documents_search_idx on public.documents using gin (search);
create index documents_client_idx on public.documents (client_id);
create index documents_process_idx on public.documents (process_id);

create table public.blocks (
  id           uuid primary key default gen_random_uuid(),
  document_id  text not null references public.documents (id) on delete cascade,
  position     int  not null check (position >= 0),
  block_type   text not null
               check (block_type in ('markdown', 'image', 'file', 'table', 'video', 'gif', 'embed', 'chart')),
  content      jsonb not null default '{}'::jsonb,
  storage_path text,
  -- Deferrable so a reorder can swap positions inside one transaction.
  unique (document_id, position) deferrable initially deferred
);

create index blocks_document_idx on public.blocks (document_id, position);

create table public.decisions (
  id            uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements (id) on delete cascade,
  title         text not null,
  body          text not null default '',
  decided_on    date not null default current_date,
  decided_by    uuid references auth.users (id) on delete set null
);

-- ---------------------------------------------------------------- access

-- A small, trusted team: every member can read and write everything shared.
-- Nobody outside team_members sees a single row, signed in or not.
do $$
declare t text;
begin
  foreach t in array array['clients', 'processes', 'engagements', 'documents', 'blocks', 'decisions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "members read" on public.%I for select to authenticated using (public.is_team_member())', t);
    execute format('create policy "members insert" on public.%I for insert to authenticated with check (public.is_team_member())', t);
    execute format('create policy "members update" on public.%I for update to authenticated using (public.is_team_member()) with check (public.is_team_member())', t);
    execute format('create policy "members delete" on public.%I for delete to authenticated using (public.is_team_member())', t);
  end loop;
end $$;
