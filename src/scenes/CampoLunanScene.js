import Phaser from "phaser";
import { CameraSystem } from "../systems/CameraSystem.js";
import { HudOverlay } from "../ui/HudOverlay.js";
import { Player } from "../entities/Player.js";
import { GROUND_TILE_TEXTURE_KEY } from "../utils/groundTiles.js";

export class CampoLunanScene extends Phaser.Scene {
  constructor() {
    super("CampoLunanScene");
  }

  preload() {
    // Load the Vino spritesheet under the same key the player expects.
    this.load.spritesheet("vino-idle", "src/assets/vino-idle/vino-idle.png", {
      frameWidth: 208,
      frameHeight: 237,
    });
  }

  create() {
    this.worldWidth = 1280;
    this.worldHeight = 720;

    // Ground tile – ensure GROUND_TILE_TEXTURE_KEY is loaded elsewhere
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

    // Create the idle animation using the loaded spritesheet key.
    this.anims.create({
      key: "vino-idle",
      frames: this.anims.generateFrameNumbers("vino-idle", {
        start: 0,
        end: 3,
      }),
      frameRate: 8,
      repeat: -1,
    });

    // Player uses the same texture and animation keys.
    this.player = new Player(this, 320, 360);
    this.cursors = this.input.keyboard.createCursorKeys();

    // Camera setup
    CameraSystem.configureMainCamera(this, this.worldWidth, this.worldHeight);
    CameraSystem.follow(this, this.player.sprite);
    this.cameras.main.setZoom(4);
    // HUD
    this.hud = new HudOverlay(this);
    this.hud.setStatus("WASD / ARROWS TO MOVE   P PAUSE   M MEMORY");
    this.hud.setBackVisible(true);

    // Keyboard shortcuts
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
