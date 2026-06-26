import Phaser from "phaser";
import { CameraSystem } from "../systems/CameraSystem.js";
import { HudOverlay } from "../ui/HudOverlay.js";
import { Player } from "../entities/Player.js";

export class CampoLunanScene extends Phaser.Scene {
  constructor() {
    super("CampoLunanScene");
  }

  create() {
    this.add.rectangle(640, 360, 1280, 720, 0x132238);

    this.player = new Player(this, 320, 360);
    this.cursors = this.input.keyboard.createCursorKeys();

    CameraSystem.configureMainCamera(this, 2000, 1400);
    CameraSystem.follow(this, this.player.sprite);

    this.hud = new HudOverlay(this);
    this.hud.setStatus("WASD/Arrow Keys to move | P pause | M memory");

    this.input.keyboard.on("keydown-P", () => {
      this.scene.launch("PauseScene");
      this.scene.pause();
    });

    this.input.keyboard.on("keydown-M", () => {
      this.scene.launch("MemoryScene");
      this.scene.pause();
    });
  }

  update() {
    this.player.update(this.cursors);
  }
}