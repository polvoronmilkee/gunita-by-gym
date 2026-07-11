import Phaser from "phaser";
import {
  GROUND_TILE_TEXTURE_KEY,
  GROUND_TILE_TEXTURE_URL,
} from "../utils/groundTiles.js";
import { getCache } from "../save.js";

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
    const cache = getCache();
    const currentArea = cache?.current_area;
    if (currentArea === "Grave 1" || currentArea === "Grave1") {
      this.scene.start("Grave1");
    } else {
      this.scene.start("CampoLunanScene");
    }
  }
}
