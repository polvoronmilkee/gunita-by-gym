import { getCache, setCache } from "../save.js";

const API_BASE_URL = "http://localhost:3000";

// Internal helper to check if server is reachable
async function isServerOnline() {
  try {
    const response = await fetch(`${API_BASE_URL}/`, { method: "GET" });
    return response.ok;
  } catch (err) {
    return false;
  }
}

// Server API wrappers (matching original behavior)
async function loginPlayerToServer(username) {
  const response = await fetch(`${API_BASE_URL}/players?username=${encodeURIComponent(username)}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to log in");
  }
  return response.json();
}

async function signupPlayerToServer(username) {
  const response = await fetch(`${API_BASE_URL}/players`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to sign up");
  }
  return response.json();
}

async function saveGameStateToServer(playerId, stateData) {
  const response = await fetch(`${API_BASE_URL}/gamestate/${playerId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(stateData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to save game state");
  }
  return response.json();
}

/**
 * Log in a player, falling back to local Storage if offline.
 */
export async function loginPlayer(username) {
  const online = await isServerOnline();
  if (online) {
    try {
      const player = await loginPlayerToServer(username);
      // Cache this player locally in case they go offline later
      const localPlayers = JSON.parse(localStorage.getItem("gunita_local_players") || "{}");
      localPlayers[username] = player;
      localStorage.setItem("gunita_local_players", JSON.stringify(localPlayers));
      return player;
    } catch (err) {
      // If server explicitly returns an error (like user not found), throw it
      throw err;
    }
  }

  // Offline Fallback
  const localPlayers = JSON.parse(localStorage.getItem("gunita_local_players") || "{}");
  if (localPlayers[username]) {
    return localPlayers[username];
  }
  throw new Error("Offline: Codename not found locally. Switch online to login.");
}

/**
 * Register a player, falling back to local Storage if offline.
 */
export async function signupPlayer(username) {
  const online = await isServerOnline();
  if (online) {
    const player = await signupPlayerToServer(username);
    const localPlayers = JSON.parse(localStorage.getItem("gunita_local_players") || "{}");
    localPlayers[username] = player;
    localStorage.setItem("gunita_local_players", JSON.stringify(localPlayers));
    return player;
  }

  // Offline Fallback
  const localPlayers = JSON.parse(localStorage.getItem("gunita_local_players") || "{}");
  if (localPlayers[username]) {
    throw new Error("Offline: Codename already taken locally.");
  }

  const localPlayer = {
    id: `local_${username}_${Date.now()}`,
    username: username,
    inventory_id: `local_inv_${username}`,
  };

  localPlayers[username] = localPlayer;
  localStorage.setItem("gunita_local_players", JSON.stringify(localPlayers));

  // Add to sync queue
  const queue = JSON.parse(localStorage.getItem("gunita_sync_queue") || "[]");
  if (!queue.includes(username)) {
    queue.push(username);
    localStorage.setItem("gunita_sync_queue", JSON.stringify(queue));
  }

  return localPlayer;
}

/**
 * Load gamestate, falling back to local Storage if offline.
 */
export async function loadGameState(playerId) {
  const online = await isServerOnline();
  if (online && !playerId.startsWith("local_")) {
    try {
      const state = await fetch(`${API_BASE_URL}/gamestate/${playerId}`).then(r => r.json());
      const localStates = JSON.parse(localStorage.getItem("gunita_local_gamestates") || "{}");
      localStates[playerId] = state;
      localStorage.setItem("gunita_local_gamestates", JSON.stringify(localStates));
      return state;
    } catch (err) {
      console.warn("Failed to load from server, trying local states:", err.message);
    }
  }

  // Offline Fallback
  const localStates = JSON.parse(localStorage.getItem("gunita_local_gamestates") || "{}");
  if (localStates[playerId]) {
    return localStates[playerId];
  }
  throw new Error("No local game state found.");
}

/**
 * Save gamestate, falling back to local Storage if offline.
 */
export async function saveGameState(playerId, stateData) {
  // Always save locally first
  const localStates = JSON.parse(localStorage.getItem("gunita_local_gamestates") || "{}");
  localStates[playerId] = stateData;
  localStorage.setItem("gunita_local_gamestates", JSON.stringify(localStates));

  const online = await isServerOnline();
  if (online && !playerId.startsWith("local_")) {
    try {
      return await saveGameStateToServer(playerId, stateData);
    } catch (err) {
      console.warn("Failed to save to server, saved locally instead.");
    }
  }

  // Queue for sync if it's a local player or if server sync failed
  const cache = getCache();
  if (cache && cache.username) {
    const queue = JSON.parse(localStorage.getItem("gunita_sync_queue") || "[]");
    if (!queue.includes(cache.username)) {
      queue.push(cache.username);
      localStorage.setItem("gunita_sync_queue", JSON.stringify(queue));
    }
  }

  return stateData;
}

/**
 * Synchronize offline registrations and game states when online.
 */
export async function syncOfflineData() {
  const online = await isServerOnline();
  if (!online) return;

  const queue = JSON.parse(localStorage.getItem("gunita_sync_queue") || "[]");
  if (queue.length === 0) return;

  const localPlayers = JSON.parse(localStorage.getItem("gunita_local_players") || "{}");
  const localStates = JSON.parse(localStorage.getItem("gunita_local_gamestates") || "{}");
  const remainingQueue = [];

  for (const username of queue) {
    const player = localPlayers[username];
    if (!player) continue;

    try {
      let serverPlayer;
      if (player.id.startsWith("local_")) {
        try {
          serverPlayer = await signupPlayerToServer(username);
        } catch (e) {
          // If username exists on server, retrieve existing profile
          serverPlayer = await loginPlayerToServer(username);
        }

        const oldId = player.id;
        player.id = serverPlayer.id;
        player.inventory_id = serverPlayer.inventory_id;
        localPlayers[username] = player;

        // Migrate local state to the new server ID
        if (localStates[oldId]) {
          localStates[player.id] = localStates[oldId];
          delete localStates[oldId];
        }
      } else {
        serverPlayer = player;
      }

      // Sync the game state to the server
      const state = localStates[player.id];
      if (state) {
        await saveGameStateToServer(player.id, state);
      }
    } catch (err) {
      console.error(`Failed to sync player ${username}:`, err.message);
      remainingQueue.push(username);
    }
  }

  localStorage.setItem("gunita_local_players", JSON.stringify(localPlayers));
  localStorage.setItem("gunita_local_gamestates", JSON.stringify(localStates));
  localStorage.setItem("gunita_sync_queue", JSON.stringify(remainingQueue));

  // If the active session is one of the synced users, update active cache
  const activeCache = getCache();
  if (activeCache && activeCache.username && localPlayers[activeCache.username]) {
    const syncedPlayer = localPlayers[activeCache.username];
    if (syncedPlayer.id !== activeCache.player_id) {
      activeCache.player_id = syncedPlayer.id;
      activeCache.inventory_id = syncedPlayer.inventory_id;
      setCache(activeCache);
    }
  }
}
