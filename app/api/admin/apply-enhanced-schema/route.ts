/**
 * API endpoint to apply enhanced database schema
 */

import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST() {
  try {

    // Add missing columns to existing tables
    await db.query(`
      ALTER TABLE verusid_statistics 
      ADD COLUMN IF NOT EXISTS friendly_name VARCHAR(255)
    `);

    await db.query(`
      ALTER TABLE block_analytics 
      ADD COLUMN IF NOT EXISTS chainstake VARCHAR(100),
      ADD COLUMN IF NOT EXISTS chain_stake_numeric DECIMAL(30,8),
      ADD COLUMN IF NOT EXISTS anchor VARCHAR(64),
      ADD COLUMN IF NOT EXISTS solution TEXT,
      ADD COLUMN IF NOT EXISTS reward_type VARCHAR(10)
    `);

    // Create network participation analytics table
    await db.query(`
      CREATE TABLE IF NOT EXISTS network_participation (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL UNIQUE,
        total_active_stakers INTEGER NOT NULL DEFAULT 0,
        total_stakes INTEGER NOT NULL DEFAULT 0,
        total_rewards_satoshis BIGINT NOT NULL DEFAULT 0,
        avg_stake_amount_satoshis BIGINT,
        avg_reward_amount_satoshis BIGINT,
        pos_blocks INTEGER NOT NULL DEFAULT 0,
        pow_blocks INTEGER NOT NULL DEFAULT 0,
        avg_block_interval DECIMAL(10,2),
        network_difficulty DECIMAL(20,8),
        stake_concentration_top10 DECIMAL(5,2),
        stake_concentration_top100 DECIMAL(5,2),
        gini_coefficient DECIMAL(5,4),
        herfindahl_index DECIMAL(10,4),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_network_participation_date 
      ON network_participation(date DESC)
    `);

    // Create currency analytics table
    await db.query(`
      CREATE TABLE IF NOT EXISTS currency_analytics (
        id SERIAL PRIMARY KEY,
        block_height INTEGER NOT NULL,
        currency_id VARCHAR(100) NOT NULL,
        currency_name VARCHAR(50),
        reserve_balance DECIMAL(30,8),
        chain_value DECIMAL(30,8),
        value_delta DECIMAL(30,8),
        transaction_count INTEGER DEFAULT 0,
        transfer_volume DECIMAL(30,8),
        conversion_volume DECIMAL(30,8),
        total_fees DECIMAL(30,8),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_currency_analytics_height 
      ON currency_analytics(block_height)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_currency_analytics_currency 
      ON currency_analytics(currency_id, block_height DESC)
    `);

    // Create UTXO health metrics table
    await db.query(`
      CREATE TABLE IF NOT EXISTS utxo_health_metrics (
        id SERIAL PRIMARY KEY,
        address VARCHAR(255) NOT NULL,
        snapshot_time TIMESTAMP NOT NULL,
        total_utxos INTEGER NOT NULL,
        eligible_utxos INTEGER NOT NULL,
        cooldown_utxos INTEGER NOT NULL,
        tiny_utxos INTEGER DEFAULT 0,
        small_utxos INTEGER DEFAULT 0,
        medium_utxos INTEGER DEFAULT 0,
        large_utxos INTEGER DEFAULT 0,
        avg_utxo_age_blocks INTEGER,
        avg_utxo_size_satoshis BIGINT,
        median_utxo_size_satoshis BIGINT,
        fragmentation_score DECIMAL(5,2),
        consolidation_recommendation TEXT,
        optimal_utxo_count INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_utxo_health_address 
      ON utxo_health_metrics(address, snapshot_time DESC)
    `);

    // Create staking predictions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS staking_predictions (
        id SERIAL PRIMARY KEY,
        address VARCHAR(255) NOT NULL,
        prediction_date TIMESTAMP NOT NULL,
        next_stake_probability DECIMAL(10,8),
        estimated_days_to_next_stake DECIMAL(10,2),
        predicted_reward_satoshis BIGINT,
        confidence_level DECIMAL(5,2),
        optimal_stake_time TIMESTAMP,
        recommended_action VARCHAR(50),
        factors JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_staking_predictions_address 
      ON staking_predictions(address, prediction_date DESC)
    `);

    // Create economic indicators table
    await db.query(`
      CREATE TABLE IF NOT EXISTS economic_indicators (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL UNIQUE,
        avg_apy DECIMAL(10,4),
        median_apy DECIMAL(10,4),
        max_apy DECIMAL(10,4),
        min_apy DECIMAL(10,4),
        total_staking_rewards_satoshis BIGINT,
        total_staked_value_satoshis BIGINT,
        network_staking_ratio DECIMAL(5,4),
        reward_volatility DECIMAL(10,4),
        difficulty_change_7d DECIMAL(10,4),
        difficulty_change_30d DECIMAL(10,4),
        participation_rate DECIMAL(5,2),
        stake_velocity DECIMAL(10,4),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_economic_indicators_date 
      ON economic_indicators(date DESC)
    `);

    // Create staker rankings table
    await db.query(`
      CREATE TABLE IF NOT EXISTS staker_rankings (
        id SERIAL PRIMARY KEY,
        ranking_date DATE NOT NULL,
        address VARCHAR(255) NOT NULL,
        friendly_name VARCHAR(255),
        category VARCHAR(50),
        rank INTEGER NOT NULL,
        total_stakes INTEGER,
        total_rewards_satoshis BIGINT,
        apy_30d DECIMAL(10,4),
        staking_efficiency DECIMAL(5,4),
        consistency_score DECIMAL(5,2),
        growth_rate_30d DECIMAL(10,4),
        percentile DECIMAL(5,2),
        badge VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(ranking_date, category, address)
      )
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_staker_rankings_date 
      ON staker_rankings(ranking_date DESC)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_staker_rankings_category 
      ON staker_rankings(category, rank)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_staker_rankings_address 
      ON staker_rankings(address, ranking_date DESC)
    `);

    // Create historical trends table
    await db.query(`
      CREATE TABLE IF NOT EXISTS historical_trends (
        id SERIAL PRIMARY KEY,
        metric_name VARCHAR(100) NOT NULL,
        metric_category VARCHAR(50),
        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,
        metric_value DECIMAL(30,8),
        change_amount DECIMAL(30,8),
        change_percent DECIMAL(10,4),
        trend_direction VARCHAR(20),
        volatility DECIMAL(10,4),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_historical_trends_metric 
      ON historical_trends(metric_name, period_start DESC)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_historical_trends_category 
      ON historical_trends(metric_category, period_start DESC)
    `);

    // Create block timing analytics table
    await db.query(`
      CREATE TABLE IF NOT EXISTS block_timing_analytics (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        hour INTEGER,
        total_blocks INTEGER NOT NULL DEFAULT 0,
        pos_blocks INTEGER NOT NULL DEFAULT 0,
        pow_blocks INTEGER NOT NULL DEFAULT 0,
        avg_block_time DECIMAL(10,2),
        median_block_time DECIMAL(10,2),
        min_block_time INTEGER,
        max_block_time INTEGER,
        block_time_variance DECIMAL(10,2),
        orphaned_blocks INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(date, hour)
      )
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_block_timing_date 
      ON block_timing_analytics(date DESC, hour)
    `);

    // Create stake competition metrics table
    await db.query(`
      CREATE TABLE IF NOT EXISTS stake_competition (
        id SERIAL PRIMARY KEY,
        block_height INTEGER NOT NULL,
        total_network_stake BIGINT,
        active_stakers INTEGER,
        winning_stake_amount BIGINT,
        winning_address VARCHAR(255),
        stake_difficulty DECIMAL(20,8),
        competition_index DECIMAL(10,4),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_stake_competition_height 
      ON stake_competition(block_height DESC)
    `);


    return NextResponse.json({
      success: true,
      message: 'Enhanced database schema applied successfully',
    });
  } catch (error: any) {
    console.error('[Schema] Error applying schema:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
