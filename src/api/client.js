import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3002'

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
})

apiClient.interceptors.request.use(
  (config) => {
    console.log('Request:', config.method.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with a status code outside 2xx
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request
      console.error('Request error:', error.message);
    }
    return Promise.reject(error);
  }
);

export const fetchHighScore = async (userId, gameId) => {
  try {
    const response = await apiClient.get(`/api/usergames/highscore?userid=${userId}&gameid=${gameId}`);
    return response.data.highScore || 0;
  } catch (error) {
    console.error('Error fetching high score:', error);
    return 0;
  }
};

/**
 * Saves game data to the server.
 * @param {Object} gameData - The game data to save.
 * @returns {Promise<Object>} The saved game data.
 */
export const saveGameData = async (gameData) => {
  try {
    const response = await apiClient.post('/api/usergames', gameData);
    return response.data;
  } catch (error) {
    console.error('Error saving game data:', error);
    throw error;
  }
};

/**
 * Fetches all users from the API.
 * @returns {Promise<Array>} A promise that resolves to an array of user objects.
 */
export const getUsers = async () => {
  try {
    const response = await apiClient.get('/users');
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

/**
 * Creates a new user via the API.
 * @param {Object} userData - The data for the new user.
 * @returns {Promise<Object>} A promise that resolves to the newly created user object.
 */
export const createUser = async (userData) => {
  try {
    const response = await apiClient.post('/users', userData);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.error || 'Failed to create user');
    }
    throw error;
  }
};

/**
 * Logs in a user via the API.
 * @param {string} username - The user's username.
 * @param {string} password - The user's password.
 * @returns {Promise<Object>} A promise that resolves with a success message and user data.
 */
export const login = async (username, password) => {
  try {
    const response = await apiClient.post('/login', {
      username,
      password
    });
    console.log('Login API Response:', response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      if (error.response.status === 401) {
        throw new Error('Invalid username or password');
      }
      throw new Error(error.response.data.error || 'Login failed');
    }
    throw new Error('Network error. Please check your connection.');
  }
};

/**
 * Fetches the diagnostic status for a user.
 * @param {number} userId - The user's ID.
 * @returns {Promise<boolean>} Whether the user has completed the diagnostic.
 */
export const getDiagnosticStatus = async (userId) => {
  try {
    const response = await apiClient.get(`/api/users/${userId}/diagnostic`);
    return response.data.isdiagnostic;
  } catch (error) {
    console.error('Error fetching diagnostic status:', error);
    throw error;
  }
};

/**
 * Updates the diagnostic status for a user.
 * @param {number} userId - The user's ID.
 * @param {boolean} status - New diagnostic status.
 * @returns {Promise<Object>} Updated user object.
 */
export const updateDiagnosticStatus = async (userId, status) => {
  try {
    const response = await apiClient.post(`/api/users/${userId}/diagnostic`, { isdiagnostic: status });
    return response.data;
  } catch (error) {
    console.error('Error updating diagnostic status:', error);
    throw error;
  }
};

/**
 * Posts diagnostic results to the server.
 * @param {number} userId - The user ID.
 * @param {boolean[]} resultsArray - Array of booleans for each question (true if correct).
 * @returns {Promise<Object>} The server response.
 */
export async function saveDiagnosticResults(userid, results) {
  console.log("Request:", `POST /api/users/${userid}/diagnostic/results`);
  console.log("Payload being sent:", { results });

  try {
    const res = await apiClient.post(`/api/users/${userid}/diagnostic/results`, {results});
    console.log("Response:", res);
    return res;
  } catch (err) {
    console.error("Error saving diagnostic results:", err.response?.data || err);
    throw err;
  }
}

/**
 * Fetches the user's highest cumulative highscore across ALL games.
 * @param {number|string} userId - The user's ID.
 * @returns {Promise<number>} The user's highest recorded highscore (or 0 if none).
 */
