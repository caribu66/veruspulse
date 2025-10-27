-- Analytics and View Tracking Schema for VerusID Trending
-- This schema supports trend calculation, view tracking, and performance metrics

-- VerusID view tracking table
CREATE TABLE IF NOT EXISTS verusid_views (
  id SERIAL PRIMARY KEY,
  verusid_address VARCHAR(255) NOT NULL,
  view_date TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  session_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for view tracking
CREATE INDEX IF NOT EXISTS idx_verusid_views_address ON verusid_views(verusid_address);
CREATE INDEX IF NOT EXISTS idx_verusid_views_date ON verusid_views(view_date DESC);
CREATE INDEX IF NOT EXISTS idx_verusid_views_address_date ON verusid_views(verusid_address, view_date DESC);

-- Daily view aggregation table
CREATE TABLE IF NOT EXISTS verusid_daily_views (
  id SERIAL PRIMARY KEY,
  verusid_address VARCHAR(255) NOT NULL,
  view_date DATE NOT NULL,
  total_views INTEGER NOT NULL DEFAULT 0,
  unique_views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(verusid_address, view_date)
);

CREATE INDEX IF NOT EXISTS idx_verusid_daily_views_address ON verusid_daily_views(verusid_address);
CREATE INDEX IF NOT EXISTS idx_verusid_daily_views_date ON verusid_daily_views(view_date DESC);

-- VerusID trend metrics table
CREATE TABLE IF NOT EXISTS verusid_trend_metrics (
  id SERIAL PRIMARY KEY,
  verusid_address VARCHAR(255) NOT NULL UNIQUE,
  -- Recent activity (last 7 days)
  recent_stakes_7d INTEGER DEFAULT 0,
  recent_rewards_7d BIGINT DEFAULT 0,
  recent_views_7d INTEGER DEFAULT 0,
  -- Historical baseline (previous 7 days)
  baseline_stakes_7d INTEGER DEFAULT 0,
  baseline_rewards_7d BIGINT DEFAULT 0,
  baseline_views_7d INTEGER DEFAULT 0,
  -- Trend calculations
  stake_trend_percent DECIMAL(10,2) DEFAULT 0,
  reward_trend_percent DECIMAL(10,2) DEFAULT 0,
  view_trend_percent DECIMAL(10,2) DEFAULT 0,
  overall_trend_score DECIMAL(10,2) DEFAULT 0,
  -- Performance metrics
  apy_7d DECIMAL(10,4) DEFAULT 0,
  apy_30d DECIMAL(10,4) DEFAULT 0,
  staking_efficiency DECIMAL(5,4) DEFAULT 0,
  -- Metadata
  last_calculated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verusid_trend_address ON verusid_trend_metrics(verusid_address);
CREATE INDEX IF NOT EXISTS idx_verusid_trend_score ON verusid_trend_metrics(overall_trend_score DESC);
CREATE INDEX IF NOT EXISTS idx_verusid_trend_calculated ON verusid_trend_metrics(last_calculated DESC);

-- Function to calculate trend percentage
CREATE OR REPLACE FUNCTION calculate_trend_percent(current_value NUMERIC, baseline_value NUMERIC)
RETURNS DECIMAL(10,2) AS $$
BEGIN
  IF baseline_value = 0 THEN
    RETURN CASE WHEN current_value > 0 THEN 100.0 ELSE 0.0 END;
  END IF;
  
  RETURN ROUND(((current_value - baseline_value) / baseline_value) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to update daily view aggregation
CREATE OR REPLACE FUNCTION update_daily_views()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO verusid_daily_views (verusid_address, view_date, total_views, unique_views)
  VALUES (NEW.verusid_address, CURRENT_DATE, 1, 1)
  ON CONFLICT (verusid_address, view_date)
  DO UPDATE SET
    total_views = verusid_daily_views.total_views + 1,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update daily views
CREATE TRIGGER trigger_update_daily_views
  AFTER INSERT ON verusid_views
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_views();

-- Function to calculate trend metrics for a VerusID
CREATE OR REPLACE FUNCTION calculate_verusid_trends(target_address VARCHAR(255))
RETURNS VOID AS $$
DECLARE
  recent_stakes INTEGER;
  recent_rewards BIGINT;
  recent_views INTEGER;
  baseline_stakes INTEGER;
  baseline_rewards BIGINT;
  baseline_views INTEGER;
  stake_trend DECIMAL(10,2);
  reward_trend DECIMAL(10,2);
  view_trend DECIMAL(10,2);
  overall_score DECIMAL(10,2);
BEGIN
  -- Get recent activity (last 7 days)
  SELECT 
    COALESCE(COUNT(*), 0),
    COALESCE(SUM(amount_sats), 0)
  INTO recent_stakes, recent_rewards
  FROM staking_rewards 
  WHERE identity_address = target_address 
    AND block_time >= NOW() - INTERVAL '7 days';
  
  -- Get recent views (last 7 days)
  SELECT COALESCE(SUM(total_views), 0)
  INTO recent_views
  FROM verusid_daily_views
  WHERE verusid_address = target_address 
    AND view_date >= CURRENT_DATE - INTERVAL '7 days';
  
  -- Get baseline activity (previous 7 days)
  SELECT 
    COALESCE(COUNT(*), 0),
    COALESCE(SUM(amount_sats), 0)
  INTO baseline_stakes, baseline_rewards
  FROM staking_rewards 
  WHERE identity_address = target_address 
    AND block_time >= NOW() - INTERVAL '14 days'
    AND block_time < NOW() - INTERVAL '7 days';
  
  -- Get baseline views (previous 7 days)
  SELECT COALESCE(SUM(total_views), 0)
  INTO baseline_views
  FROM verusid_daily_views
  WHERE verusid_address = target_address 
    AND view_date >= CURRENT_DATE - INTERVAL '14 days'
    AND view_date < CURRENT_DATE - INTERVAL '7 days';
  
  -- Calculate trend percentages
  stake_trend := calculate_trend_percent(recent_stakes, baseline_stakes);
  reward_trend := calculate_trend_percent(recent_rewards, baseline_rewards);
  view_trend := calculate_trend_percent(recent_views, baseline_views);
  
  -- Calculate overall trend score (weighted average)
  overall_score := (stake_trend * 0.4 + reward_trend * 0.4 + view_trend * 0.2);
  
  -- Insert or update trend metrics
  INSERT INTO verusid_trend_metrics (
    verusid_address, recent_stakes_7d, recent_rewards_7d, recent_views_7d,
    baseline_stakes_7d, baseline_rewards_7d, baseline_views_7d,
    stake_trend_percent, reward_trend_percent, view_trend_percent, overall_trend_score,
    last_calculated
  ) VALUES (
    target_address, recent_stakes, recent_rewards, recent_views,
    baseline_stakes, baseline_rewards, baseline_views,
    stake_trend, reward_trend, view_trend, overall_score,
    NOW()
  )
  ON CONFLICT (verusid_address)
  DO UPDATE SET
    recent_stakes_7d = EXCLUDED.recent_stakes_7d,
    recent_rewards_7d = EXCLUDED.recent_rewards_7d,
    recent_views_7d = EXCLUDED.recent_views_7d,
    baseline_stakes_7d = EXCLUDED.baseline_stakes_7d,
    baseline_rewards_7d = EXCLUDED.baseline_rewards_7d,
    baseline_views_7d = EXCLUDED.baseline_views_7d,
    stake_trend_percent = EXCLUDED.stake_trend_percent,
    reward_trend_percent = EXCLUDED.reward_trend_percent,
    view_trend_percent = EXCLUDED.view_trend_percent,
    overall_trend_score = EXCLUDED.overall_trend_score,
    last_calculated = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;