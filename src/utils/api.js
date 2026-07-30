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

      // Sync the local inventory items to the server
      const localItems = JSON.parse(localStorage.getItem("gunita_local_inventory_items") || "[]");
      if (localItems.length > 0) {
        for (const item of localItems) {
          let targetInvId = item.inventory_id;
          if (targetInvId === oldId || targetInvId.startsWith("local_")) {
            targetInvId = player.inventory_id;
          }
          try {
            await fetch(`${API_BASE_URL}/inventory/items`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ inventory_id: targetInvId, item_key: item.item_key, item_type: item.item_type })
            });
          } catch (e) {
            console.warn("Failed to sync item:", item.item_key, e.message);
          }
        }
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

/**
 * Add an item to the player's inventory, falling back to local storage if offline.
 */
export async function addInventoryItem(inventoryId, itemKey, itemType) {
  // Always update main game cache first for instant sync
  const cache = getCache();
  if (cache) {
    if (!cache.inventory) cache.inventory = [];
    if (!cache.inventory.includes(itemKey)) {
      cache.inventory.push(itemKey);
      setCache(cache);
    }
  }

  // Then save to local fallback inventory storage
  const localItems = JSON.parse(localStorage.getItem("gunita_local_inventory_items") || "[]");
  const exists = localItems.some(item => item.inventory_id === inventoryId && item.item_key === itemKey);
  if (!exists) {
    localItems.push({ inventory_id: inventoryId, item_key: itemKey, item_type: itemType });
    localStorage.setItem("gunita_local_inventory_items", JSON.stringify(localItems));
  }

  const online = await isServerOnline();
  if (online && inventoryId && !inventoryId.startsWith("local_")) {
    try {
      const response = await fetch(`${API_BASE_URL}/inventory/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventory_id: inventoryId, item_key: itemKey, item_type: itemType })
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn("Failed to add inventory item on server, saved locally:", err.message);
    }
  }
}

/**
 * Reset player riddles upon death.
 */
export async function resetPlayerRiddles(playerId) {
  const online = await isServerOnline();
  if (online && !playerId.startsWith("local_")) {
    try {
      const response = await fetch(`${API_BASE_URL}/riddles/${playerId}`, {
        method: "DELETE"
      });
      if (!response.ok) {
        console.warn("Failed to reset riddles on server");
      }
    } catch (err) {
      console.warn("Error resetting riddles on server:", err);
    }
  }
}

/**
 * Load the player's inventory items from server or local cache.
 */
export async function loadPlayerInventory(playerId) {
  const online = await isServerOnline();
  if (online && playerId && !playerId.startsWith("local_")) {
    try {
      const response = await fetch(`${API_BASE_URL}/inventory/${playerId}`).then(r => r.json());
      localStorage.setItem(`gunita_local_inventory_${playerId}`, JSON.stringify(response.items || []));
      return response.items || [];
    } catch (err) {
      console.warn("Failed to load inventory from server, trying local cache:", err.message);
    }
  }

  // Offline / local cache fallback
  const localItems = JSON.parse(localStorage.getItem(`gunita_local_inventory_${playerId}`) || "[]");
  const localAll = JSON.parse(localStorage.getItem("gunita_local_inventory_items") || "[]");
  const filtered = localAll
    .filter(item => item.inventory_id === playerId)
    .map(item => ({ item_key: item.item_key, item_type: item.item_type }));

  const combined = [...localItems];
  filtered.forEach(f => {
    if (!combined.some(c => c.item_key === f.item_key)) {
      combined.push(f);
    }
  });

  return combined;
}

