-- UTXO Database Schema for Verus Staking Analytics
-- This schema provides comprehensive UTXO tracking for accurate staking analysis

CREATE TABLE IF NOT EXISTS utxos (
  id SERIAL PRIMARY KEY,
  address VARCHAR(255) NOT NULL,
  txid VARCHAR(64) NOT NULL,
  vout INTEGER NOT NULL,
  value BIGINT NOT NULL, -- satoshis
  creation_height INTEGER,
  creation_time TIMESTAMP,
  last_stake_height INTEGER,
  last_stake_time TIMESTAMP,
  cooldown_until INTEGER,
  cooldown_until_time TIMESTAMP,
  is_spent BOOLEAN DEFAULT FALSE,
  spent_txid VARCHAR(64),
  spent_height INTEGER,
  spent_time TIMESTAMP,
  is_eligible BOOLEAN DEFAULT FALSE,
  staking_probability DECIMAL(10,8) DEFAULT 0,
  estimated_reward BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(txid, vout)
);

-- Indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_utxos_address ON utxos(address);
CREATE INDEX IF NOT EXISTS idx_utxos_eligible ON utxos(address, is_spent, is_eligible);
CREATE INDEX IF NOT EXISTS idx_utxos_cooldown ON utxos(address, cooldown_until);
CREATE INDEX IF NOT EXISTS idx_utxos_creation_height ON utxos(creation_height);
CREATE INDEX IF NOT EXISTS idx_utxos_value ON utxos(value);
CREATE INDEX IF NOT EXISTS idx_utxos_spent ON utxos(is_spent, spent_height);

