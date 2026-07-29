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

    this.load.image(GROUND_TILE_TEXTURE_KEY, GROUND_TILE_TEXTURE_URL);

    for (const track of AUDIO_SETTINGS.tracks) {
      this.load.audio(track.key, track.path);
    }

    this.load.audio(
      AUDIO_SETTINGS.sfx.button.key,
      AUDIO_SETTINGS.sfx.button.path,
    );
    this.load.audio(AUDIO_SETTINGS.sfx.dash.key, AUDIO_SETTINGS.sfx.dash.path);
    if (AUDIO_SETTINGS.sfx.rainAndThunder) {
      this.load.audio(
        AUDIO_SETTINGS.sfx.rainAndThunder.key,
        AUDIO_SETTINGS.sfx.rainAndThunder.path,
      );
    }
    if (AUDIO_SETTINGS.sfx.lumaSwish) {
      this.load.audio(
        AUDIO_SETTINGS.sfx.lumaSwish.key,
        AUDIO_SETTINGS.sfx.lumaSwish.path,
      );
    }
    this.load.image("bg-fish-basket", "src/assets/grave1-elements/bullet-scenes/fish-basket.png");
    this.load.image("bg-daughters-drawing", "src/assets/grave1-elements/bullet-scenes/daughters-drawing.png");
    this.load.spritesheet("rain", "src/assets/grave1-v2/rain.png", {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.image("rain-tile", "src/assets/grave1-v2/rain.png");
  }

  create() {
    const cache = getCache();
    const currentArea = window.initialScene || cache?.current_area;
    window.initialScene = null;
    
    if (currentArea === "CampoLunanScene" || currentArea === "Campo Lunan") {
      this.scene.start("CampoLunanScene");
    } else if (currentArea === "FamilyHomeScene" || currentArea === "FamilyHome") {
      this.scene.start("FamilyHomeScene");
    } else if (currentArea === "Grave 1" || currentArea === "Grave1") {
      this.scene.start("Grave1");
    } else if (currentArea && this.scene.get(currentArea)) {
      this.scene.start(currentArea);
    } else {
      this.scene.start("Grave1");
    }
  }
}
