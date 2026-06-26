import Phaser from "phaser";
import { SceneManager } from "./managers/SceneManager.js";
import { BootScene } from "./scenes/BootScene.js";
import { PreloadScene } from "./scenes/PreloadScene.js";
import { MainMenuScene } from "./scenes/MainMenuScene.js";
import { CampoLunanScene } from "./scenes/CampoLunanScene.js";
import { MemoryScene } from "./scenes/MemoryScene.js";
import { UIScene } from "./scenes/UIScene.js";
import { PauseScene } from "./scenes/PauseScene.js";

const sceneManager = new SceneManager([
  BootScene,
  PreloadScene,
  MainMenuScene,
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

const game = new Phaser.Game(config);

sceneManager.bindGame(game);
