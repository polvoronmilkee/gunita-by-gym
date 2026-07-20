import Phaser from "phaser";
import { SceneManager } from "./managers/SceneManager.js";
import { BootScene } from "./scenes/BootScene.js";
import { PreloadScene } from "./scenes/PreloadScene.js";
import { CampoLunanScene } from "./scenes/CampoLunanScene.js";
import { Grave1 } from "./scenes/Grave1.js";
import { MemoryScene } from "./scenes/MemoryScene.js";
import { UIScene } from "./scenes/UIScene.js";
import { PauseScene } from "./scenes/PauseScene.js";
import { BulletHellScene } from "./scenes/BulletHellScene.js";
import { LoadingScreen } from "./ui/LoadingScreen.js";
import { MenuAudioController } from "./ui/MenuAudioController.js";
import { getCache, setCache, clearCache } from "./save.js";
import { loginPlayer, signupPlayer, loadGameState } from "./utils/api.js";

const menuAssetUrls = [
  "/src/assets/main-menu/main-menu-bg.png",
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
  BulletHellScene,
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

async function initializeMenuScreen() {
  await Promise.all(menuAssetUrls.map((src) => preloadImage(src)));

  loadingScreen.hide();
  menuScreen?.classList.remove("hidden");
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

  menuScreen.classList.toggle("hidden", !visible);

  if (visible) {
    menuAudioController.resumeMusicIfEnabled();
  }
}

function setGameVisible(visible) {
  const gameShell = document.getElementById("game-shell");
  if (!gameShell) {
    return;
  }

  gameShell.classList.toggle("hidden", !visible);
}

function startGame() {
  loadingScreen.setContent({
    title: "Entering Campo Lunan",
    subtitle: "Awakening the Echoes",
    hint: "Please wait",
  });
  loadingScreen.show();

  setGameVisible(true);

  requestAnimationFrame(() => {
    setMenuVisible(false);
  });

  menuAudioController.stopMusic();

  if (!game) {
    game = new Phaser.Game(config);
    sceneManager.bindGame(game);
    game.events.once("game-ready", () => {
      loadingScreen.hide();
    });
  } else {
    game.canvas?.focus?.();
    loadingScreen.hide();
  }
}

window.startGunitaGame = startGame;
window.returnToGunitaMenu = () => {
  if (game) {
    game.destroy(true);
    game = null;
  }

  setGameVisible(false);
  requestAnimationFrame(() => {
    setMenuVisible(true);
  });
};

// Continue Journey Button Event
document.getElementById("continue-journey")?.addEventListener("click", () => {
  const cache = getCache();
  if (cache && cache.player_id) {
    // Instantly load game if cache is present!
    startGame();
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
  startGame("MemoryScene");
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

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    guideOverlay &&
    !guideOverlay.classList.contains("hidden")
  ) {
    hideGuide();
  }
});

// Continue Modal Listeners
continueCloseBtn?.addEventListener("click", hideContinueModal);

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
    startGame();
  } catch (err) {
    if (continueError) {
      continueError.textContent = err.message.toUpperCase();
    }
  }
});

// New Modal Listeners
newCancelBtn?.addEventListener("click", hideNewModal);

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
    startGame();
  } catch (err) {
    if (newError) {
      newError.textContent = err.message.toUpperCase();
    }
  }
});
