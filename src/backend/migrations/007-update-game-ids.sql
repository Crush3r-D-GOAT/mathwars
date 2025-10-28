-- 1. Update existing games
UPDATE games SET gameid = 3 WHERE gname = 'Fraction Match';
UPDATE games SET gameid = 4 WHERE gname = 'Geometry Area Challenge';
UPDATE games SET gameid = 5 WHERE gname = 'Pi Memory Game';
UPDATE games SET gameid = 7 WHERE gname = 'Angle Rush';
UPDATE games SET gameid = 8 WHERE gname = 'Equation Blitz';

-- 2. Insert any missing games with their correct IDs
INSERT INTO games (gameid, gname) VALUES 
    (1, '2048'),
    (2, 'Arithmetic Blaster'),
    (6, 'Prime or Not'),
    (9, 'Factor Frenzy'),
    (10, 'Slope Sprint')
ON CONFLICT (gameid) 
DO UPDATE SET gname = EXCLUDED.gname;

-- 3. Update any references in usergames to maintain data integrity
-- This will update any existing records that reference the old game IDs
-- Note: This is just an example - adjust based on your actual data
-- UPDATE usergames SET gameid = 3 WHERE gameid = [old_id_for_fraction_match];
-- Repeat for other games as needed

-- 4. Refresh the game_metrics table
TRUNCATE game_metrics;

-- 5. Repopulate game_metrics with updated data
WITH game_stats AS (
    SELECT 
        gameid,
        COALESCE(AVG(highscore), 0) as avg_score,
        COALESCE(STDDEV(highscore), 0) as score_stddev,
        COUNT(DISTINCT userid) as player_count
    FROM usergames
    GROUP BY gameid
)
INSERT INTO game_metrics (gameid, avg_score, score_stddev, player_count)
SELECT gameid, avg_score, score_stddev, player_count
FROM game_stats
ON CONFLICT (gameid) 
DO UPDATE SET
    avg_score = EXCLUDED.avg_score,
    score_stddev = EXCLUDED.score_stddev,
    player_count = EXCLUDED.player_count,
    calculated_at = CURRENT_TIMESTAMP;
