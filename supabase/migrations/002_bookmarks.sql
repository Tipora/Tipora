-- User tip bookmarks
create table if not exists tip_bookmarks (
  id serial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tip_id integer not null references tips(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, tip_id)
);

create index if not exists idx_tip_bookmarks_user on tip_bookmarks(user_id);

alter table tip_bookmarks enable row level security;

create policy "Users can view own bookmarks"
  on tip_bookmarks for select
  using (auth.uid() = user_id);

create policy "Users can insert own bookmarks"
  on tip_bookmarks for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own bookmarks"
  on tip_bookmarks for delete
  using (auth.uid() = user_id);
