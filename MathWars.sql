-- drop table usergames;
-- drop table games;
-- drop table users;
-- drop table diagnosticscores;

CREATE TABLE IF NOT EXISTS public.users
(
    userid serial primary key,
    username text,
    fname text,
    lname text,
    email text,
    password text,
    isdiagnostic boolean,
    dateCreated date
);

CREATE TABLE IF NOT EXISTS public.games
(
    gameid serial primary key,
    gname text,
    highscore integer,
    dateCreated date
);

CREATE TABLE IF NOT EXISTS public.usergames
(
    usergameid serial primary key,
    userid integer not null references users (userid) on delete cascade,
    gameid integer not null references games(gameid) on delete cascade,
    datePlayed date,
    score integer not null,
    highscore integer not null
);

CREATE TABLE IF NOT EXISTS public.diagnosticscores
(
    diagnosticid serial primary key,
    userid integer not null references users (userid) on delete cascade,
    Q1 bool,
    Q2 bool,
    Q3 bool,
    Q4 bool,
    Q5 bool,
    Q6 bool,
    Q7 bool,
    Q8 bool,
    Q9 bool,
    Q10 bool,
    Q11 bool,
    Q12 bool,
    Q13 bool,
    Q14 bool,
    Q15 bool,
    Q16 bool,
    Q17 bool,
    Q18 bool,
    Q19 bool,
    Q20 bool,
    dateAttempted date
);

INSERT INTO games (gameid, gname)
VALUES
    (1, '2048'),
    (2, 'Arithmetic Blaster'),
    (3, 'Fraction Match'),
    (4, 'Geometry Area Challenge'),
    (5, 'Pi Memory Game'),
    (6, 'Prime or Not'),
    (7, 'Angle Rush'),
    (8, 'Equation Blitz'),
    (9, 'Factor Frenzy'),
    (10, 'Slope Sprint')
ON CONFLICT (gameid) DO NOTHING;

-- 1. Remove the static difficulty column if it exists
ALTER TABLE games DROP COLUMN IF EXISTS difficulty;

drop table public.game_metrics;
-- 2. Add game_metrics table to track dynamic difficulty
CREATE TABLE IF NOT EXISTS public.game_metrics (
    gameid INTEGER PRIMARY KEY REFERENCES games(gameid) ON DELETE CASCADE,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    avg_score FLOAT NOT NULL,
    score_stddev FLOAT NOT NULL,
    player_count INTEGER NOT NULL,
    difficulty_score FLOAT GENERATED ALWAYS AS (
        -- Normalize average score to 0-1 range (assuming max score of 10000)
        LEAST(1.0, GREATEST(0.0, avg_score / 10000.0)) * 0.7 + 
        -- Weight skill expression (stddev) higher for more impact
        LEAST(1.0, score_stddev / (avg_score + 1)) * 0.3
    ) STORED,
    skill_expression_score FLOAT GENERATED ALWAYS AS (
        -- Higher stddev = more skill expression
        LEAST(1.0, score_stddev / (avg_score + 1))
    ) STORED
);

drop function update_game_metrics();
-- 3. Create a function to update game metrics
CREATE OR REPLACE FUNCTION public.update_game_metrics()
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

-- 4. Create a trigger to update metrics when new scores are added
DROP TRIGGER IF EXISTS update_metrics_trigger ON usergames;
CREATE TRIGGER update_metrics_trigger
AFTER INSERT OR UPDATE ON usergames
FOR EACH ROW
EXECUTE FUNCTION update_game_metrics();

drop view game_difficulty;
-- 5. Create a view for easy difficulty access (UPDATED)
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

-- Get all games with their current difficulty and skill expression
SELECT * FROM game_difficulty;

-- Get difficulty for a specific game
SELECT * FROM game_difficulty WHERE gameid = 1;

-- ============================================
-- Challenge System Schema
-- ============================================

