-- Admin flag on profiles
alter table profiles add column if not exists is_admin boolean default false;

-- Pipeline run log
create table if not exists pipeline_runs (
  id serial primary key,
  job text not null,
  status text not null check (status in ('success', 'error')),
  result jsonb,
  duration_ms integer,
  created_at timestamptz default now()
);

create index if not exists idx_pipeline_runs_created on pipeline_runs(created_at desc);
create index if not exists idx_pipeline_runs_job on pipeline_runs(job, created_at desc);
