import Phaser from "phaser";

export class UIScene extends Phaser.Scene {
  constructor() {
    super("UIScene");
  }

  create(data) {
    this.sceneKey = data?.sceneKey ?? "CampoLunanScene";

    this.add
      .text(20, 690, "WASD/Arrow Keys to move | P pause | M memory", {
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "18px",
        color: "#d6dbe8",
      })
      .setScrollFactor(0);
  }
}