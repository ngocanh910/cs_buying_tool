create table if not exists schema_migrations (
  migration_id text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists accounts (
  account_id text primary key,
  live_trading_enabled boolean not null default false,
  dry_run boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists command_records (
  command_id text primary key,
  account_id text not null references accounts(account_id),
  command_kind text not null check (command_kind in ('buy', 'bid', 'accept_trade')),
  dry_run boolean not null default true,
  status text not null check (status in ('proposed', 'persisted', 'sending', 'confirmed', 'rejected', 'unknown', 'reconciling', 'manual_review')),
  correlation_id text not null,
  unknown_reason text,
  redacted_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists auction_snapshots (
  auction_id text primary key,
  item_id text not null,
  version integer not null,
  ends_at timestamptz not null,
  redacted_snapshot jsonb not null,
  updated_at timestamptz not null
);

create table if not exists pending_purchases (
  purchase_id text primary key,
  account_id text not null references accounts(account_id),
  expected_partner_steam_id64 text not null,
  expected_asset_ids text[] not null,
  processed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists audit_events (
  event_id bigserial primary key,
  event_type text not null,
  occurred_at timestamptz not null,
  redacted_payload jsonb not null default '{}'::jsonb
);