-- Clean up any existing challenge tables if they exist
DROP TABLE IF EXISTS user_challenge_progress CASCADE;
DROP TABLE IF EXISTS active_challenges CASCADE;
DROP TABLE IF EXISTS challenge_templates CASCADE;
DROP TABLE IF EXISTS challenge_metrics CASCADE;
DROP TABLE IF EXISTS challenge_categories CASCADE;
DROP TABLE IF EXISTS challenge_types CASCADE;

-- Challenge Categories (daily, weekly, biweekly)
CREATE TABLE IF NOT EXISTS challenge_categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE,
    point_multiplier INTEGER NOT NULL,
    games_required INTEGER NOT NULL,  -- 3 for daily, 10 for weekly, 15 for biweekly
    duration_days INTEGER NOT NULL,   -- 1 for daily, 7 for weekly, 14 for biweekly
    regenerate_type VARCHAR(20) NOT NULL DEFAULT 'replace'  -- 'replace' or 'stack'
);

-- Challenge Types (cumulative, consistency)
CREATE TABLE IF NOT EXISTS challenge_types (
    type_id SERIAL PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE,
    description TEXT NOT NULL
);

-- Challenge Metrics (what we're tracking)
CREATE TABLE IF NOT EXISTS challenge_metrics (
    metric_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    is_game_specific BOOLEAN NOT NULL DEFAULT false,
    gameid INTEGER REFERENCES games(gameid) NULL,
    UNIQUE(name, gameid),  -- Ensures unique metric names per game
    CONSTRAINT check_game_specificity 
        CHECK (
            (is_game_specific = true AND gameid IS NOT NULL) OR 
            (is_game_specific = false AND gameid IS NULL)
        )
);

-- Challenge Templates
-- Function to get the type_id for consistency challenges
CREATE OR REPLACE FUNCTION get_consistency_type_id() 
RETURNS INTEGER AS $$
DECLARE
    v_type_id INTEGER;
BEGIN
    SELECT type_id INTO v_type_id 
    FROM challenge_types 
    WHERE name = 'consistency' 
    LIMIT 1;
    
    IF v_type_id IS NULL THEN
        RAISE EXCEPTION 'Consistency type not found in challenge_types';
    END IF;
    
    RETURN v_type_id;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS challenge_templates (
    template_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    type_id INTEGER NOT NULL REFERENCES challenge_types(type_id),
    metric_id INTEGER NOT NULL REFERENCES challenge_metrics(metric_id),
    base_target_value INTEGER NOT NULL,
    is_general BOOLEAN NOT NULL DEFAULT true,
    gameid INTEGER REFERENCES games(gameid) NULL
);

-- Active Challenges (now user-specific)
CREATE TABLE IF NOT EXISTS active_challenges (
    challenge_id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES challenge_templates(template_id),
    category_id INTEGER NOT NULL REFERENCES challenge_categories(category_id),
    userid INTEGER NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
    gameid INTEGER REFERENCES games(gameid) ON DELETE CASCADE,  -- Added gameid column
    progress_value INTEGER NOT NULL DEFAULT 0,
    target_value INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userid, template_id, category_id)  -- Prevent duplicate challenges
);

-- Function to adjust challenge target values based on challenge type and category


-- User Challenge Progress (simplified since challenges are now user-specific)
CREATE TABLE IF NOT EXISTS user_challenge_progress (
    progress_id SERIAL PRIMARY KEY,
    userid INTEGER NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
    challenge_id INTEGER NOT NULL REFERENCES active_challenges(challenge_id) ON DELETE CASCADE,
    current_value INTEGER NOT NULL DEFAULT 0,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userid, challenge_id)
);

