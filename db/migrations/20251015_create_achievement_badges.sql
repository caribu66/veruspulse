-- Achievement Badge System Tables
-- Migration: 20251015_create_achievement_badges.sql

-- Master list of all available achievement badges
CREATE TABLE IF NOT EXISTS achievement_definitions (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('milestone', 'performance', 'consistency', 'special', 'elite')),
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'legendary')),
    requirements JSONB NOT NULL,
    rarity VARCHAR(20) DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track which badges each VerusID has earned
CREATE TABLE IF NOT EXISTS verusid_achievements (
    id BIGSERIAL PRIMARY KEY,
    identity_address VARCHAR(255) NOT NULL REFERENCES identities(identity_address) ON DELETE CASCADE,
    achievement_slug VARCHAR(100) NOT NULL REFERENCES achievement_definitions(slug) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ NOT NULL,
    unlock_value NUMERIC DEFAULT NULL, -- For milestone tracking (e.g., 100 stakes, 50 VRSC reward)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(identity_address, achievement_slug)
);

-- Track progress toward badges that haven't been earned yet
CREATE TABLE IF NOT EXISTS achievement_progress (
    id BIGSERIAL PRIMARY KEY,
    identity_address VARCHAR(255) NOT NULL REFERENCES identities(identity_address) ON DELETE CASCADE,
    achievement_slug VARCHAR(100) NOT NULL REFERENCES achievement_definitions(slug) ON DELETE CASCADE,
    current_value NUMERIC DEFAULT 0,
    target_value NUMERIC NOT NULL,
    percentage NUMERIC(5,2) DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(identity_address, achievement_slug)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_achievement_definitions_category ON achievement_definitions(category);
CREATE INDEX IF NOT EXISTS idx_achievement_definitions_tier ON achievement_definitions(tier);
CREATE INDEX IF NOT EXISTS idx_achievement_definitions_active ON achievement_definitions(is_active);

CREATE INDEX IF NOT EXISTS idx_verusid_achievements_address ON verusid_achievements(identity_address);
CREATE INDEX IF NOT EXISTS idx_verusid_achievements_unlocked ON verusid_achievements(unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_verusid_achievements_slug ON verusid_achievements(achievement_slug);

CREATE INDEX IF NOT EXISTS idx_achievement_progress_address ON achievement_progress(identity_address);
CREATE INDEX IF NOT EXISTS idx_achievement_progress_percentage ON achievement_progress(percentage DESC);

-- Function to update achievement progress percentage
CREATE OR REPLACE FUNCTION update_achievement_progress()
RETURNS TRIGGER AS $$
BEGIN
    NEW.percentage = CASE 
        WHEN NEW.target_value > 0 THEN 
            LEAST(100, (NEW.current_value / NEW.target_value) * 100)
        ELSE 0
    END;
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update progress percentage
CREATE TRIGGER trigger_update_achievement_progress
    BEFORE INSERT OR UPDATE ON achievement_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_achievement_progress();

-- Function to update achievement_definitions updated_at
CREATE OR REPLACE FUNCTION update_achievement_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_achievement_definitions_updated_at
    BEFORE UPDATE ON achievement_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_achievement_definitions_updated_at();

-- Comments for documentation
COMMENT ON TABLE achievement_definitions IS 'Master list of all available achievement badges with metadata';
COMMENT ON TABLE verusid_achievements IS 'Tracks which badges each VerusID has earned with unlock timestamps';
COMMENT ON TABLE achievement_progress IS 'Tracks progress toward badges that haven''t been earned yet';

COMMENT ON COLUMN achievement_definitions.requirements IS 'JSON object containing the conditions needed to unlock this badge';
COMMENT ON COLUMN verusid_achievements.unlock_value IS 'The actual value that triggered the unlock (e.g., 100 for 100th stake)';
COMMENT ON COLUMN achievement_progress.current_value IS 'Current progress toward the target';
COMMENT ON COLUMN achievement_progress.target_value IS 'Required value to unlock the badge';
