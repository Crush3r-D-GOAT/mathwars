-- 1. Drop the existing trigger and function
DROP TRIGGER IF EXISTS update_metrics_trigger ON usergames;
DROP FUNCTION IF EXISTS update_game_metrics();

-- 2. Drop the game_metrics table and related objects
DROP VIEW IF EXISTS game_difficulty;
DROP TABLE IF EXISTS game_metrics CASCADE;

-- 3. Recreate game_metrics with the new column name
CREATE TABLE public.game_metrics (
    gameid INTEGER PRIMARY KEY REFERENCES games("gameid") ON DELETE CASCADE,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    avg_score FLOAT NOT NULL,
    score_stddev FLOAT NOT NULL,
    player_count INTEGER NOT NULL,
    difficulty_score FLOAT GENERATED ALWAYS AS (
        LEAST(1.0, GREATEST(0.0, avg_score / 10000.0)) * 0.7 + 
        LEAST(1.0, score_stddev / (avg_score + 1)) * 0.3
    ) STORED,
    skill_expression_score FLOAT GENERATED ALWAYS AS (
        LEAST(1.0, score_stddev / (avg_score + 1))
    ) STORED
);

-- 4. Recreate the update_game_metrics function with consistent column names
CREATE OR REPLACE FUNCTION update_game_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert metrics for the game
    INSERT INTO game_metrics (gameid, avg_score, score_stddev, player_count)
    SELECT 
        ug.gameid,
        COALESCE(AVG(ug.highscore), 0) as avg_score,
        COALESCE(STDDEV(ug.highscore), 0) as score_stddev,
        COUNT(DISTINCT ug.userid) as player_count
    FROM usergames ug
    WHERE ug.gameid = NEW.gameid
    GROUP BY ug.gameid
    ON CONFLICT (gameid) 
    DO UPDATE SET
        avg_score = EXCLUDED.avg_score,
        score_stddev = EXCLUDED.score_stddev,
        player_count = EXCLUDED.player_count,
        calculated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Recreate the trigger
CREATE TRIGGER update_metrics_trigger
AFTER INSERT OR UPDATE ON usergames
FOR EACH ROW
EXECUTE FUNCTION update_game_metrics();

-- 6. Recreate the game_difficulty view with consistent column names
CREATE OR REPLACE VIEW game_difficulty AS
WITH latest_metrics AS (
    SELECT DISTINCT ON (gameid)
        gameid,
        avg_score,
        score_stddev,
        player_count,
        difficulty_score,
        skill_expression_score
    FROM game_metrics
    ORDER BY gameid, calculated_at DESC
)
SELECT 
    g.gameid as gameid,
    g.gname,
    COALESCE(lm.avg_score, 0) as avg_score,
    COALESCE(lm.score_stddev, 0) as score_stddev,
    COALESCE(lm.player_count, 0) as player_count,
    -- Difficulty category based on score distribution
    CASE 
        WHEN lm.difficulty_score < 0.3 OR lm.difficulty_score IS NULL THEN 'Easy'
        WHEN lm.difficulty_score < 0.7 THEN 'Medium'
        ELSE 'Hard'
    END as difficulty,
    -- Skill expression level
    CASE 
        WHEN lm.skill_expression_score < 0.2 OR lm.skill_expression_score IS NULL THEN 'Low Skill Gap'
        WHEN lm.skill_expression_score < 0.5 THEN 'Moderate Skill Gap'
        ELSE 'High Skill Gap'
    END as skill_expression
FROM games g
LEFT JOIN latest_metrics lm ON g.gameid = lm.gameid
ORDER BY g.gameid;

-- 7. Update existing data
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
