import Phaser from "phaser";
import {
  GROUND_TILE_TEXTURE_KEY,
  GROUND_TILE_TEXTURE_URL,
} from "../utils/groundTiles.js";
import { getCache } from "../save.js";
import { AUDIO_SETTINGS } from "../utils/audioSettings.js";

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

    for (const track of AUDIO_SETTINGS.tracks) {
      this.load.audio(track.key, track.path);
    }

    this.load.audio(
      AUDIO_SETTINGS.sfx.button.key,
      AUDIO_SETTINGS.sfx.button.path,
    );
    this.load.audio(AUDIO_SETTINGS.sfx.dash.key, AUDIO_SETTINGS.sfx.dash.path);
    this.load.audio(
      AUDIO_SETTINGS.sfx.vinoMove.key,
      AUDIO_SETTINGS.sfx.vinoMove.path,
    );
  }

  create() {
    const cache = getCache();
    const currentArea = window.initialScene || cache?.current_area;
    window.initialScene = null;
    
    if (currentArea === "Grave 1" || currentArea === "Grave1") {
      this.scene.start("Grave1");
    } else {
      this.scene.start("CampoLunanScene");
    }
  }
}
