-- Seed Achievement Badge Definitions
-- This script populates the achievement_definitions table with 25+ badges

-- Clear existing definitions (for fresh seeding)
TRUNCATE TABLE achievement_definitions CASCADE;

-- Milestone Badges (7 badges)
INSERT INTO achievement_definitions (slug, name, description, icon, category, tier, requirements, rarity) VALUES
('first_stake', 'First Stake', 'Earned your very first staking reward', 'target', 'milestone', 'bronze', '{"type": "stake_count", "operator": ">=", "value": 1}', 'common'),
('century_club', 'Century Club', 'Achieved 100 staking rewards', 'award', 'milestone', 'silver', '{"type": "stake_count", "operator": ">=", "value": 100}', 'uncommon'),
('elite_staker', 'Elite Staker', 'Earned 500 staking rewards', 'trophy', 'milestone', 'gold', '{"type": "stake_count", "operator": ">=", "value": 500}', 'rare'),
('legendary_staker', 'Legendary Staker', 'Achieved 1,000 staking rewards', 'crown', 'milestone', 'platinum', '{"type": "stake_count", "operator": ">=", "value": 1000}', 'epic'),
('master_staker', 'Master Staker', 'Earned 5,000 staking rewards', 'star', 'milestone', 'legendary', '{"type": "stake_count", "operator": ">=", "value": 5000}', 'legendary'),
('reward_collector', 'Reward Collector', 'Accumulated 100 VRSC in total rewards', 'coins', 'milestone', 'gold', '{"type": "total_rewards", "operator": ">=", "value": 100}', 'rare'),
('whale', 'Whale', 'Accumulated 10,000 VRSC in total rewards', 'gem', 'milestone', 'legendary', '{"type": "total_rewards", "operator": ">=", "value": 10000}', 'legendary');

-- Performance Badges (6 badges)
INSERT INTO achievement_definitions (slug, name, description, icon, category, tier, requirements, rarity) VALUES
('efficiency_expert', 'Efficiency Expert', 'Maintained high staking efficiency (>0.5 stakes/day)', 'zap', 'performance', 'silver', '{"type": "staking_efficiency", "operator": ">=", "value": 0.5}', 'uncommon'),
('high_roller', 'High Roller', 'Received a single reward of 50+ VRSC', 'trending-up', 'performance', 'gold', '{"type": "highest_reward", "operator": ">=", "value": 50}', 'rare'),
('consistency_king', 'Consistency King', 'Maintained >2 stakes per week for 30 days', 'activity', 'performance', 'gold', '{"type": "consistency_streak", "operator": ">=", "value": 30}', 'rare'),
('apy_master', 'APY Master', 'Achieved sustained high APY (>50%)', 'flame', 'performance', 'platinum', '{"type": "apy_sustained", "operator": ">=", "value": 50, "period": "30d"}', 'epic'),
('perfect_week', 'Perfect Week', 'Staked every single day for 7 days', 'calendar-check', 'performance', 'gold', '{"type": "consecutive_days", "operator": ">=", "value": 7}', 'rare'),
('lucky_strike', 'Lucky Strike', 'Received one of the top 10% highest rewards', 'sparkles', 'performance', 'platinum', '{"type": "reward_percentile", "operator": ">=", "value": 90}', 'epic');

-- Time-Based Badges (5 badges)
INSERT INTO achievement_definitions (slug, name, description, icon, category, tier, requirements, rarity) VALUES
('veteran', 'Veteran', 'Been staking for over 1 year', 'clock', 'consistency', 'silver', '{"type": "days_active", "operator": ">=", "value": 365}', 'uncommon'),
('ancient', 'Ancient', 'Been staking for over 3 years', 'history', 'consistency', 'gold', '{"type": "days_active", "operator": ">=", "value": 1095}', 'rare'),
('immortal', 'Immortal', 'Been staking for over 5 years', 'hourglass', 'consistency', 'platinum', '{"type": "days_active", "operator": ">=", "value": 1825}', 'epic'),
('early_adopter', 'Early Adopter', 'Started staking before 2021', 'calendar', 'special', 'gold', '{"type": "first_stake_before", "operator": "<", "value": "2021-01-01"}', 'rare'),
('marathon_runner', 'Marathon Runner', 'Staked for 365 consecutive days', 'timer', 'consistency', 'platinum', '{"type": "consecutive_days", "operator": ">=", "value": 365}', 'epic');

