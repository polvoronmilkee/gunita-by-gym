const CACHE_KEY = "gunita_save";

/**
 * Reads and parses the saved JSON from localStorage.
 * Returns null if none exists or if JSON parsing fails.
 * @returns {Object|null}
 */
export function getCache() {
  try {
    const data = localStorage.getItem(CACHE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error("Failed to parse cached save:", e);
    return null;
  }
}

/**
 * Stringifies and writes the player object to localStorage.
 * @param {Object} data 
 */
export function setCache(data) {
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