-- Indexes for better query performance
CREATE INDEX idx_user_challenge_progress_user ON user_challenge_progress(userid);
CREATE INDEX idx_user_challenge_progress_challenge ON user_challenge_progress(challenge_id);
CREATE INDEX idx_active_challenges_category ON active_challenges(category_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_challenge_progress
CREATE TRIGGER update_user_challenge_progress_modtime
BEFORE UPDATE ON user_challenge_progress
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- ============================================
-- Initialize Challenge System Data
-- ============================================

-- Insert challenge categories
INSERT INTO challenge_categories (name, point_multiplier, games_required, duration_days, regenerate_type)
VALUES 
    ('daily', 1, 3, 1, 'replace'),     -- Daily challenges replace existing ones
    ('weekly', 5, 10, 7, 'stack'),     -- Weekly challenges stack up
    ('biweekly', 7, 15, 14, 'replace') -- Biweekly challenges replace existing ones
ON CONFLICT (name) DO UPDATE SET
    point_multiplier = EXCLUDED.point_multiplier,
    games_required = EXCLUDED.games_required,
    duration_days = EXCLUDED.duration_days,
    regenerate_type = EXCLUDED.regenerate_type;

-- Insert challenge types
INSERT INTO challenge_types (name, description)
VALUES 
    ('cumulative', 'Progress accumulates across multiple game sessions'),
    ('consistency', 'Requires achieving specific milestones multiple times')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description;

-- Insert general metrics (score and streak only)
INSERT INTO challenge_metrics (name, description, is_game_specific, gameid)
VALUES 
    ('score', 'Score across all games', false, NULL),
    ('streak', 'Current daily activity streak', false, NULL)
ON CONFLICT (name, gameid) DO UPDATE SET
    description = EXCLUDED.description,
    is_game_specific = EXCLUDED.is_game_specific;

-- Insert game-specific metrics
-- 2048 (gameid = 1)
INSERT INTO challenge_metrics (name, description, is_game_specific, gameid)
VALUES 
    ('moves_made', 'Total moves made in 2048', true, 1),
    ('tile_reached', 'Highest tile reached in 2048', true, 1)
ON CONFLICT (name, gameid) DO UPDATE SET
    description = EXCLUDED.description,
    is_game_specific = EXCLUDED.is_game_specific;

-- Fraction Match (gameid = 3)
INSERT INTO challenge_metrics (name, description, is_game_specific, gameid)
VALUES 
    ('bounces_counted', 'Number of bounces on the wall in Fraction Match', true, 3)
ON CONFLICT (name, gameid) DO UPDATE SET
    description = EXCLUDED.description,
    is_game_specific = EXCLUDED.is_game_specific;

-- Geometry Area Challenge (gameid = 4)
INSERT INTO challenge_metrics (name, description, is_game_specific, gameid)
VALUES 
    ('areas_entered', 'Number of areas correctly entered in Geometry Area Challenge', true, 4)
ON CONFLICT (name, gameid) DO UPDATE SET
    description = EXCLUDED.description,
    is_game_specific = EXCLUDED.is_game_specific;

-- Pi Memory Game (gameid = 5)
INSERT INTO challenge_metrics (name, description, is_game_specific, gameid)
VALUES 
    ('digits_entered', 'Total digits of Pi entered', true, 5),
    ('level_reached', 'Highest level reached in Pi Memory', true, 5)
ON CONFLICT (name, gameid) DO UPDATE SET
    description = EXCLUDED.description,
    is_game_specific = EXCLUDED.is_game_specific;

-- Prime or Not (gameid = 6)
INSERT INTO challenge_metrics (name, description, is_game_specific, gameid)
VALUES 
    ('not_prime_clicks', 'Number of times "Not Prime" button was clicked', true, 6)
ON CONFLICT (name, gameid) DO UPDATE SET
    description = EXCLUDED.description,
    is_game_specific = EXCLUDED.is_game_specific;

-- Angle Rush (gameid = 7)
INSERT INTO challenge_metrics (name, description, is_game_specific, gameid)
VALUES 
    ('angle_questions_answered', 'Number of angle questions answered', true, 7)
ON CONFLICT (name, gameid) DO UPDATE SET
    description = EXCLUDED.description,
    is_game_specific = EXCLUDED.is_game_specific;

-- Equation Blitz (gameid = 8)
INSERT INTO challenge_metrics (name, description, is_game_specific, gameid)
VALUES 
    ('equations_solved', 'Number of equations solved', true, 8)
ON CONFLICT (name, gameid) DO UPDATE SET
    description = EXCLUDED.description,
    is_game_specific = EXCLUDED.is_game_specific;

-- Factor Frenzy (gameid = 9)
INSERT INTO challenge_metrics (name, description, is_game_specific, gameid)
VALUES 
    ('factors_selected', 'Number of factors selected', true, 9)
ON CONFLICT (name, gameid) DO UPDATE SET
    description = EXCLUDED.description,
    is_game_specific = EXCLUDED.is_game_specific;

-- Slope Sprint (gameid = 10)
INSERT INTO challenge_metrics (name, description, is_game_specific, gameid)
VALUES 
    ('slope_questions_answered', 'Number of slope questions answered', true, 10)
ON CONFLICT (name, gameid) DO UPDATE SET
    description = EXCLUDED.description,
    is_game_specific = EXCLUDED.is_game_specific;


INSERT INTO challenge_metrics (name, description, is_game_specific, gameid)
VALUES 
	('fraction_questions_answered', 'Number of questions answered in a game', true, 3)
ON CONFLICT (name, gameid) DO UPDATE SET
    description = EXCLUDED.description,
    is_game_specific = EXCLUDED.is_game_specific;

-- ============================================
-- Challenge Templates
-- ============================================

-- Delete existing templates to avoid duplicates
DELETE FROM challenge_templates;

-- General Challenges (Cumulative)
-- 10,000 points across all games
INSERT INTO challenge_templates (name, description, type_id, metric_id, base_target_value, is_general, gameid)
SELECT 
    'Point Master', 
    'Score {target} total points across all {game} attempts', 
    (SELECT type_id FROM challenge_types WHERE name = 'cumulative'),
    (SELECT metric_id FROM challenge_metrics WHERE name = 'score' AND gameid IS NULL),
    10000,
    true,
    NULL
WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE name = 'Point Master');

