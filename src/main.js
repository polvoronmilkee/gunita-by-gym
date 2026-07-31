import Phaser from "phaser";
import { SceneManager } from "./managers/SceneManager.js";
import { BootScene } from "./scenes/BootScene.js";
import { PreloadScene } from "./scenes/PreloadScene.js";
import { CampoLunanScene } from "./scenes/CampoLunanScene.js";
import { Grave1 } from "./scenes/Grave1.js";
import { MemoryScene } from "./scenes/MemoryScene.js";
import { UIScene } from "./scenes/UIScene.js";
import { PauseScene } from "./scenes/PauseScene.js";
import { FragmentRedWarningFlag } from "./scenes/FragmentRedWarningFlag.js";
import { FragmentRosary } from "./scenes/FragmentRosary.js";
import { FragmentFishBasket } from "./scenes/FragmentFishBasket.js";
import { FragmentDaughtersDrawing } from "./scenes/FragmentDaughtersDrawing.js";
import { TutorialBulletHell } from "./scenes/TutorialBulletHell.js";
import { FinalBossFisherman } from "./scenes/FinalBossFisherman.js";
import { FamilyHomeScene } from "./scenes/FamilyHomeScene.js";
import { LoadingScreen } from "./ui/LoadingScreen.js";
import { MenuAudioController } from "./ui/MenuAudioController.js";
import { getCache, setCache, clearCache, getAllSlots, deleteSlot, setActiveSlot } from "./save.js";
import { connectAndUnlock } from "./utils/portalApi.js";

const menuAssetUrls = [
  "/src/assets/main-menu/main-menu-bg-purple.png",
  "/src/assets/main-menu/tagline.png",
  "/src/assets/main-menu/gunita-text-glowing-2.png",
];

const sceneManager = new SceneManager([
  BootScene,
  PreloadScene,
  CampoLunanScene,
  Grave1,
  MemoryScene,
  UIScene,
  PauseScene,
  FragmentRedWarningFlag,
  FragmentRosary,
  FragmentFishBasket,
  FragmentDaughtersDrawing,
  TutorialBulletHell,
  FinalBossFisherman,
  FamilyHomeScene,
]);

const config = {
  type: Phaser.AUTO,
  parent: "game-container",
  backgroundColor: "#0b1020",
  pixelArt: true,
  render: {
    antialias: false,
    roundPixels: true,
  },
  dom: {
    createContainer: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: true,
    },
  },
  scene: sceneManager.build(),
};

let game = null;

const loadingScreen = new LoadingScreen({
  title: "Loading Memories",
  subtitle: "Preparing the Echoes",
  hint: "Please wait",
});
const menuScreen = document.getElementById("menu-screen");
const menuMusicToggle = document.getElementById("menu-music-toggle");
const menuSfxToggle = document.getElementById("menu-sfx-toggle");
const menuAudioController = new MenuAudioController({
  musicButton: menuMusicToggle,
  sfxButton: menuSfxToggle,
});

function preloadImage(src) {
  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => resolve({ src, ok: true });
    image.onerror = () => resolve({ src, ok: false });
    image.src = src;
  });
}

function initializeMenuScreen() {
  loadingScreen.hide();
  setMenuVisible(true);
  Promise.all(menuAssetUrls.map((src) => preloadImage(src))).catch(() => {});
}

initializeMenuScreen();

const saveModal = document.getElementById("save-slot-modal");
const saveSlotsContainer = document.getElementById("save-slots-container");
const saveError = document.getElementById("save-modal-error");
const saveCloseBtn = document.getElementById("save-modal-close-btn");
if (saveCloseBtn) {
  saveCloseBtn.addEventListener("click", () => {
    hideSaveModal();
  });
}
const continueBtn = document.getElementById("continue-journey-btn");
const newBtn = document.getElementById("new-journey-btn");
const connectPortalBtn = document.getElementById("connect-portal-btn");
const guideButton = document.getElementById("menu-guide");
const guideOverlay = document.getElementById("survival-guide-overlay");
const guideCloseButton = document.getElementById("survival-guide-close");
const guideTabButtons = Array.from(
  document.querySelectorAll(".guide-nav__button"),
);
const guideTabPanels = Array.from(document.querySelectorAll(".guide-tab"));

function setGuideTab(tabId) {
  guideTabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.guideTab === tabId);
  });

  guideTabPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.guideContent === tabId);
  });
}

