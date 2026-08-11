-- Soles: completed trips remain memories, but accept normal member writes by default.

alter table public.trips
  alter column allow_completed_edits set default true;

update public.trips
set allow_completed_edits = true
where status = 'completed'
  and deleted_at is null
  and allow_completed_edits = false;

comment on column public.trips.allow_completed_edits is
  'Defaults to enabled so completed trips remain editable memories; an owner may still disable it explicitly.';
