import Phaser from "phaser";
import { CameraSystem } from "../systems/CameraSystem.js";
import { HudOverlay } from "../ui/HudOverlay.js";
import { Player } from "../entities/Player.js";
import { GROUND_TILE_TEXTURE_KEY } from "../utils/groundTiles.js";

export class CampoLunanScene extends Phaser.Scene {
  constructor() {
    super("CampoLunanScene");
  }

  create() {
    this.worldWidth = 1280;
    this.worldHeight = 720;

    this.add
      .tileSprite(
        0,
        0,
        this.worldWidth,
        this.worldHeight,
        GROUND_TILE_TEXTURE_KEY,
      )
      .setOrigin(0)
      .setDepth(-2);

    this.player = new Player(this, 320, 360);
    this.cursors = this.input.keyboard.createCursorKeys();

    CameraSystem.configureMainCamera(this, this.worldWidth, this.worldHeight);
    CameraSystem.follow(this, this.player.sprite);
    this.cameras.main.setZoom(2);

    this.hud = new HudOverlay(this);
    this.hud.setStatus("WASD / ARROWS TO MOVE   P PAUSE   M MEMORY");
    this.hud.setBackVisible(true);

    this.input.keyboard.on("keydown-P", () => {
      this.scene.launch("PauseScene");
      this.scene.pause();
    });

    this.input.keyboard.on("keydown-M", () => {
      this.scene.launch("MemoryScene");
      this.scene.pause();
    });

    this.input.keyboard.on("keydown-BACKSPACE", () => {
      window.returnToGunitaMenu?.();
    });
  }

  update() {
    this.player.update(this.cursors);
  }
}
