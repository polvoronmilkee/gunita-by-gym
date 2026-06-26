import Phaser from "phaser";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 30, "Loading Gunita...", {
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "24px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.load.setBaseURL("https://labs.phaser.io");
    this.load.image("placeholder-tile", "assets/sprites/grass.jpg");
  }

  create() {
    this.scene.start("MainMenuScene");
  }
}