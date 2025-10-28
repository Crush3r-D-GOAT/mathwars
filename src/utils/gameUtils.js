/**
 * Game-specific metric names and their corresponding challenge metrics
 * Maps gameId to its specific metrics for challenges
 */
const GAME_METRICS = {
  1: { // 2048
    cumulative: 'moves_made',
    consistency: 'games_played_well',
    minConsistencyValue: 3 // 3 games played well
  },
  3: { // Fraction Match
    cumulative: 'bounces_counted',
    consistency: 'games_played_well',
    minConsistencyValue: 3
  },
  4: { // Geometry Area Challenge
    cumulative: 'areas_entered',
    consistency: 'games_played_well',
    minConsistencyValue: 3
  },
  5: { // Pi Memory Game
    cumulative: 'digits_entered',
    consistency: 'games_played_well',
    minConsistencyValue: 3
  },
  6: { // Prime or Not
    cumulative: 'not_prime_clicks',
    consistency: 'games_played_well',
    minConsistencyValue: 3
  },
  7: { // Angle Rush
    cumulative: 'angle_questions_answered',
    consistency: 'games_played_well',
    minConsistencyValue: 3
  },
  8: { // Equation Blitz
    cumulative: 'equations_solved',
    consistency: 'games_played_well',
    minConsistencyValue: 3
  },
  9: { // Factor Frenzy
    cumulative: 'factors_selected',
    consistency: 'games_played_well',
    minConsistencyValue: 3
  },
  10: { // Slope Sprint
    cumulative: 'slope_questions_answered',
    consistency: 'games_played_well',
    minConsistencyValue: 3
  }
};

/**
 * Gets the appropriate metrics for a specific game
 * @param {number} gameId - The game ID
 * @returns {Object} The default metrics for the game
 */
export const getDefaultGameMetrics = (gameId) => {
  const game = GAME_METRICS[gameId] || {};
  
  return {
    score: 0,
    streak: 0,
    isOver1000Score: false,
    isOver10Streak: false,
    cumulativeMetric: 0,
    consistencyMetric: false,
    gameSpecific: {
      metricName: game.cumulative || '',
      value: 0
    }
  };
};

/**
 * Submits game results to the server and updates challenge progress
 * @param {Object} gameResult - The game result object
 * @param {number} gameResult.userId - The user's ID
 * @param {number} gameResult.gameId - The game's ID
 * @param {number} gameResult.score - The final score
 * @param {number} gameResult.streak - The highest streak achieved
 * @param {number} gameResult.cumulativeMetric - Game-specific cumulative metric value
 * @param {number} gameResult.consistencyValue - Game-specific value for consistency challenges
 * @returns {Promise<Object>} The server response
 */
export const submitGameResult = async ({
  userId,
  gameId,
  score = 0,
  streak = 0,
  cumulativeMetric = 0,
  consistencyValue = 0
}) => {
  try {
    const game = GAME_METRICS[gameId];
    if (!game) {
      throw new Error(`No metrics defined for game ID: ${gameId}`);
    }

    // Prepare metrics for challenge updates
    const metrics = {
      score,
      streak,
      isOver1000Score: score >= 1000,
      isOver10Streak: streak >= 10,
      [game.cumulative]: cumulativeMetric,
      // For consistency challenges, check if the value meets the minimum requirement
      [`${game.consistency}_consistency`]: consistencyValue >= game.minConsistencyValue ? 1 : 0
    };

    const response = await fetch('/api/game/result', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        gameId,
        metrics,
        timestamp: new Date().toISOString()
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to submit game result');
    }

    return await response.json();
  } catch (error) {
    console.error('Error submitting game result:', error);
    throw error;
  }
};

/**
 * Gets the game-specific metric names for a game
 * @param {number} gameId - The game ID
 * @returns {Object} The metric names for the game
 */
export const getGameMetrics = (gameId) => {
  return GAME_METRICS[gameId] || {};
};
