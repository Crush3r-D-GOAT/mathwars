-- 1. First, update the game_metrics table to add the new column
ALTER TABLE game_metrics ADD COLUMN IF NOT EXISTS gameid INTEGER;

-- 2. Copy data from gameid to gameid
UPDATE game_metrics SET gameid = gameid;

-- 3. Drop the old column only if the new column has data
ALTER TABLE game_metrics DROP COLUMN IF EXISTS gameid;

-- 4. Update the primary key constraint
ALTER TABLE game_metrics 
    DROP CONSTRAINT IF EXISTS game_metrics_pkey,
    ADD PRIMARY KEY (gameid);

-- 5. Update the foreign key constraint
ALTER TABLE game_metrics 
    DROP CONSTRAINT IF EXISTS game_metrics_gameid_fkey,
    ADD CONSTRAINT game_metrics_gameid_fkey 
    FOREIGN KEY (gameid) REFERENCES games(gameid) ON DELETE CASCADE;

-- 6. Update the update_game_metrics function
CREATE OR REPLACE FUNCTION update_game_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert metrics for the game
    INSERT INTO game_metrics (gameid, avg_score, score_stddev, player_count)
    SELECT 
        NEW.gameid,
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

-- 7. Update the game_difficulty view
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
    g.gameid,
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
