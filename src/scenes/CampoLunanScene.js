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
    // Idle spritesheet
    this.load.spritesheet("vino-idle", "src/assets/vino-spritesheets/vino-idle/vino-idle.png", {
      frameWidth: 208,
      frameHeight: 237,
    });

    // Moving up spritesheet
    this.load.spritesheet("vino-moving-up", "src/assets/vino-spritesheets/vino-moving-up.png", {
      frameWidth: 208,
      frameHeight: 237,
    });

       // Moving left spritesheet
    this.load.spritesheet("vino-moving-left", "src/assets/vino-spritesheets/vino-moving-left.png", {     
      frameWidth: 208,
      frameHeight: 237,
    });

    // Moving right spritesheet
    this.load.spritesheet("vino-moving-right", "src/assets/vino-spritesheets/vino-moving-right.png", {
      frameWidth: 208,
      frameHeight: 237,
    });

    // Moving down spritesheet
    this.load.spritesheet("vino-moving-down", "src/assets/vino-spritesheets/vino-moving-down.png", {
      frameWidth: 208,
      frameHeight: 237,
    });
  }

  create() {
    this.worldWidth = 1280;
    this.worldHeight = 720;

    this.add
      .tileSprite(0, 0, this.worldWidth, this.worldHeight, GROUND_TILE_TEXTURE_KEY)
      .setOrigin(0)
      .setDepth(-2);

    // Idle animation (frames 0–4 because you have 5 frames)
    this.anims.create({
      key: "vino-idle",
      frames: this.anims.generateFrameNumbers("vino-idle", { start: 0, end: 4 }),
      frameRate: 8,
      repeat: -1,
    });

    // Moving up animation (adjust start/end to match your frame count)
    this.anims.create({
      key: "vino-moving-up",
      frames: this.anims.generateFrameNumbers("vino-moving-up", { start: 0, end: 4 }), // assuming 5 frames too
      frameRate: 8,
      repeat: -1,
    });

    // Moving left animation
    this.anims.create({
      key: "vino-moving-left",
      frames: this.anims.generateFrameNumbers("vino-moving-left", { start: 0, end: 4 }), // assuming 5 frames too
      frameRate: 8,
      repeat: -1, 
    });

    // Moving right animation
    this.anims.create({
      key: "vino-moving-right",
      frames: this.anims.generateFrameNumbers("vino-moving-right", { start: 0, end: 4 }), // assuming 5 frames too
      frameRate: 8,
      repeat: -1,
    });

    // Moving down animation
    this.anims.create({
      key: "vino-moving-down",
      frames: this.anims.generateFrameNumbers("vino-moving-down", { start: 0, end: 4 }), // assuming 5 frames too
      frameRate: 8,
      repeat: -1,
    });

    this.player = new Player(this, 320, 360);
    this.cursors = this.input.keyboard.createCursorKeys();

    CameraSystem.configureMainCamera(this, this.worldWidth, this.worldHeight);
    CameraSystem.follow(this, this.player.sprite);
    this.cameras.main.setZoom(4); // keep your zoom if you want

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