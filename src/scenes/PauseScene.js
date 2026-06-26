import Phaser from "phaser";
import { createBodyText, createPanel, createTitleText } from "../utils/sceneHelpers.js";

export class PauseScene extends Phaser.Scene {
  constructor() {
    super("PauseScene");
  }

  create() {
    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.55);
    createPanel(this, 640, 360, 520, 240, 0x111827, 0.98);
    createTitleText(this, "Paused", 290);
    createBodyText(this, "Press ESC to resume Campo Lunan.", 360);

    this.input.keyboard.once("keydown-ESC", () => {
      this.scene.stop();
      this.scene.resume("CampoLunanScene");
    });
  }
}