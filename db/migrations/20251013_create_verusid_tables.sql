-- Identities table holds canonical I-address and friendly metadata
create table if not exists identities (
  identity_address text primary key,
  base_name text,
  friendly_name text,
  first_seen_block int,
  last_scanned_block int,
  last_scanned_hash text,
  last_refreshed_at timestamptz default now()
);

-- Raw staking rewards, amounts in satoshis
create table if not exists staking_rewards (
  id bigserial primary key,
  identity_address text not null references identities(identity_address) on delete cascade,
  txid text not null,
  vout int not null,
  block_height int not null,
  block_hash text not null,
  block_time timestamptz not null,
  amount_sats bigint not null,
  classifier text not null,
  source_address text,
  unique (txid, vout)
);
create index if not exists ix_rewards_identity_height on staking_rewards(identity_address, block_height desc);

-- Daily aggregates (create as materialized view if supported by your deployment process)
drop materialized view if exists staking_daily;
create materialized view staking_daily as
select identity_address,
       date_trunc('day', block_time) as day,
       count(*) as rewards,
       sum(amount_sats) as total_sats
from staking_rewards
group by 1,2;
create index if not exists ix_daily_identity_day on staking_daily(identity_address, day desc);

-- Sync bookkeeping per identity
create table if not exists identity_sync_state (
  identity_address text primary key references identities(identity_address) on delete cascade,
  backfill_completed boolean default false,
  last_confirmed_height int,
  updated_at timestamptz default now()
);