-- Special Badges (6 badges)
INSERT INTO achievement_definitions (slug, name, description, icon, category, tier, requirements, rarity) VALUES
('new_year_staker', 'New Year Staker', 'Staked on New Year''s Day', 'gift', 'special', 'bronze', '{"type": "staked_on_date", "value": "01-01"}', 'common'),
('monthly_champion', 'Monthly Champion', 'Had your best staking month ever', 'medal', 'special', 'gold', '{"type": "best_month_achieved", "operator": ">=", "value": 1}', 'rare'),
('comeback_kid', 'Comeback Kid', 'Returned to staking after 90+ days of inactivity', 'refresh-cw', 'special', 'silver', '{"type": "returned_after_dry_spell", "operator": ">=", "value": 90}', 'uncommon'),
('diamond_hands', 'Diamond Hands', 'No gaps longer than 7 days for 180 days', 'diamond', 'special', 'platinum', '{"type": "max_gap_period", "operator": "<=", "value": 7, "period": 180}', 'epic'),
('network_elite', 'Network Elite', 'Ranked in top 10% of all stakers', 'crown', 'special', 'platinum', '{"type": "network_percentile", "operator": ">=", "value": 90}', 'epic'),
('founding_member', 'Founding Member', 'One of the first 1000 VerusID stakers', 'users', 'special', 'legendary', '{"type": "early_staker_rank", "operator": "<=", "value": 1000}', 'legendary');

-- Elite Badges (3 badges)
INSERT INTO achievement_definitions (slug, name, description, icon, category, tier, requirements, rarity) VALUES
('triple_crown', 'Triple Crown', 'Top 3 in stakes, rewards, and efficiency', 'award', 'elite', 'legendary', '{"type": "triple_crown", "requirements": ["stakes_top3", "rewards_top3", "efficiency_top3"]}', 'legendary'),
('genesis', 'Genesis', 'One of the first 100 VerusID stakers', 'star', 'elite', 'legendary', '{"type": "early_staker_rank", "operator": "<=", "value": 100}', 'legendary'),
('perfect_year', 'Perfect Year', 'Staked at least once every month for 12 months', 'calendar-days', 'elite', 'legendary', '{"type": "months_active", "operator": ">=", "value": 12, "consecutive": true}', 'legendary');

-- Show summary
SELECT 
    '=== ACHIEVEMENT BADGES SEEDED ===' as status,
    COUNT(*) as total_badges,
    COUNT(CASE WHEN category = 'milestone' THEN 1 END) as milestone_badges,
    COUNT(CASE WHEN category = 'performance' THEN 1 END) as performance_badges,
    COUNT(CASE WHEN category = 'consistency' THEN 1 END) as consistency_badges,
    COUNT(CASE WHEN category = 'special' THEN 1 END) as special_badges,
    COUNT(CASE WHEN category = 'elite' THEN 1 END) as elite_badges
FROM achievement_definitions;

-- Show badges by tier
SELECT 
    '=== BADGES BY TIER ===' as status,
    tier,
    COUNT(*) as count,
    STRING_AGG(name, ', ' ORDER BY name) as badges
FROM achievement_definitions
GROUP BY tier
ORDER BY 
    CASE tier 
        WHEN 'bronze' THEN 1 
        WHEN 'silver' THEN 2 
        WHEN 'gold' THEN 3 
        WHEN 'platinum' THEN 4 
        WHEN 'legendary' THEN 5 
    END;

-- Show badges by rarity
SELECT 
    '=== BADGES BY RARITY ===' as status,
    rarity,
    COUNT(*) as count
FROM achievement_definitions
GROUP BY rarity
ORDER BY 
    CASE rarity 
        WHEN 'common' THEN 1 
        WHEN 'uncommon' THEN 2 
        WHEN 'rare' THEN 3 
        WHEN 'epic' THEN 4 
        WHEN 'legendary' THEN 5 
    END;
