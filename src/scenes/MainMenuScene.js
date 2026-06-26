import Phaser from "phaser";
import { SceneManager } from "../managers/SceneManager.js";
import { createBodyText, createPanel, createTitleText } from "../utils/sceneHelpers.js";

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("MainMenuScene");
  }

  create() {
    this.add.rectangle(640, 360, 1280, 720, 0x0b1020);
    createPanel(this, 640, 360, 760, 340, 0x111827, 0.95);
    createTitleText(this, "Gunita: Reaper of Echoes", 250);
    createBodyText(
      this,
      "A modular Phaser 3 project shell for a top-down pixel RPG. Press SPACE to enter Campo Lunan.",
      330,
    );

    this.add
      .text(640, 430, "SPACE: Start", {
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "22px",
        color: "#f3e7c2",
      })
      .setOrigin(0.5);

    this.input.keyboard.once("keydown-SPACE", () => {
      SceneManager.fadeToScene(this, "CampoLunanScene");
    });
  }
}