function showGuide() {
  if (!guideOverlay) return;
  guideOverlay.classList.remove("hidden");
  guideOverlay.setAttribute("aria-hidden", "false");
  setGuideTab("about");
}

function hideGuide() {
  if (!guideOverlay) return;
  guideOverlay.classList.add("hidden");
  guideOverlay.setAttribute("aria-hidden", "true");
}

function showConfirmModal(title, message, onConfirm) {
  const modal = document.getElementById("confirm-modal");
  const titleEl = document.getElementById("confirm-modal-title");
  const msgEl = document.getElementById("confirm-modal-message");
  const yesBtn = document.getElementById("confirm-modal-yes-btn");
  const cancelBtn = document.getElementById("confirm-modal-cancel-btn");

  if (!modal) return;

  titleEl.textContent = title;
  msgEl.textContent = message;

  const cleanup = () => {
    modal.classList.add("hidden");
    yesBtn.onclick = null;
    cancelBtn.onclick = null;
  };

  yesBtn.onclick = () => {
    cleanup();
    onConfirm();
  };

  cancelBtn.onclick = () => {
    cleanup();
  };

  modal.classList.remove("hidden");
}

let currentModalMode = "continue"; // 'continue' or 'new'

function renderSaveSlots(mode = currentModalMode) {
  currentModalMode = mode;
  if (!saveSlotsContainer) return;
  saveSlotsContainer.innerHTML = "";
  if (saveError) saveError.textContent = "";
  const slots = getAllSlots();
  
  let slotsToRender = slots;
  if (mode === "continue") {
    slotsToRender = slots.filter(slot => !slot.isEmpty);
    if (slotsToRender.length === 0) {
      saveSlotsContainer.innerHTML = `<p style="color: var(--text-light); text-align: center; font-family: 'VT323'; font-size: 1.2rem; padding: 20px;">No saved memories found. Please start a New Memory.</p>`;
      return;
    }
  }

  slotsToRender.forEach(slot => {
    const slotDiv = document.createElement("div");
    slotDiv.style.width = "360px";
    slotDiv.style.height = "52px";
    slotDiv.style.boxSizing = "border-box";
    slotDiv.style.display = "flex";
    slotDiv.style.justifyContent = "space-between";
    slotDiv.style.alignItems = "center";
    slotDiv.style.padding = "0 16px";
    slotDiv.style.border = "1px solid rgba(45, 212, 191, 0.4)";
    slotDiv.style.borderRadius = "4px";
    slotDiv.style.background = "rgba(20, 23, 43, 0.9)";
    slotDiv.style.cursor = "pointer";
    slotDiv.style.transition = "border-color 0.2s, box-shadow 0.2s";

    slotDiv.onmouseenter = () => {
      slotDiv.style.borderColor = "var(--teal)";
      slotDiv.style.boxShadow = "0 0 8px rgba(45, 212, 191, 0.3)";
    };
    slotDiv.onmouseleave = () => {
      slotDiv.style.borderColor = "rgba(45, 212, 191, 0.4)";
      slotDiv.style.boxShadow = "none";
    };

    if (slot.isEmpty) {
      slotDiv.innerHTML = `
        <span style="color: var(--text-light); font-family: 'VT323'; font-size: 1.2rem;">Slot ${slot.slotIndex}: — Empty —</span>
      `;
      slotDiv.onclick = () => {
        showConfirmModal(
          "✦ START NEW MEMORY ✦",
          `Create a new save file on Slot ${slot.slotIndex}?`,
          () => {
            setActiveSlot(slot.slotIndex);
            setCache({
              current_world: "Lunan",
              current_area: "Campo Lunan",
              position_x: 320,
              position_y: 360,
            });
            hideSaveModal();
            startGame(null, { title: "Entering Campo Lunan", subtitle: "Awakening the Echoes", hint: "Creating new journey..." });
          }
        );
      };
    } else {
      slotDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="color: var(--gold-accent); font-family: 'VT323'; font-size: 1.2rem;">Slot ${slot.slotIndex}</span>
          <span style="color: var(--text-light); font-family: 'VT323'; font-size: 1.05rem;">Area: ${slot.area}</span>
        </div>
        <button class="delete-slot-btn" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #ef4444; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 1.1rem; transition: all 0.2s;" title="Delete Slot">🗑️</button>
      `;
      
      slotDiv.onclick = () => {
        if (mode === "continue") {
          setActiveSlot(slot.slotIndex);
          hideSaveModal();
          startGame(null, { title: "Continuing Journey", subtitle: "Resuming Saved Echoes", hint: "Restoring your memories..." });
        } else {
          if (saveError) saveError.textContent = "Please delete the slot first to start a new game here.";
        }
      };

      const delBtn = slotDiv.querySelector(".delete-slot-btn");
      if (delBtn) {
        delBtn.onmouseenter = () => {
          delBtn.style.background = "rgba(239, 68, 68, 0.3)";
          delBtn.style.borderColor = "#ef4444";
        };
        delBtn.onmouseleave = () => {
          delBtn.style.background = "rgba(239, 68, 68, 0.15)";
          delBtn.style.borderColor = "rgba(239, 68, 68, 0.4)";
        };
        delBtn.onclick = (e) => {
          e.stopPropagation();
          showConfirmModal(
            "✦ DELETE SAVE SLOT ✦",
            `Are you sure you want to delete Slot ${slot.slotIndex}? This cannot be undone.`,
            () => {
              deleteSlot(slot.slotIndex);
              renderSaveSlots(mode);
            }
          );
        };
      }
    }
    
    saveSlotsContainer.appendChild(slotDiv);
  });
}

function showSaveModal(mode) {
  if (!saveModal) return;
  renderSaveSlots(mode);
  saveModal.classList.remove("hidden");
}

function hideSaveModal() {
  if (!saveModal) return;
  saveModal.classList.add("hidden");
  if (saveError) saveError.textContent = "";
}

function setMenuVisible(visible) {
  if (!menuScreen) {
    return;
  }

  if (visible) {
    menuScreen.style.display = "block";
    requestAnimationFrame(() => {
      menuScreen.classList.remove("hidden");
    });
    menuAudioController.resumeMusicIfEnabled();
  } else {
    menuScreen.classList.add("hidden");
    setTimeout(() => {
      if (menuScreen.classList.contains("hidden")) {
        menuScreen.style.display = "none";
      }
    }, 450);
  }
}

function setGameVisible(visible) {
  const gameShell = document.getElementById("game-shell");
  if (!gameShell) {
    return;
  }

  gameShell.classList.toggle("hidden", !visible);
}

function startGame(initialScene, loadingOptions = {}) {
  loadingScreen.setContent({
    title: loadingOptions.title || "Entering Campo Lunan",
    subtitle: loadingOptions.subtitle || "Awakening the Echoes",
    hint: loadingOptions.hint || "Please wait",
  });
  loadingScreen.show();

  setGameVisible(true);

  requestAnimationFrame(() => {
    setMenuVisible(false);
  });

  menuAudioController.stopMusic();

  if (initialScene) {
    window.initialScene = initialScene;
  } else {
    window.initialScene = null;
  }

  if (!game) {
    game = new Phaser.Game(config);
    sceneManager.bindGame(game);
    game.events.once("game-ready", () => {
      loadingScreen.hide();
    });
  } else {
    if (initialScene) {
      sceneManager.start(initialScene);
    } else {
      const cache = getCache();
      const currentArea = cache?.current_area;
      if (currentArea === "Grave 1" || currentArea === "Grave1") {
        sceneManager.start("Grave1");
      } else if (currentArea === "FamilyHomeScene" || currentArea === "FamilyHome") {
        sceneManager.start("FamilyHomeScene");
      } else {
        sceneManager.start("CampoLunanScene");
      }
    }
    game.canvas?.focus?.();
    loadingScreen.hide();
  }
}

window.startGunitaGame = startGame;
window.returnToGunitaMenu = () => {
  window.isExplorationMode = false;
  loadingScreen.setContent({
    title: "RETURNING",
    subtitle: "BACK TO MAIN MENU",
    hint: "Leaving the memory world...",
  });
  loadingScreen.show();

  setTimeout(() => {
    setGameVisible(false);
    requestAnimationFrame(() => {
      setMenuVisible(true);
    });

    if (game) {
      game.destroy(true);
      game = null;
    }

    setTimeout(() => {
      loadingScreen.hide();
    }, 600);
  }, 450);
};

// Initial UI State (Bypassed Portal Auth for testing)
// Buttons are already visible via HTML structure, no dynamic overrides needed now

connectPortalBtn?.addEventListener("click", async () => {
  const title = document.getElementById("connect-portal-title");
  const desc = document.getElementById("connect-portal-desc");
  if (title) title.textContent = "CONNECTING...";
  if (desc) desc.textContent = "Please authorize in the new tab";
  
  // Unlock Artifact 1 (Vino Soul) at start
  const GAME_ID_1 = "YOUR_GAME_ID_1_HERE"; 
  const success = await connectAndUnlock(GAME_ID_1);
  
  if (success) {
    localStorage.setItem("gunita_portal_authorized", "true");
    if (connectPortalBtn) connectPortalBtn.style.display = "none";
    if (playBtn) playBtn.style.display = "flex";
  } else {
    if (title) title.textContent = "CONNECTION FAILED";
    if (desc) desc.textContent = "Click to try again";
  }
});

// Continue Journey Button Event
continueBtn?.addEventListener("click", () => {
  document.querySelector(".gunita-modal__title").textContent = "✦ CONTINUE JOURNEY ✦";
  showSaveModal("continue");
});

// New Journey Button Event
newBtn?.addEventListener("click", () => {
  document.querySelector(".gunita-modal__title").textContent = "✦ START NEW MEMORY ✦";
  showSaveModal("new");
});

document.getElementById("tale-untold")?.addEventListener("click", () => {
  window.isExplorationMode = true;
  startGame("CampoLunanScene");
});

guideButton?.addEventListener("click", () => {
  showGuide();
});

guideCloseButton?.addEventListener("click", () => {
  hideGuide();
});

guideOverlay?.addEventListener("click", (event) => {
  if (event.target === guideOverlay) {
    hideGuide();
  }
});

guideTabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setGuideTab(button.dataset.guideTab ?? "about");
  });
});

// Main Menu Keyboard Navigation
let selectedMenuIndex = 0;
const menuButtons = [
  document.getElementById("continue-journey-btn"),
  document.getElementById("new-journey-btn"),
  document.getElementById("tale-untold"),
  document.getElementById("menu-guide")
].filter(Boolean);

function updateMenuSelection() {
  menuButtons.forEach((btn, idx) => {
    if (idx === selectedMenuIndex) {
      btn.classList.add("selected");
      btn.focus();
    } else {
      btn.classList.remove("selected");
    }
  });
}

// Sync mouse hover with keyboard selection
menuButtons.forEach((btn, idx) => {
  btn.addEventListener("mouseover", () => {
    const continueModalOpen = document.getElementById("continue-journey-modal") && !document.getElementById("continue-journey-modal").classList.contains("hidden");
    const newModalOpen = document.getElementById("new-journey-modal") && !document.getElementById("new-journey-modal").classList.contains("hidden");
    const guideOpen = guideOverlay && !guideOverlay.classList.contains("hidden");
    
    if (!continueModalOpen && !newModalOpen && !guideOpen) {
      selectedMenuIndex = idx;
      updateMenuSelection();
    }
  });
});

// Set initial selection once DOM is fully ready
setTimeout(updateMenuSelection, 300);

document.addEventListener("keydown", (event) => {
  const guideOpen = guideOverlay && !guideOverlay.classList.contains("hidden");
  const saveOpen = document.getElementById("save-slot-modal") && !document.getElementById("save-slot-modal").classList.contains("hidden");
  
  if (event.key === "Escape") {
    if (guideOpen) {
      hideGuide();
      return;
    } else if (saveOpen) {
      hideSaveModal();
      return;
    }
  }

  // Handle main menu navigation when menu is active and no modals are open
  const menuActive = menuScreen && !menuScreen.classList.contains("hidden");
  const continueModalOpen = document.getElementById("continue-journey-modal") && !document.getElementById("continue-journey-modal").classList.contains("hidden");
  const newModalOpen = document.getElementById("new-journey-modal") && !document.getElementById("new-journey-modal").classList.contains("hidden");

  if (menuActive && !continueModalOpen && !newModalOpen && !guideOpen) {
    if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
      event.preventDefault();
      selectedMenuIndex = (selectedMenuIndex - 1 + menuButtons.length) % menuButtons.length;
      updateMenuSelection();
    } else if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
      event.preventDefault();
      selectedMenuIndex = (selectedMenuIndex + 1) % menuButtons.length;
      updateMenuSelection();
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      menuButtons[selectedMenuIndex]?.click();
    }
  }
});

window.showSurvivalGuide = showGuide;
window.hideSurvivalGuide = hideGuide;

// Modal Listeners
saveCloseBtn?.addEventListener("click", hideSaveModal);