export const fetchUserHighestScore = async (userId) => {
  try {
    const response = await apiClient.get(`/api/user/${userId}/highscore`);
    return response.data.highestScore || 0;
  } catch (error) {
    console.error("Error fetching user highest score:", error);
    return 0;
  }
};

/**
 * Fetches total number of games played by a user (including repeats).
 * @param {number|string} userId - The user's ID.
 * @returns {Promise<number>} Total number of games played.
 */
export const fetchUserGameCount = async (userId) => {
  try {
    const response = await apiClient.get(`/api/user/${userId}/gamecount`);
    return response.data.totalGames || 0;
  } catch (error) {
    console.error("Error fetching total games played:", error);
    return 0;
  }
};

/**
 * Fetch all user scores from usergames table.
 * @param {number} userId - The user's ID.
 * @returns {Promise<Array>} An array of scores.
 */
export async function fetchAllScores(userId) {
  try {
    const response = await fetch(`${API_BASE}/api/usergames/${userId}/scores`, { credentials: 'omit' });
    if (!response.ok) throw new Error("Failed to fetch scores");
    const data = await response.json();
    return data.scores; 
  } catch (error) {
    console.error("Error fetching scores:", error);
    return [];
  }
}

/**
 * Fetch user game scores.
 * @param {number} userId - The user's ID.
 * @param {number} gameId - The game's ID.
 * @returns {Promise<Array>} An array of scores.
 */
export async function fetchUserGameScores(userId, gameId) {
  try {
    const response = await fetch(`${API_BASE}/api/usergames/${userId}/${gameId}/scores`, { credentials: 'omit' });
    if (!response.ok) throw new Error("Failed to fetch scores");
    return await response.json();
  } catch (error) {
    console.error("Error fetching user game scores:", error);
    return [];
  }
}

/**
 * Fetches active challenges for a user.
 * @param {number} userId - The user's ID.
 * @returns {Promise<Array>} Array of challenge objects with id, name, description, progress, target, etc.
 */
export async function fetchUserChallenges(userId) {
  try {
    const response = await fetch(`${API_BASE}/api/users/${userId}/challenges`, { headers: { 'Content-Type': 'application/json' }, credentials: 'omit' });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to fetch challenges:', errorData);
      throw new Error(errorData.message || 'Failed to fetch challenges');
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching user challenges:", error);
    throw error; 
  }
}

/**
 * Fetches game recommendations for a specific user.
 * @param {number|string} userId - The ID of the user.
 * @returns {Promise<Array>} A promise that resolves to an array of recommended game objects.
 */
export async function getRecommendations(userId) {
  try {
    const response = await fetch(`${API_BASE}/api/recommendations/${userId}`, { credentials: 'omit' });
    if (!response.ok) throw new Error("Failed to fetch recommendations");
    return await response.json();
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return [];
  }
}

/**
 * Updates challenges based on game data.
 * @param {number} userId - The user ID.
 * @param {number} gameId - The game ID (1: 2048, 2: ArithmeticBlaster, 3: Fraction Match, etc.).
 * @param {Object} gameData - The game data.
 * @param {number} [gameData.score] - The final score.
 * @param {number} [gameData.streak] - The highest streak achieved.
 * @param {boolean} [gameData.scoreOver1000] - Whether score is over 1000.
 * @param {boolean} [gameData.streakOver10] - Whether streak is over 10.
 * @param {number} [gameData.gameSpecificCumulative] - Game-specific cumulative value.
 * @param {boolean} [gameData.gameConsistency] - Whether game consistency challenge is met.
 * @returns {Promise<Object>} The updated challenges.
 */
export async function updateGameChallenges(userId, gameId, gameData) {
  try {
    const response = await apiClient.post('/api/challenges/update', {
      userId,
      gameId,
      ...gameData
    });
    
    return response.data;
  } catch (error) {
    console.error('Error updating game challenges:', error);
    // Don't throw the error to prevent breaking the game flow
    return { success: false, error: error.message };
  }
}
