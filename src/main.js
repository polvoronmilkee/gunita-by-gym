import Phaser from "phaser";
import { SceneManager } from "./managers/SceneManager.js";
import { BootScene } from "./scenes/BootScene.js";
import { PreloadScene } from "./scenes/PreloadScene.js";
import { CampoLunanScene } from "./scenes/CampoLunanScene.js";
import { MemoryScene } from "./scenes/MemoryScene.js";
import { UIScene } from "./scenes/UIScene.js";
import { PauseScene } from "./scenes/PauseScene.js";

const sceneManager = new SceneManager([
  BootScene,
  PreloadScene,
  CampoLunanScene,
  MemoryScene,
  UIScene,
  PauseScene,
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

function setMenuVisible(visible) {
  const menuScreen = document.getElementById("menu-screen");
  if (!menuScreen) {
    return;
  }

  menuScreen.classList.toggle("hidden", !visible);
}

function setGameVisible(visible) {
  const gameShell = document.getElementById("game-shell");
  if (!gameShell) {
    return;
  }

  gameShell.classList.toggle("hidden", !visible);
}

function startGame() {
  setGameVisible(true);

  requestAnimationFrame(() => {
    setMenuVisible(false);
  });

  if (!game) {
    game = new Phaser.Game(config);
    sceneManager.bindGame(game);
  } else {
    game.canvas?.focus?.();
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

document.getElementById("start-journey")?.addEventListener("click", startGame);

