-- Web push notification subscriptions
create table if not exists push_subscriptions (
  id serial primary key,
  endpoint text unique not null,
  keys jsonb not null,
  created_at timestamptz default now()
);

create index if not exists idx_push_subs_endpoint on push_subscriptions(endpoint);

-- RLS: service_role only (push is managed by server)
alter table push_subscriptions enable row level security;
