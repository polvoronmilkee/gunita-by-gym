import { getCache, setCache } from "../save.js";

/**
 * Placeholder for old sync logic. Now a no-op since everything is offline.
 */
export async function syncOfflineData() {
  return;
}

/**
 * Save game state to the currently active slot.
 * @param {string} playerId (ignored in purely local mode)
 * @param {Object} stateData 
 */
export async function saveGameState(playerId, stateData) {
  const cache = getCache();
  if (cache) {
    setCache({
      ...cache,
      ...stateData
    });
  }
}

/**
 * Load game state from the active slot.
 */
export async function loadGameState(playerId) {
  return getCache();
}

/**
 * Adds an item to the local save slot inventory.
 */
export async function addInventoryItem(inventoryId, itemKey, itemType) {
  const cache = getCache();
  if (cache) {
    if (!cache.inventory) cache.inventory = [];
    if (!cache.inventory.includes(itemKey)) {
      cache.inventory.push(itemKey);
      setCache(cache);
    }
    return cache.inventory;
  }
}

/**
 * Loads inventory from the local save slot.
 */
export async function loadPlayerInventory(playerId) {
  const cache = getCache();
  if (cache && cache.inventory) {
    // Return them in the format expected by Grave1.js
    return cache.inventory.map(key => ({ item_key: key, item_type: "fragment" }));
  }
  return [];
}

/**
 * Clears the riddle tracking data from the active save slot (on death).
 */
export async function resetPlayerRiddles(playerId) {
  const cache = getCache();
  if (cache) {
    if (cache.completed_riddles) cache.completed_riddles = [];
    if (cache.riddle_progress) cache.riddle_progress = {};
    setCache(cache);
  }
}
