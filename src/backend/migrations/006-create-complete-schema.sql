-- 1. Create users table if not exists
CREATE TABLE IF NOT EXISTS public.users (
    userid SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    fname VARCHAR(50),
    lname VARCHAR(50),
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    isdiagnostic BOOLEAN DEFAULT false,
    datecreated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create games table if not exists
CREATE TABLE IF NOT EXISTS public.games (
    gameid SERIAL PRIMARY KEY,
    gname VARCHAR(100) NOT NULL,
    highscore INTEGER DEFAULT 0,
    datecreated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create usergames table if not exists
CREATE TABLE IF NOT EXISTS public.usergames (
    usergameid SERIAL PRIMARY KEY,
    userid INTEGER REFERENCES users(userid) ON DELETE CASCADE,
    gameid INTEGER REFERENCES games(gameid) ON DELETE CASCADE,
    dateplayed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    score INTEGER NOT NULL,
    highscore INTEGER NOT NULL,
    UNIQUE(userid, gameid)
);

-- 4. Create diagnosticscores table if not exists
CREATE TABLE IF NOT EXISTS public.diagnosticscores (
    diagnosticid SERIAL PRIMARY KEY,
    userid INTEGER REFERENCES users(userid) ON DELETE CASCADE,
    q1 INTEGER,
    q2 INTEGER,
    q3 INTEGER,
    q4 INTEGER,
    q5 INTEGER,
    q6 INTEGER,
    q7 INTEGER,
    q8 INTEGER,
    q9 INTEGER,
    q10 INTEGER,
    q11 INTEGER,
    q12 INTEGER,
    q13 INTEGER,
    q14 INTEGER,
    q15 INTEGER,
    q16 INTEGER,
    q17 INTEGER,
    q18 INTEGER,
    q19 INTEGER,
    q20 INTEGER,
    dateattempted TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create game_metrics table if not exists
CREATE TABLE IF NOT EXISTS public.game_metrics (
    gameid INTEGER PRIMARY KEY REFERENCES games(gameid) ON DELETE CASCADE,
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

-- 6. Create or replace update_game_metrics function
CREATE OR REPLACE FUNCTION public.update_game_metrics()
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

-- 7. Create trigger for updating game metrics
DROP TRIGGER IF EXISTS update_metrics_trigger ON public.usergames;
CREATE TRIGGER update_metrics_trigger
AFTER INSERT OR UPDATE ON public.usergames
FOR EACH ROW
EXECUTE FUNCTION public.update_game_metrics();

-- 8. Create or replace game_difficulty view
CREATE OR REPLACE VIEW public.game_difficulty AS
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

-- 9. Insert default games if they don't exist
INSERT INTO games (gameid, gname) VALUES 
    (1, '2048')
ON CONFLICT (gameid) DO NOTHING;

INSERT INTO games (gameid, gname) VALUES 
    (2, 'ArithmeticBlaster')
ON CONFLICT (gameid) DO NOTHING;

INSERT INTO games (gameid, gname) VALUES 
    (6, 'Prime or Not')
ON CONFLICT (gameid) DO NOTHING;

INSERT INTO games (gameid, gname) VALUES 
    (9, 'FactorFrenzy')
ON CONFLICT (gameid) DO NOTHING;

INSERT INTO games (gameid, gname) VALUES 
    (10, 'SlopeSprint')
ON CONFLICT (gameid) DO NOTHING;
