import Phaser from "phaser";
import {
  GROUND_TILE_TEXTURE_KEY,
  GROUND_TILE_TEXTURE_URL,
} from "../utils/groundTiles.js";

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

    this.load.image(GROUND_TILE_TEXTURE_KEY, GROUND_TILE_TEXTURE_URL);
  }

  create() {
    this.scene.start("CampoLunanScene");
  }
}