-- 150 total streak (sum of max streaks from each game)
INSERT INTO challenge_templates (name, description, type_id, metric_id, base_target_value, is_general, gameid)
SELECT 
    'Streak Champion', 
    'Achieve a combined {target} day streak across all {game} attempts', 
    (SELECT type_id FROM challenge_types WHERE name = 'cumulative'),
    (SELECT metric_id FROM challenge_metrics WHERE name = 'streak' AND gameid IS NULL),
    150,
    true,
    NULL
WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE name = 'Streak Champion');

-- General Challenges (Consistency)
-- 3 games with 1000+ points
INSERT INTO challenge_templates (name, description, type_id, metric_id, base_target_value, is_general, gameid)
SELECT 
    'Consistent Scorer', 
    'Score 1000+ points in {target} different {game} games', 
    (SELECT type_id FROM challenge_types WHERE name = 'consistency'),
    (SELECT metric_id FROM challenge_metrics WHERE name = 'score' AND gameid IS NULL),
    3,  
    true,
    NULL
WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE name = 'Consistent Scorer');

-- 3 games with 10+ streaks
INSERT INTO challenge_templates (name, description, type_id, metric_id, base_target_value, is_general, gameid)
SELECT 
    'Streak Builder', 
    'Achieve a 10+ streak in {target} different {game} games', 
    (SELECT type_id FROM challenge_types WHERE name = 'consistency'),
    (SELECT metric_id FROM challenge_metrics WHERE name = 'streak' AND gameid IS NULL),
    3,  
    true,
    NULL
WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE name = 'Streak Builder');

-- ============================================
-- Game-Specific Cumulative Challenges
-- ============================================

-- 2048: 500 moves
INSERT INTO challenge_templates (name, description, type_id, metric_id, base_target_value, is_general, gameid)
SELECT 
    '2048 Mover', 
    'Make {target} moves in 2048', 
    (SELECT type_id FROM challenge_types WHERE name = 'cumulative'),
    (SELECT metric_id FROM challenge_metrics WHERE name = 'moves_made' AND gameid = 1),
    500,
    false,
    1
WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE name = '2048 Mover');

