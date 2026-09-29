-- SEED DATA. Evercrisp's four process stages, from evercrisp-process-docs.
-- Safe to re-run.
insert into public.processes (slug, name, stage_order) values
  ('intake', 'Intake', 1),
  ('assessment', 'Assessment', 2),
  ('workshop', 'Workshop', 3),
  ('backlog', 'Opportunity Backlog', 4)
on conflict (slug) do update set name = excluded.name, stage_order = excluded.stage_order;
