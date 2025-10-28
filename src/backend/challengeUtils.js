/**
 * Updates challenges based on game data
 * @param {Object} pool - PostgreSQL pool
 * @param {number} userId - The user ID
 * @param {number} gameId - The game ID
 * @param {Object} gameData - The game data
 * @returns {Promise<Object>} Updated challenges
 */
const updateChallenges = async (pool, userId, gameId, gameData) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Get all active challenges for this user and game
    const { rows: challenges } = await client.query(
      `SELECT 
        ac.*,
        ct.name as challenge_name,
        ct.description as challenge_description,
        g.gname as game_name
      FROM active_challenges ac
      JOIN challenge_templates ct ON ac.template_id = ct.template_id
      LEFT JOIN games g ON ac.gameid = g.gameid
      WHERE ac.userid = $1 AND (ac.gameid = $2 OR ac.gameid IS NULL)`,
      [userId, gameId]
    );

    const updates = [];
    const now = new Date().toISOString();

    // 2. Process each challenge
    for (const challenge of challenges) {
      const { target_value, template_id } = challenge;
      let newProgress = challenge.progress_value || 0;
      let isCompleted = challenge.completed || false;
      let shouldUpdate = false;

      // Determine challenge type from template_id or description
      const challengeType = challenge.challenge_description?.toUpperCase() || '';

      // Update progress based on challenge type
      if (challengeType.includes('SCORE') && gameData.score) {
        if (gameData.score > newProgress) {
          newProgress = gameData.score;
          shouldUpdate = true;
        }
      } 
      else if (challengeType.includes('STREAK') && gameData.streak) {
        if (gameData.streak > newProgress) {
          newProgress = gameData.streak;
          shouldUpdate = true;
        }
      }
      else if (challengeType.includes('1000') && gameData.scoreOver1000) {
        if (!isCompleted) {
          newProgress = 1;
          isCompleted = true;
          shouldUpdate = true;
        }
      }
      else if (challengeType.includes('STREAK') && challengeType.includes('10') && gameData.streakOver10) {
        if (!isCompleted) {
          newProgress = 1;
          isCompleted = true;
          shouldUpdate = true;
        }
      }
      else if (gameData.gameSpecificCumulative) {
        newProgress = (newProgress || 0) + gameData.gameSpecificCumulative;
        shouldUpdate = true;
      }

      // Check if target is reached
      if (newProgress >= target_value && !isCompleted) {
        isCompleted = true;
      }

      // Prepare update if needed - only update progress_value
      if (shouldUpdate) {
        updates.push(
          client.query(
            `UPDATE active_challenges 
             SET progress_value = $1
             WHERE userid = $2 
             AND template_id = $3 
             RETURNING *`,
            [newProgress, userId, template_id]
          )
        );
      }
    }

    // Execute all updates
    if (updates.length > 0) {
      await Promise.all(updates);
    }
    
    await client.query('COMMIT');

    // Return updated challenges
    const { rows: updatedChallenges } = await client.query(
      `SELECT 
        ac.*,
        ct.name as challenge_name,
        ct.description as challenge_description,
        g.gname as game_name
      FROM active_challenges ac
      JOIN challenge_templates ct ON ac.template_id = ct.template_id
      LEFT JOIN games g ON ac.gameid = g.gameid
      WHERE ac.userid = $1 AND (ac.gameid = $2 OR ac.gameid IS NULL)`,
      [userId, gameId]
    );

    return updatedChallenges.map(challenge => ({
      id: challenge.challenge_id,
      name: challenge.challenge_name,
      description: challenge.challenge_description,
      progress: challenge.progress_value || 0,
      target: challenge.target_value,
      gameId: challenge.gameid,
      gameName: challenge.game_name,
      categoryId: challenge.category_id
    }));
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in updateChallenges transaction:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  updateChallenges
};
