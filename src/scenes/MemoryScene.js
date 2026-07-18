import Phaser from "phaser";
import { createBodyText, createPanel, createTitleText } from "../utils/sceneHelpers.js";

export class MemoryScene extends Phaser.Scene {
  constructor() {
    super("MemoryScene");
  }

  init(data) {
    this.parentScene = data?.parentScene;
  }

  create() {
    this.add.rectangle(640, 360, 1280, 720, 0x1e1a2d, 0.98);
    createPanel(this, 640, 360, 880, 420, 0x0f172a, 0.96);
    createTitleText(this, "Memory Scene", 240);
    createBodyText(
      this,
      "This is the modular investigation space for a soul's memory world. Press ESC to return.",
      330,
    );

    this.input.keyboard.once("keydown-ESC", () => {
      this.scene.stop();
      if (this.parentScene) {
        this.scene.resume(this.parentScene.scene.key);
      } else {
        this.scene.resume("CampoLunanScene");
      }
    });
  }
}