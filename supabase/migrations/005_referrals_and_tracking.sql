-- Referral codes
create table if not exists referral_codes (
  id serial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  code text unique not null,
  uses integer default 0,
  created_at timestamptz default now()
);

create unique index if not exists idx_referral_codes_user on referral_codes(user_id);

-- Referral redemptions
create table if not exists referral_redemptions (
  id serial primary key,
  code text not null references referral_codes(code),
  redeemed_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(redeemed_by)
);

-- Affiliate click tracking
create table if not exists affiliate_clicks (
  id serial primary key,
  tip_id integer references tips(id),
  bookmaker text not null,
  user_id uuid references auth.users(id),
  ip_hash text,
  created_at timestamptz default now()
);

create index if not exists idx_affiliate_clicks_tip on affiliate_clicks(tip_id);
create index if not exists idx_affiliate_clicks_bookmaker on affiliate_clicks(bookmaker, created_at desc);