-- Fraction Match: 100 bounces
INSERT INTO challenge_templates (name, description, type_id, metric_id, base_target_value, is_general, gameid)
SELECT 
    'Bounce Master', 
    'Count {target} bounces on the wall in Fraction Match', 
    (SELECT type_id FROM challenge_types WHERE name = 'cumulative'),
    (SELECT metric_id FROM challenge_metrics WHERE name = 'bounces_counted' AND gameid = 3),
    100,
    false,
    3
WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE name = 'Bounce Master');

-- Geometry Area: 25 shapes
INSERT INTO challenge_templates (name, description, type_id, metric_id, base_target_value, is_general, gameid)
SELECT 
    'Shape Master', 
    'Calculate area for {target} trapizoids and rhombuses in Geometry Area Challenge', 
    (SELECT type_id FROM challenge_types WHERE name = 'cumulative'),
    (SELECT metric_id FROM challenge_metrics WHERE name = 'areas_entered' AND gameid = 4),
    25,
    false,
    4
WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE name = 'Shape Master');

-- Pi Memory: 50 digits
INSERT INTO challenge_templates (name, description, type_id, metric_id, base_target_value, is_general, gameid)
SELECT 
    'Pi Master', 
    'Enter {target} digits of Pi in Pi Memory Game', 
    (SELECT type_id FROM challenge_types WHERE name = 'cumulative'),
    (SELECT metric_id FROM challenge_metrics WHERE name = 'digits_entered' AND gameid = 5),
    50,
    false,
    5
WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE name = 'Pi Master');

-- Prime or Not: 100 "Not Prime" clicks
INSERT INTO challenge_templates (name, description, type_id, metric_id, base_target_value, is_general, gameid)
SELECT 
    'Prime Hunter', 
    'Click "Not Prime" {target} times in Prime or Not', 
    (SELECT type_id FROM challenge_types WHERE name = 'cumulative'),
    (SELECT metric_id FROM challenge_metrics WHERE name = 'not_prime_clicks' AND gameid = 6),
    100,
    false,
    6
WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE name = 'Prime Hunter');

-- Angle Rush: 100 questions
INSERT INTO challenge_templates (name, description, type_id, metric_id, base_target_value, is_general, gameid)
SELECT 
    'Angle Ace', 
    'Answer {target} angle questions in Angle Rush', 
    (SELECT type_id FROM challenge_types WHERE name = 'cumulative'),
    (SELECT metric_id FROM challenge_metrics WHERE name = 'questions_answered' AND gameid = 7),
    100,
    false,
    7
WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE name = 'Angle Ace');

-- Equation Blitz: 100 equations
INSERT INTO challenge_templates (name, description, type_id, metric_id, base_target_value, is_general, gameid)
SELECT 
    'Equation Expert', 
    'Solve {target} equations in Equation Blitz', 
    (SELECT type_id FROM challenge_types WHERE name = 'cumulative'),
    (SELECT metric_id FROM challenge_metrics WHERE name = 'equations_solved' AND gameid = 8),
    100,
    false,
    8
WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE name = 'Equation Expert');

-- Factor Frenzy: 150 factors
INSERT INTO challenge_templates (name, description, type_id, metric_id, base_target_value, is_general, gameid)
SELECT 
    'Factor Pro', 
    'Select {target} factors in Factor Frenzy', 
    (SELECT type_id FROM challenge_types WHERE name = 'cumulative'),
    (SELECT metric_id FROM challenge_metrics WHERE name = 'factors_selected' AND gameid = 9),
    150,
    false,
    9
WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE name = 'Factor Pro');

-- Slope Sprint: 100 questions
INSERT INTO challenge_templates (name, description, type_id, metric_id, base_target_value, is_general, gameid)
SELECT 
    'Slope Star', 
    'Answer {target} slope questions in Slope Sprint', 
    (SELECT type_id FROM challenge_types WHERE name = 'cumulative'),
    (SELECT metric_id FROM challenge_metrics WHERE name = 'slope_questions_answered' AND gameid = 10),
    100,
    false,
    10
WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE name = 'Slope Star');

-- ============================================
-- Game-Specific Consistency Challenges
-- ============================================

-- 2048: 3 games reaching 256 tile
INSERT INTO challenge_templates (name, description, type_id, metric_id, base_target_value, is_general, gameid)
SELECT 
    '2048 Champion', 
    'Reach the 256 tile in {target} different 2048 games', 
    (SELECT type_id FROM challenge_types WHERE name = 'consistency'),
    (SELECT metric_id FROM challenge_metrics WHERE name = 'games_played_well'),
    3,  -- Number of games required
    false,
    1
WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE name = '2048 Champion');

-- Fraction Match: 3 games with 10+ correct
INSERT INTO challenge_templates (name, description, type_id, metric_id, base_target_value, is_general, gameid)
SELECT 
    'Fraction Pro', 
    'Answer 10+ questions correctly in {target} different Fraction Match games', 
    (SELECT type_id FROM challenge_types WHERE name = 'consistency'),
    (SELECT metric_id FROM challenge_metrics WHERE name = 'games_played_well'),
    3,  -- Number of games required
    false,
    3
WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE name = 'Fraction Pro');

-- Geometry Area: 3 games with 5+ correct shapes
INSERT INTO challenge_templates (name, description, type_id, metric_id, base_target_value, is_general, gameid)
SELECT 
    'Area Ace', 
    'Calculate 5+ trapizoids and rhombuses correctly in {target} different Geometry Area Challenge games', 
    (SELECT type_id FROM challenge_types WHERE name = 'consistency'),
    (SELECT metric_id FROM challenge_metrics WHERE name = 'games_played_well'),
    3,  -- Number of games required
    false,
    4
WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE name = 'Area Ace');

-- Pi Memory: 3 games reaching level 10+
INSERT INTO challenge_templates (name, description, type_id, metric_id, base_target_value, is_general, gameid)
SELECT 
    'Pi Enthusiast', 
    'Reach level 10+ in {target} different Pi Memory games', 
    (SELECT type_id FROM challenge_types WHERE name = 'consistency'),
    (SELECT metric_id FROM challenge_metrics WHERE name = 'games_played_well'),
    3,  -- Number of games required
    false,
    5
WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE name = 'Pi Enthusiast');

-- Prime or Not: 3 games with 20+ "Not Prime" clicks
INSERT INTO challenge_templates (name, description, type_id, metric_id, base_target_value, is_general, gameid)
SELECT 
    'Prime Expert', 
    'Click "Not Prime" 20+ times in {target} different Prime or Not games', 
    (SELECT type_id FROM challenge_types WHERE name = 'consistency'),
    (SELECT metric_id FROM challenge_metrics WHERE name = 'games_played_well'),
    3,  -- Number of games required
    false,
    6
WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE name = 'Prime Expert');

-- Angle Rush: 3 games with 20+ correct
INSERT INTO challenge_templates (name, description, type_id, metric_id, base_target_value, is_general, gameid)
SELECT 
    'Angle Master', 
    'Answer 20+ questions correctly in {target} different Angle Rush games', 
    (SELECT type_id FROM challenge_types WHERE name = 'consistency'),
    (SELECT metric_id FROM challenge_metrics WHERE name = 'games_played_well'),
    3,  -- Number of games required
    false,
    7
WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE name = 'Angle Master');

-- Equation Blitz: 3 games with 20+ correct
INSERT INTO challenge_templates (name, description, type_id, metric_id, base_target_value, is_general, gameid)
SELECT 
    'Equation Master', 
    'Solve 20+ equations correctly in {target} different Equation Blitz games', 
    (SELECT type_id FROM challenge_types WHERE name = 'consistency'),
    (SELECT metric_id FROM challenge_metrics WHERE name = 'games_played_well'),
    3,  -- Number of games required
    false,
    8
WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE name = 'Equation Master');

