// backend/recommendation.js
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Cache for challenges to ensure consistency within their time periods
let challengeCache = {
    daily: { games: [], lastUpdated: null },
    weekly: { games: [], lastUpdated: null },
    biweekly: { games: [], lastUpdated: null }
};

// Internal date utility functions (not exported)
const dateUtils = {
    // Get the start of the day (midnight) in local timezone
    getStartOfDay: function(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
    },

    // Get the start of the week (Sunday) for a given date at 12:00 AM
    getStartOfWeek: function(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day; // This gets us to Sunday
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    },

    // Get the start of the biweek period (aligned to start of week at 12:00 AM)
    getStartOfBiweek: function(date) {
        const weekStart = this.getStartOfWeek(date);
        // Get the number of weeks since a fixed reference date (Jan 7, 2001 - a Sunday)
        const referenceDate = new Date(2001, 0, 7);
        const weeksSinceReference = Math.floor((weekStart - referenceDate) / (7 * 24 * 60 * 60 * 1000));
        // If even number of weeks since reference, it's the start of a biweek
        return weeksSinceReference % 2 === 0 ? weekStart : new Date(weekStart - 7 * 24 * 60 * 60 * 1000);
    }
};

// Simple date-based seed for consistent random selection
function getDateSeed() {
    const date = new Date();
    return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

// Simple deterministic random based on date and a seed
function getRandomIndex(max, seed) {
    const x = Math.sin(seed) * 10000;
    return Math.floor((x - Math.floor(x)) * max);
}

async function getRecommendations(userId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // 1. Get all games with metrics
        const games = await client.query(`
            SELECT 
                g.gameid, 
                g.gname,
                COALESCE(gm.avg_score, 1000) as avg_score,
                COALESCE(gm.difficulty_score, 0.5) as difficulty_score
            FROM games g
            LEFT JOIN game_metrics gm ON g.gameid = gm.gameid
            WHERE gm.calculated_at = (
                SELECT MAX(calculated_at) 
                FROM game_metrics 
                WHERE gameid = g.gameid
            ) OR gm.calculated_at IS NULL
        `);

        // 2. Get user's game history
        const userScores = await pool.query(`
            SELECT 
                gameid, 
                MAX(highscore) as highscore,
                COUNT(*) as play_count
            FROM usergames 
            WHERE userID = $1 
            GROUP BY gameid
        `, [userId]);

        // 3. Get all game IDs
        const allGameIds = games.rows.map(game => game.gameid);
        const baseSeed = getDateSeed();
        
        // 4. Select challenges
        const selectRandomGames = (count, excludeIds = [], seedOffset = 0) => {
            // Always exclude game ID 2 (ArithmeticBlaster)
            const exclude = new Set([...excludeIds, 2]);
            const availableGames = allGameIds.filter(id => !exclude.has(id));
            const selected = [];
            
            // Use a different seed for each call by combining baseSeed with seedOffset
            const seed = baseSeed + seedOffset;
            
            for (let i = 0; i < count && availableGames.length > 0; i++) {
                const index = getRandomIndex(availableGames.length, seed * (i + 1));
                selected.push(availableGames.splice(index, 1)[0]);
            }
            
            return selected;
        };
        
        const now = new Date();
        
        // 5. Generate or return cached challenges
        const today = dateUtils.getStartOfDay(now);
        
        // Check for existing daily challenges for today
        const { rows: existingDailyChallenges } = await client.query(`
            SELECT * FROM active_challenges 
            WHERE userid = $1 AND category_id = 1
            AND created_at >= $2
            LIMIT 1
        `, [userId, today]);
        
        const shouldGenerateDaily = existingDailyChallenges.length === 0;
        
        console.log('Daily Challenge Debug:', {
            now: now.toISOString(),
            today: today.toISOString(),
            existingChallenges: existingDailyChallenges.length,
            shouldGenerateDaily
        });
            
        if (shouldGenerateDaily) {
            // Clear any existing daily challenges before generating new ones
            await client.query(`
                DELETE FROM active_challenges 
                WHERE userid = $1 AND category_id = 1
            `, [userId]);
            
            // Now generate new daily challenges
            // Get 2 random games for daily challenges with unique seed of 1
            const dailyGames = selectRandomGames(2, [], 1);
            
            // Get challenge templates for the selected games
            const gameTemplates = [];
            for (const gameId of dailyGames) {
                const result = await client.query(`
                    SELECT template_id, base_target_value 
                    FROM challenge_templates 
                    WHERE gameid = $1 OR gameid IS NULL
                    ORDER BY RANDOM() 
                    LIMIT 6
                `, [gameId]);
                
                if (result.rows.length > 0) {
                    // Select a random template from the 6 returned
                    const randomTemplate = result.rows[Math.floor(Math.random() * result.rows.length)];
                    
                    // Insert into active_challenges with category_id = 1 for daily
                    await client.query(`
                        INSERT INTO active_challenges 
                        (template_id, category_id, userid, target_value, gameid)
                        VALUES ($1, 1, $2, $3, $4)
                    `, [
                        randomTemplate.template_id,
                        userId,
                        randomTemplate.base_target_value,
                        gameId
                    ]);
                    
                    gameTemplates.push({
                        gameId,
                        template: randomTemplate
                    });
                }
            }
            
            console.log('Generated new daily challenges:', {
                games: dailyGames,
                templates: gameTemplates.map(t => ({
                    gameId: t.gameId,
                    templateId: t.template.template_id,
                    target: t.template.base_target_value
                }))
            });
            
            // Always update the cache timestamp to prevent regeneration
            challengeCache.daily = {
                ...challengeCache.daily,
                lastUpdated: now
            };
        }

        // Weekly challenges - check if we need to generate new ones
        const weekStart = dateUtils.getStartOfWeek(now);
        
        // Check if we already have challenges for this week
        const { rows: existingWeeklyChallenges } = await client.query(`
            SELECT * FROM active_challenges 
            WHERE userid = $1 AND category_id = 2
            AND created_at >= $2
            LIMIT 1
        `, [userId, weekStart]);
        
        const shouldGenerateWeekly = existingWeeklyChallenges.length === 0;
        
        console.log('Weekly Challenge Debug:', {
            weekStart: weekStart.toISOString(),
            existingChallenges: existingWeeklyChallenges.length,
            shouldGenerateWeekly,
            cacheState: challengeCache.weekly
        });
        
        // Generate new weekly challenges if it's a new week
        if (shouldGenerateWeekly) {
            
            // Get 4 random games for weekly challenges with unique seed of 2
            const weeklyGames = selectRandomGames(4, [], 2);
            
            // Get challenge templates for the selected games
            const gameTemplates = [];
            for (const gameId of weeklyGames) {
                const result = await client.query(`
                    SELECT template_id, base_target_value 
                    FROM challenge_templates 
                    WHERE gameid = $1 OR gameid IS NULL
                    ORDER BY RANDOM() 
                    LIMIT 6
                `, [gameId]);
                
                if (result.rows.length > 0) {
                    // Select a random template from the 6 returned
                    const randomTemplate = result.rows[Math.floor(Math.random() * result.rows.length)];
                    
                    // Insert into active_challenges with category_id = 2 for weekly
                    await client.query(`
                        INSERT INTO active_challenges 
                        (template_id, category_id, userid, target_value, gameid)
                        VALUES ($1, 2, $2, $3, $4)
                    `, [
                        randomTemplate.template_id,
                        userId,
                        randomTemplate.base_target_value,
                        gameId
                    ]);
                    
                    gameTemplates.push({
                        gameId,
                        template: randomTemplate
                    });
                }
            }
            
            console.log('Generated new weekly challenges:', {
                games: weeklyGames,
                templates: gameTemplates.map(t => ({
                    gameId: t.gameId,
                    templateId: t.template.template_id,
                    target: t.template.base_target_value
                }))
            });
            
            // Update the weekly cache
            challengeCache.weekly = {
                games: weeklyGames,
                lastUpdated: now,
                templates: gameTemplates
            };
        }

        // Check if we need to update biweekly challenges (every 2 weeks)
        const biweekStart = dateUtils.getStartOfBiweek(now);
        const biweeklyLastUpdated = challengeCache.biweekly.lastUpdated ? new Date(challengeCache.biweekly.lastUpdated) : null;
        const shouldGenerateBiweekly = !biweeklyLastUpdated || biweeklyLastUpdated < biweekStart;
        
        console.log('Biweekly Challenge Debug:', {
            biweekStart: biweekStart.toISOString(),
            lastUpdated: biweeklyLastUpdated ? biweeklyLastUpdated.toISOString() : 'never',
            shouldGenerateBiweekly,
            cacheState: challengeCache.biweekly
        });
            
        if (shouldGenerateBiweekly) {
            // First, delete any existing biweekly challenges for this user
            await client.query(`
                DELETE FROM active_challenges 
                WHERE userid = $1 AND category_id = 3
            `, [userId]);
            
            // Now generate new biweekly challenges
            // Get 1 random game for biweekly challenge with unique seed of 3
            const biweeklyGames = selectRandomGames(1, [], 3);
            
            // Get challenge templates for the selected game
            const gameTemplates = [];
            for (const gameId of biweeklyGames) {
                const result = await client.query(`
                    SELECT template_id, base_target_value 
                    FROM challenge_templates 
                    WHERE gameid = $1 OR gameid IS NULL
                    ORDER BY RANDOM() 
                    LIMIT 6
                `, [gameId]);
                
                if (result.rows.length > 0) {
                    // Select a random template from the 6 returned
                    const randomTemplate = result.rows[Math.floor(Math.random() * result.rows.length)];
                    
                    // Insert into active_challenges with category_id = 3 for biweekly
                    await client.query(`
                        INSERT INTO active_challenges 
                        (template_id, category_id, userid, target_value, gameid)
                        VALUES ($1, 3, $2, $3, $4)
                    `, [
                        randomTemplate.template_id,
                        userId,
                        randomTemplate.base_target_value,
                        gameId
                    ]);
                    
                    gameTemplates.push({
                        gameId,
                        template: randomTemplate
                    });
                }
            }
            
            console.log('Generated new biweekly challenge:', {
                games: biweeklyGames,
                templates: gameTemplates.map(t => ({
                    gameId: t.gameId,
                    templateId: t.template.template_id,
                    target: t.template.base_target_value
                }))
            });
            
            // Update cache with new challenges
            challengeCache.biweekly = {
                games: biweeklyGames,
                lastUpdated: now,
                templates: gameTemplates
            };
        } else {
            // Just update the lastUpdated timestamp
            challengeCache.biweekly = {
                ...challengeCache.biweekly,
                lastUpdated: now
            };
        }

        await client.query('COMMIT');
        return {
            daily: challengeCache.daily.games,
            weekly: challengeCache.weekly.games,
            biweekly: challengeCache.biweekly.games
        };
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackError) {
            console.error('Error rolling back transaction:', rollbackError);
        }
        console.error('Error in getRecommendations:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Export the function, cache, and dateUtils
module.exports = { 
    getRecommendations, 
    challengeCache,
    dateUtils
};