-- Staking events table for tracking stake rewards
CREATE TABLE IF NOT EXISTS stake_events (
  id SERIAL PRIMARY KEY,
  utxo_id INTEGER REFERENCES utxos(id),
  address VARCHAR(255) NOT NULL,
  txid VARCHAR(64) NOT NULL,
  block_height INTEGER NOT NULL,
  block_time TIMESTAMP NOT NULL,
  reward_amount BIGINT NOT NULL, -- satoshis
  stake_amount BIGINT NOT NULL, -- satoshis
  stake_age INTEGER NOT NULL, -- blocks
  staking_probability DECIMAL(10,8) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stake_events_address ON stake_events(address);
CREATE INDEX IF NOT EXISTS idx_stake_events_block_height ON stake_events(block_height);
CREATE INDEX IF NOT EXISTS idx_stake_events_txid ON stake_events(txid);

-- UTXO analytics summary table
CREATE TABLE IF NOT EXISTS utxo_analytics (
  id SERIAL PRIMARY KEY,
  address VARCHAR(255) NOT NULL,
  total_utxos INTEGER NOT NULL,
  total_value BIGINT NOT NULL,
  eligible_utxos INTEGER NOT NULL,
  eligible_value BIGINT NOT NULL,
  average_stake_age INTEGER NOT NULL,
  staking_efficiency DECIMAL(5,4) NOT NULL,
  largest_utxo BIGINT NOT NULL,
  smallest_eligible BIGINT NOT NULL,
  total_staking_probability DECIMAL(10,8) NOT NULL,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(address)
);

CREATE INDEX IF NOT EXISTS idx_utxo_analytics_address ON utxo_analytics(address);
CREATE INDEX IF NOT EXISTS idx_utxo_analytics_last_updated ON utxo_analytics(last_updated);

-- Staking performance metrics
CREATE TABLE IF NOT EXISTS staking_performance (
  id SERIAL PRIMARY KEY,
  address VARCHAR(255) NOT NULL,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  total_stakes INTEGER NOT NULL,
  total_rewards BIGINT NOT NULL,
  average_stake_age INTEGER NOT NULL,
  staking_frequency DECIMAL(10,4) NOT NULL, -- stakes per day
  apy DECIMAL(8,4) NOT NULL,
  roi DECIMAL(8,4) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staking_performance_address ON staking_performance(address);
CREATE INDEX IF NOT EXISTS idx_staking_performance_period ON staking_performance(period_start, period_end);

-- Block analytics table for comprehensive block data
CREATE TABLE IF NOT EXISTS block_analytics (
  height INTEGER PRIMARY KEY,
  block_hash VARCHAR(64) NOT NULL UNIQUE,
  block_time TIMESTAMP NOT NULL,
  block_type VARCHAR(10), -- 'minted' (PoS) or 'mined' (PoW)
  difficulty DECIMAL(20,8),
  stake_modifier VARCHAR(64),
  chainwork VARCHAR(64),
  size INTEGER,
  tx_count INTEGER,
  stake_amount BIGINT, -- Amount staked (satoshis) for PoS blocks
  reward_amount BIGINT, -- Block reward (satoshis)
  total_fees BIGINT, -- Total transaction fees (satoshis)
  network_hashrate BIGINT,
  stake_weight BIGINT,
  coin_age_destroyed BIGINT,
  block_interval INTEGER, -- Seconds from previous block
  staker_address VARCHAR(255), -- Address that staked this block
  merkle_root VARCHAR(64),
  nonce VARCHAR(64),
  bits VARCHAR(64),
  version INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_block_analytics_height ON block_analytics(height);
CREATE INDEX IF NOT EXISTS idx_block_analytics_time ON block_analytics(block_time);
CREATE INDEX IF NOT EXISTS idx_block_analytics_type ON block_analytics(block_type);
CREATE INDEX IF NOT EXISTS idx_block_analytics_staker ON block_analytics(staker_address);
CREATE INDEX IF NOT EXISTS idx_block_analytics_hash ON block_analytics(block_hash);

-- VerusID comprehensive statistics table
CREATE TABLE IF NOT EXISTS verusid_statistics (
  id SERIAL PRIMARY KEY,
  address VARCHAR(255) NOT NULL UNIQUE,
  total_stakes INTEGER NOT NULL DEFAULT 0,
  total_rewards_satoshis BIGINT NOT NULL DEFAULT 0,
  first_stake_time TIMESTAMP,
  last_stake_time TIMESTAMP,
  apy_all_time DECIMAL(10,4),
  apy_yearly DECIMAL(10,4),
  apy_90d DECIMAL(10,4),
  apy_30d DECIMAL(10,4),
  apy_7d DECIMAL(10,4),
  roi_all_time DECIMAL(10,4),
  roi_yearly DECIMAL(10,4),
  avg_days_between_stakes DECIMAL(10,2),
  stakes_per_week DECIMAL(10,2),
  stakes_per_month DECIMAL(10,2),
  staking_efficiency DECIMAL(5,4),
  eligible_utxo_ratio DECIMAL(5,4),
  avg_stake_age INTEGER,
  avg_reward_amount_satoshis BIGINT,
  success_rate DECIMAL(5,4),
  current_utxos INTEGER DEFAULT 0,
  eligible_utxos INTEGER DEFAULT 0,
  cooldown_utxos INTEGER DEFAULT 0,
  total_value_satoshis BIGINT DEFAULT 0,
  eligible_value_satoshis BIGINT DEFAULT 0,
  largest_utxo_satoshis BIGINT DEFAULT 0,
  smallest_eligible_satoshis BIGINT DEFAULT 0,
  network_rank INTEGER,
  network_percentile DECIMAL(5,2),
  category_rank INTEGER,
  highest_reward_satoshis BIGINT,
  highest_reward_date TIMESTAMP,
  lowest_reward_satoshis BIGINT,
  longest_dry_spell_days INTEGER,
  current_streak_days INTEGER,
  best_month VARCHAR(7),
  best_month_rewards_satoshis BIGINT,
  worst_month VARCHAR(7),
  worst_month_rewards_satoshis BIGINT,
  reward_trend_7d VARCHAR(20),
  reward_trend_30d VARCHAR(20),
  efficiency_trend_7d VARCHAR(20),
  efficiency_trend_30d VARCHAR(20),
  apy_trend_7d VARCHAR(20),
  apy_trend_30d VARCHAR(20),
  last_calculated TIMESTAMP DEFAULT NOW(),
  data_completeness DECIMAL(5,2) DEFAULT 100.0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verusid_stats_address ON verusid_statistics(address);
CREATE INDEX IF NOT EXISTS idx_verusid_stats_total_rewards ON verusid_statistics(total_rewards_satoshis DESC);
CREATE INDEX IF NOT EXISTS idx_verusid_stats_network_rank ON verusid_statistics(network_rank);

-- Staking timeline for time-series data
CREATE TABLE IF NOT EXISTS staking_timeline (
  id SERIAL PRIMARY KEY,
  address VARCHAR(255) NOT NULL,
  period_type VARCHAR(10) NOT NULL,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  stake_count INTEGER NOT NULL DEFAULT 0,
  total_rewards_satoshis BIGINT NOT NULL DEFAULT 0,
  avg_reward_satoshis BIGINT,
  avg_stake_age INTEGER,
  apy DECIMAL(10,4),
  roi DECIMAL(10,4),
  staking_efficiency DECIMAL(5,4),
  reward_7d_avg BIGINT,
  reward_30d_avg BIGINT,
  reward_90d_avg BIGINT,
  apy_7d_avg DECIMAL(10,4),
  apy_30d_avg DECIMAL(10,4),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(address, period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_staking_timeline_address ON staking_timeline(address);
CREATE INDEX IF NOT EXISTS idx_staking_timeline_period ON staking_timeline(period_type, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_staking_timeline_address_period ON staking_timeline(address, period_type, period_start DESC);
