import { type NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { AchievementService } from '@/lib/services/achievement-service';

// Initialize database connection
let dbPool: Pool | null = null;

function getDbPool() {
  if (!dbPool && process.env.DATABASE_URL) {
    dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return dbPool;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ iaddr: string }> }
) {
  try {
    const { iaddr } = await params;

    if (!iaddr) {
      return NextResponse.json(
        { success: false, error: 'I-address is required' },
        { status: 400 }
      );
    }

    // Check if UTXO database is enabled
    const dbEnabled = process.env.UTXO_DATABASE_ENABLED === 'true';
    if (!dbEnabled || !process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          success: false,
          error: 'UTXO database not enabled',
          message:
            'Set UTXO_DATABASE_ENABLED=true and DATABASE_URL in your environment',
        },
        { status: 503 }
      );
    }

    const db = getDbPool();
    if (!db) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection failed',
        },
        { status: 500 }
      );
    }

    const achievementService = new AchievementService(db);

    // Get all achievement data for this VerusID
    // Handle missing achievement_progress table gracefully
    let earned: any[],
      progress: any[],
      recentUnlocks: any[],
      rarity: any,
      definitions: any[];

    try {
      [earned, progress, recentUnlocks, rarity, definitions] =
        await Promise.all([
          achievementService.getEarnedAchievements(iaddr),
          achievementService.getAchievementProgress(iaddr),
          achievementService.getRecentUnlocks(iaddr, 7),
          achievementService.getBadgeRarity(),
          achievementService.getAchievementDefinitions(),
        ]);
    } catch (error: any) {
      // If achievement_progress table doesn't exist, return empty progress
      if (error.message?.includes('achievement_progress')) {
        earned = await achievementService.getEarnedAchievements(iaddr);
        progress = [];
        recentUnlocks = [];
        rarity = {};
        definitions = await achievementService.getAchievementDefinitions();
      } else {
        throw error;
      }
    }

    const totalAvailable = definitions.length;

    // Calculate rarity breakdown for earned badges
    const earnedRarity: Record<string, number> = {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    };

    earned.forEach(badge => {
      if (badge?.rarity && badge.rarity in earnedRarity) {
        earnedRarity[badge.rarity] = (earnedRarity[badge.rarity] || 0) + 1;
      }
    });

    // Transform earned badges for API response
    const earnedBadges = earned.map(badge => ({
      slug: badge.achievement_slug,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      tier: badge.tier,
      category: badge.category,
      rarity: badge.rarity,
      unlockedAt: badge.unlocked_at,
      unlockValue: badge.unlock_value,
    }));

    // Transform progress for API response
    const progressBadges = progress.map(prog => ({
      slug: prog.achievement_slug,
      name: prog.name,
      description: prog.description,
      icon: prog.icon,
      tier: prog.tier,
      category: prog.category,
      current: prog.current_value,
      target: prog.target_value,
      percentage: Math.round(prog.percentage * 100) / 100,
    }));

    // Create sets for quick lookup
    const earnedSlugs = new Set(earned.map(badge => badge.achievement_slug));
    const progressSlugs = new Set(progress.map(prog => prog.achievement_slug));

    // Transform locked achievements (not earned and not in progress)
    const lockedBadges = definitions
      .filter(def => !earnedSlugs.has(def.slug) && !progressSlugs.has(def.slug))
      .map(def => ({
        slug: def.slug,
        name: def.name,
        description: def.description,
        icon: def.icon,
        tier: def.tier,
        category: def.category,
        rarity: def.rarity,
        current: 0,
        target: 1,
        percentage: 0,
      }));

    // Transform recent unlocks
    const recentUnlockBadges = recentUnlocks.map(badge => ({
      slug: badge.achievement_slug,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      tier: badge.tier,
      category: badge.category,
      rarity: badge.rarity,
      unlockedAt: badge.unlocked_at,
      unlockValue: badge.unlock_value,
    }));

    const response = {
      success: true,
      data: {
        earned: earnedBadges,
        progress: progressBadges,
        locked: lockedBadges,
        total: {
          earned: earned.length,
          available: totalAvailable,
          progress: progress.length,
          locked: lockedBadges.length,
        },
        recentUnlocks: recentUnlockBadges,
        rarity: earnedRarity,
        globalRarity: rarity,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch achievements',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
