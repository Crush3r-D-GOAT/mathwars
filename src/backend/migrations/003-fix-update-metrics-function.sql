-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS update_metrics_trigger ON usergames;
DROP FUNCTION IF EXISTS update_game_metrics();

-- Recreate the function with corrected column names
CREATE OR REPLACE FUNCTION update_game_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert metrics for the game
    INSERT INTO game_metrics (gameid, avg_score, score_stddev, player_count)
    SELECT 
        gameid,
        COALESCE(AVG(highscore), 0) as avg_score,
        COALESCE(STDDEV(highscore), 0) as score_stddev,
        COUNT(DISTINCT userid) as player_count
    FROM usergames
    WHERE gameid = NEW.gameid
    GROUP BY gameid
    ON CONFLICT (gameid) 
    DO UPDATE SET
        avg_score = EXCLUDED.avg_score,
        score_stddev = EXCLUDED.score_stddev,
        player_count = EXCLUDED.player_count,
        calculated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_metrics_trigger
AFTER INSERT OR UPDATE ON usergames
FOR EACH ROW
EXECUTE FUNCTION update_game_metrics();

-- Update existing metrics
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