-- Factor Frenzy: 3 games with 30+ factors
INSERT INTO challenge_templates (name, description, type_id, metric_id, base_target_value, is_general, gameid)
SELECT 
    'Factor Master', 
    'Select 30+ factors in {target} different Factor Frenzy games', 
    (SELECT type_id FROM challenge_types WHERE name = 'consistency'),
    (SELECT metric_id FROM challenge_metrics WHERE name = 'games_played_well'),
    3,  -- Number of games required
    false,
    9
WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE name = 'Factor Master');

-- Slope Sprint: 3 games with 20+ correct
INSERT INTO challenge_templates (name, description, type_id, metric_id, base_target_value, is_general, gameid)
SELECT 
    'Slope Master', 
    'Answer 20+ questions correctly in {target} different Slope Sprint games', 
    (SELECT type_id FROM challenge_types WHERE name = 'consistency'),
    (SELECT metric_id FROM challenge_metrics WHERE name = 'games_played_well'),
    3,  -- Number of games required
    false,
    10
WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE name = 'Slope Master');

-- Function to delete completed challenges
CREATE OR REPLACE FUNCTION delete_completed_challenges()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete any completed challenges
    DELETE FROM active_challenges
    WHERE progress_value >= target_value;
    
    RETURN NULL; -- This is an AFTER trigger, return value is ignored
END;
$$ LANGUAGE plpgsql;

-- Create the trigger to run after updates to active_challenges
CREATE OR REPLACE TRIGGER trg_cleanup_completed_challenges
AFTER UPDATE OF progress_value, target_value ON active_challenges
FOR EACH ROW
WHEN (NEW.progress_value >= NEW.target_value)
EXECUTE FUNCTION delete_completed_challenges();

-- Also create a trigger for INSERT in case a challenge is created as already completed
CREATE OR REPLACE TRIGGER trg_cleanup_new_completed_challenges
AFTER INSERT ON active_challenges
FOR EACH ROW
WHEN (NEW.progress_value >= NEW.target_value)
EXECUTE FUNCTION delete_completed_challenges();



CREATE OR REPLACE FUNCTION adjust_challenge_targets()
RETURNS TRIGGER AS $$
DECLARE
    category_info RECORD;
    challenge_type_id INTEGER;
BEGIN
    -- Get the challenge type and category info
    SELECT 
        cc.point_multiplier,
        cc.games_required,
        ct.type_id,
        cc.name as category_name
    INTO category_info
    FROM challenge_categories cc
    JOIN challenge_templates ct ON ct.template_id = NEW.template_id
    WHERE cc.category_id = NEW.category_id
    LIMIT 1;
    
    -- Apply the appropriate adjustment based on challenge type and category
    IF category_info.type_id = 1 THEN
        -- For cumulative challenges (type_id = 1), apply the point_multiplier
        -- Daily (1x), Weekly (5x), Biweekly (7x)
        NEW.target_value := NEW.target_value * category_info.point_multiplier;
    ELSIF category_info.type_id = 2 THEN
        -- For consistency challenges (type_id = 2), use games_required as the target
        -- Daily (3 games), Weekly (10 games), Biweekly (15 games)
        NEW.target_value := category_info.games_required;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger to adjust target values on insert
CREATE OR REPLACE TRIGGER trg_adjust_challenge_targets
BEFORE INSERT ON active_challenges
FOR EACH ROW
EXECUTE FUNCTION adjust_challenge_targets();

-- Update existing challenges to apply the new target values based on their categories
WITH challenge_updates AS (
    SELECT 
        ac.challenge_id,
        CASE 
            WHEN ct.type_id = 1 THEN ac.target_value * cc.point_multiplier
            WHEN ct.type_id = 2 THEN cc.games_required
            ELSE ac.target_value
        END AS new_target_value
    FROM active_challenges ac
    JOIN challenge_categories cc ON ac.category_id = cc.category_id
    JOIN challenge_templates ct ON ct.template_id = ac.template_id
)
UPDATE active_challenges ac
SET target_value = cu.new_target_value
FROM challenge_updates cu
WHERE ac.challenge_id = cu.challenge_id;