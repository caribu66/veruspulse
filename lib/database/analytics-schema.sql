-- Analytics Database Schema for Verus Explorer
-- Tracks views, searches, and trending data

-- View Analytics: Track how many times items are viewed
CREATE TABLE IF NOT EXISTS view_analytics (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL, -- 'block', 'verusid', 'address', 'transaction'
  entity_id VARCHAR(255) NOT NULL,
  view_count INTEGER DEFAULT 0,
  unique_views INTEGER DEFAULT 0, -- IP-based unique views
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_type, entity_id)
);

CREATE INDEX idx_view_analytics_entity ON view_analytics(entity_type, entity_id);
CREATE INDEX idx_view_analytics_view_count ON view_analytics(view_count DESC);
CREATE INDEX idx_view_analytics_last_viewed ON view_analytics(last_viewed_at DESC);

-- View History: Track individual views for trending analysis
CREATE TABLE IF NOT EXISTS view_history (
  id BIGSERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_view_history_entity ON view_history(entity_type, entity_id, viewed_at DESC);
CREATE INDEX idx_view_history_viewed_at ON view_history(viewed_at DESC);

-- Search Analytics: Track search queries
CREATE TABLE IF NOT EXISTS search_analytics (
  id SERIAL PRIMARY KEY,
  search_query TEXT NOT NULL,
  search_type VARCHAR(50) NOT NULL, -- 'block', 'verusid', 'address', 'transaction', 'general'
  result_count INTEGER DEFAULT 0,
  search_count INTEGER DEFAULT 1,
  first_searched_at TIMESTAMPTZ DEFAULT NOW(),
  last_searched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_search_analytics_query ON search_analytics(search_query);
CREATE INDEX idx_search_analytics_search_count ON search_analytics(search_count DESC);
CREATE INDEX idx_search_analytics_last_searched ON search_analytics(last_searched_at DESC);

-- Trending Data: Pre-computed trending scores
CREATE TABLE IF NOT EXISTS trending_scores (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  score_24h DECIMAL(10,2) DEFAULT 0,
  score_7d DECIMAL(10,2) DEFAULT 0,
  score_30d DECIMAL(10,2) DEFAULT 0,
  trend_direction VARCHAR(10) DEFAULT 'stable', -- 'up', 'down', 'stable'
  trend_percentage DECIMAL(5,2) DEFAULT 0,
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_type, entity_id)
);

CREATE INDEX idx_trending_scores_entity ON trending_scores(entity_type, entity_id);
CREATE INDEX idx_trending_scores_24h ON trending_scores(score_24h DESC);
CREATE INDEX idx_trending_scores_7d ON trending_scores(score_7d DESC);
CREATE INDEX idx_trending_scores_30d ON trending_scores(score_30d DESC);

-- Function to update view count
CREATE OR REPLACE FUNCTION update_view_count(
  p_entity_type VARCHAR(50),
  p_entity_id VARCHAR(255)
) RETURNS VOID AS $$
BEGIN
  INSERT INTO view_analytics (entity_type, entity_id, view_count, unique_views, last_viewed_at)
  VALUES (p_entity_type, p_entity_id, 1, 1, NOW())
  ON CONFLICT (entity_type, entity_id) 
  DO UPDATE SET 
    view_count = view_analytics.view_count + 1,
    last_viewed_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to record view history
CREATE OR REPLACE FUNCTION record_view_history(
  p_entity_type VARCHAR(50),
  p_entity_id VARCHAR(255),
  p_ip_address INET,
  p_user_agent TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO view_history (entity_type, entity_id, ip_address, user_agent)
  VALUES (p_entity_type, p_entity_id, p_ip_address, p_user_agent);
END;
$$ LANGUAGE plpgsql;

-- Function to update search analytics
CREATE OR REPLACE FUNCTION update_search_analytics(
  p_search_query TEXT,
  p_search_type VARCHAR(50),
  p_result_count INTEGER
) RETURNS VOID AS $$
BEGIN
  INSERT INTO search_analytics (search_query, search_type, result_count, search_count, last_searched_at)
  VALUES (p_search_query, p_search_type, p_result_count, 1, NOW())
  ON CONFLICT (search_query, search_type)
  DO UPDATE SET 
    search_count = search_analytics.search_count + 1,
    result_count = p_result_count,
    last_searched_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to calculate trending scores
CREATE OR REPLACE FUNCTION calculate_trending_scores() RETURNS VOID AS $$
BEGIN
  -- Calculate 24h trending score
  UPDATE trending_scores ts
  SET 
    score_24h = (
      SELECT COUNT(*) * 10 + COALESCE(SUM(
        CASE 
          WHEN vh.viewed_at > NOW() - INTERVAL '24 hours' THEN 1
          ELSE 0
        END
      ), 0) * 5
      FROM view_history vh
      WHERE vh.entity_type = ts.entity_type 
        AND vh.entity_id = ts.entity_id
        AND vh.viewed_at > NOW() - INTERVAL '24 hours'
    ),
    score_7d = (
      SELECT COUNT(*) * 5 + COALESCE(SUM(
        CASE 
          WHEN vh.viewed_at > NOW() - INTERVAL '7 days' THEN 1
          ELSE 0
        END
      ), 0) * 2
      FROM view_history vh
      WHERE vh.entity_type = ts.entity_type 
        AND vh.entity_id = ts.entity_id
        AND vh.viewed_at > NOW() - INTERVAL '7 days'
    ),
    score_30d = (
      SELECT COUNT(*) * 2 + COALESCE(SUM(
        CASE 
          WHEN vh.viewed_at > NOW() - INTERVAL '30 days' THEN 1
          ELSE 0
        END
      ), 0) * 1
      FROM view_history vh
      WHERE vh.entity_type = ts.entity_type 
        AND vh.entity_id = ts.entity_id
        AND vh.viewed_at > NOW() - INTERVAL '30 days'
    ),
    last_calculated_at = NOW(),
    updated_at = NOW();
  
  -- Update trend direction
  UPDATE trending_scores
  SET 
    trend_direction = CASE
      WHEN score_24h > LAG(score_7d) OVER (PARTITION BY entity_type, entity_id ORDER BY last_calculated_at) THEN 'up'
      WHEN score_24h < LAG(score_7d) OVER (PARTITION BY entity_type, entity_id ORDER BY last_calculated_at) THEN 'down'
      ELSE 'stable'
    END,
    trend_percentage = CASE
      WHEN LAG(score_7d) OVER (PARTITION BY entity_type, entity_id ORDER BY last_calculated_at) > 0 THEN
        ((score_24h - LAG(score_7d) OVER (PARTITION BY entity_type, entity_id ORDER BY last_calculated_at)) / 
         LAG(score_7d) OVER (PARTITION BY entity_type, entity_id ORDER BY last_calculated_at)) * 100
      ELSE 0
    END
  WHERE last_calculated_at > NOW() - INTERVAL '1 minute';
END;
$$ LANGUAGE plpgsql;

-- Clean up old view history (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_view_history() RETURNS VOID AS $$
BEGIN
  DELETE FROM view_history
  WHERE viewed_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;
