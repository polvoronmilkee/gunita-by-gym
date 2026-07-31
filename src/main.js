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
import { getCache, setCache, clearCache } from "./save.js";
import { loginPlayer, signupPlayer, loadGameState } from "./utils/api.js";

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
      debug: false,
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

const continueModal = document.getElementById("continue-journey-modal");
const continueInput = document.getElementById("continue-username-input");
const continueError = document.getElementById("continue-modal-error");
const continueConfirmBtn = document.getElementById(
  "continue-modal-confirm-btn",
);
const continueCloseBtn = document.getElementById("continue-modal-close-btn");

const newModal = document.getElementById("new-journey-modal");
const newInput = document.getElementById("new-username-input");
const newError = document.getElementById("new-modal-error");
const newConfirmBtn = document.getElementById("new-modal-confirm-btn");
const newCancelBtn = document.getElementById("new-modal-cancel-btn");
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

function showContinueModal() {
  if (!continueModal) return;
  continueError.textContent = "";
  continueInput.value = "";
  continueModal.classList.remove("hidden");
  continueInput.focus();
}

function hideContinueModal() {
  if (!continueModal) return;
  continueModal.classList.add("hidden");
  continueError.textContent = "";
}

function showNewModal() {
  if (!newModal) return;
  newError.textContent = "";
  newInput.value = "";
  newModal.classList.remove("hidden");
  newInput.focus();
}

function hideNewModal() {
  if (!newModal) return;
  newModal.classList.add("hidden");
  newError.textContent = "";
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

// Continue Journey Button Event
document.getElementById("continue-journey")?.addEventListener("click", () => {
  const cache = getCache();
  if (cache && cache.player_id) {
    // Instantly load game if cache is present!
    startGame(null, {
      title: "Continuing Journey",
      subtitle: "Resuming Saved Echoes",
      hint: "Restoring your memories...",
    });
  } else {
    // Show continue journey login modal
    showContinueModal();
  }
});

// Start Again (New Game) Button Event
document.getElementById("enter-campo-lunan")?.addEventListener("click", () => {
  showNewModal();
});

document.getElementById("tale-untold")?.addEventListener("click", () => {
  setCache({
    player_id: "guest_account",
    username: "Guest",
    is_guest: true,
    current_world: "Lunan",
    current_area: "Campo Lunan",
    position_x: 320,
    position_y: 360,
  });
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
  document.getElementById("continue-journey"),
  document.getElementById("enter-campo-lunan"),
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
  
  if (event.key === "Escape" && guideOpen) {
    hideGuide();
    return;
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

// Continue Modal Listeners
continueCloseBtn?.addEventListener("click", hideContinueModal);

// New Modal Listeners
document.getElementById("new-modal-close-btn")?.addEventListener("click", hideNewModal);
newCancelBtn?.addEventListener("click", hideNewModal);

continueConfirmBtn?.addEventListener("click", async () => {
  const username = continueInput.value.trim().toLowerCase();
  if (!username) {
    if (continueError) continueError.textContent = "CODENAME IS REQUIRED";
    return;
  }

  try {
    if (continueError) continueError.textContent = "LOGGING IN...";
    const player = await loginPlayer(username);

    // Attempt to load existing game state from server
    let state;
    try {
      state = await loadGameState(player.id);
    } catch (e) {
      console.warn("No gamestate found on server, using defaults", e);
      state = {
        current_world: "Lunan",
        current_area: "Campo Lunan",
        position_x: 320,
        position_y: 360,
      };
    }

    const currentCache = getCache();
    if (currentCache && currentCache.username !== username) {
      clearCache();
    }

    setCache({
      player_id: player.id,
      username: player.username,
      inventory_id: player.inventory_id,
      current_world: state.current_world || "Lunan",
      current_area: state.current_area || "Campo Lunan",
      position_x: state.position_x !== undefined ? state.position_x : 320,
      position_y: state.position_y !== undefined ? state.position_y : 360,
    });

    hideContinueModal();
    startGame(null, {
      title: "Continuing Journey",
      subtitle: "Resuming Saved Echoes",
      hint: "Restoring your memories...",
    });
  } catch (err) {
    if (continueError) {
      continueError.textContent = err.message.toUpperCase();
    }
  }
});

newConfirmBtn?.addEventListener("click", async () => {
  const username = newInput.value.trim().toLowerCase();
  if (!username) {
    if (newError) newError.textContent = "CODENAME IS REQUIRED";
    return;
  }

  try {
    if (newError) newError.textContent = "REGISTERING...";
    const player = await signupPlayer(username);

    const defaultState = {
      current_world: "Lunan",
      current_area: "Campo Lunan",
      position_x: 320,
      position_y: 360,
    };

    const currentCache = getCache();
    if (currentCache && currentCache.username !== username) {
      clearCache();
    }

    setCache({
      player_id: player.id,
      username: player.username,
      inventory_id: player.inventory_id,
      ...defaultState,
    });

    hideNewModal();
    startGame(null, {
      title: "Entering Campo Lunan",
      subtitle: "Awakening the Echoes",
      hint: "Creating new journey...",
    });
  } catch (err) {
    if (newError) {
      newError.textContent = err.message.toUpperCase();
    }
  }
});
