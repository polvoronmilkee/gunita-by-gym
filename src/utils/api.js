const API_BASE_URL = "http://localhost:3000";

/**
 * Log in an existing player by username.
 * @param {string} username 
 * @returns {Promise<Object>}
 */
export async function loginPlayer(username) {
  const response = await fetch(`${API_BASE_URL}/players?username=${encodeURIComponent(username)}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to log in");
  }
  return response.json();
}

/**
 * Sign up/register a new player.
 * @param {string} username 
 * @returns {Promise<Object>}
 */
export async function signupPlayer(username) {
  const response = await fetch(`${API_BASE_URL}/players`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to sign up");
  }
  return response.json();
}

/**
 * Load the game state coordinates for a given player ID.
 * @param {string} playerId 
 * @returns {Promise<Object>}
 */
export async function loadGameState(playerId) {
  const response = await fetch(`${API_BASE_URL}/gamestate/${playerId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to load game state");
  }
  return response.json();
}

/**
 * Save/update the game state coordinates in the database.
 * @param {string} playerId 
 * @param {Object} stateData { current_world, current_area, position_x, position_y }
 * @returns {Promise<Object>}
 */
export async function saveGameState(playerId, stateData) {
  const response = await fetch(`${API_BASE_URL}/gamestate/${playerId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(stateData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to save game state");
  }
  return response.json();
}
