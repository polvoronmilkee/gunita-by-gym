const MAX_SLOTS = 6;
const ACTIVE_SLOT_KEY = "gunita_active_slot";

function getSlotKey(slotIndex) {
  return `gunita_slot_${slotIndex}`;
}

/**
 * Gets the current active slot index. Defaults to 1.
 */
export function getActiveSlot() {
  const slot = localStorage.getItem(ACTIVE_SLOT_KEY);
  return slot ? parseInt(slot, 10) : 1;
}

/**
 * Sets the active slot index for reading/writing.
 */
export function setActiveSlot(slotIndex) {
  if (slotIndex >= 1 && slotIndex <= MAX_SLOTS) {
    localStorage.setItem(ACTIVE_SLOT_KEY, slotIndex.toString());
  }
}

/**
 * Reads all 6 slots and returns an array of slot summaries for the UI.
 */
export function getAllSlots() {
  const slots = [];
  for (let i = 1; i <= MAX_SLOTS; i++) {
    const data = localStorage.getItem(getSlotKey(i));
    if (data) {
      try {
        const parsed = JSON.parse(data);
        slots.push({
          slotIndex: i,
          isEmpty: false,
          area: parsed.current_area || "Unknown",
          essence: parsed.essence !== undefined ? parsed.essence : 5,
          hasTalkedToLuma: parsed.has_talked_to_luma || false,
          hasCompletedTutorial: parsed.has_completed_tutorial || false
        });
      } catch (e) {
        slots.push({ slotIndex: i, isEmpty: true });
      }
    } else {
      slots.push({ slotIndex: i, isEmpty: true });
    }
  }
  return slots;
}

/**
 * Deletes the specified save slot.
 */
export function deleteSlot(slotIndex) {
  localStorage.removeItem(getSlotKey(slotIndex));
}

/**
 * Reads and parses the saved JSON from the currently active slot.
 * Returns null if none exists or if JSON parsing fails.
 * @returns {Object|null}
 */
export function getCache() {
  let parsed = null;
  try {
    const activeSlotKey = getSlotKey(getActiveSlot());
    const data = localStorage.getItem(activeSlotKey);
    if (data) {
      parsed = JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to parse cached save:", e);
    return null;
  }

  if (parsed && !parsed.player_id) {
    parsed.player_id = "local_user";
    try {
      const activeSlotKey = getSlotKey(getActiveSlot());
      localStorage.setItem(activeSlotKey, JSON.stringify(parsed));
    } catch (e) {
      console.error("Failed to auto-repair slot with player_id:", e);
    }
  }

  if (parsed && (parsed.is_exploration_mode || parsed.player_id === "explorer")) {
    const activeSlotKey = getSlotKey(getActiveSlot());
    localStorage.removeItem(activeSlotKey);
    parsed = null;
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
      has_completed_tutorial: parsed ? parsed.has_completed_tutorial : false,
      played_post_tutorial_dialogue: parsed ? parsed.played_post_tutorial_dialogue : false,
    };
  }

  return parsed;
}

/**
 * Stringifies and writes the player object to the currently active slot.
 * @param {Object} data 
 */
export function setCache(data) {
  if (window.isExplorationMode || (data && (data.is_exploration_mode || data.player_id === "explorer"))) {
    return;
  }
  try {
    const activeSlotKey = getSlotKey(getActiveSlot());
    localStorage.setItem(activeSlotKey, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to write to cache:", e);
  }
}

/**
 * Removes the cached save from the currently active slot.
 */
export function clearCache() {
  try {
    const activeSlotKey = getSlotKey(getActiveSlot());
    localStorage.removeItem(activeSlotKey);
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
