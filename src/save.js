const CACHE_KEY = "gunita_save";

/**
 * Reads and parses the saved JSON from localStorage.
 * Returns null if none exists or if JSON parsing fails.
 * @returns {Object|null}
 */
export function getCache() {
  let savedData = null;
  try {
    const data = localStorage.getItem(CACHE_KEY);
    if (data) {
      savedData = JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to parse cached save:", e);
  }

  if (window.isExplorationMode) {
    return {
      player_id: "explorer",
      username: "Wanderer",
      is_exploration_mode: true,
      current_world: "Lunan",
      current_area: "Campo Lunan",
      position_x: 320,
      position_y: 360,
      has_talked_to_luma: true,
      has_completed_tutorial: savedData ? savedData.has_completed_tutorial : false,
      played_post_tutorial_dialogue: savedData ? savedData.played_post_tutorial_dialogue : false,
    };
  }

  if (savedData && (savedData.is_exploration_mode || savedData.player_id === "explorer")) {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
  return savedData;
}

/**
 * Stringifies and writes the player object to localStorage.
 * @param {Object} data 
 */
export function setCache(data) {
  if (window.isExplorationMode || (data && (data.is_exploration_mode || data.player_id === "explorer"))) {
    return;
  }
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to write to cache:", e);
  }
}

/**
 * Removes the cached save from localStorage.
 */
export function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (e) {
    console.error("Failed to clear cache:", e);
  }
}

export function getEssence() {
  const cache = getCache();
  if (cache && cache.essence !== undefined) {
    return cache.essence;
  }
  return 5; // Default max essence
}

export function setEssence(value) {
  const cache = getCache() || {};
  cache.essence = value;
  setCache(cache);
}
