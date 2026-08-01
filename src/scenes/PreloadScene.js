import Phaser from "phaser";
import { getCache } from "../save.js";
import { AUDIO_SETTINGS } from "../utils/audioSettings.js";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    const { width, height } = this.scale;


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
    this.load.image("decor2", "src/assets/grave1-v2/TilesetHouse.png");
    this.load.image("stonepath-tileset", "src/assets/grave1-v2/Road2_ground.png");
    this.load.image("decor3", "src/assets/grave1-v2/decor3.png");
    this.load.image("supplies", "src/assets/grave1-v2/Supplies.png");
    this.load.image("broken-houses", "src/assets/grave1-v2/broken houses.png");
    this.load.image("TilesetElement", "src/assets/grave1-v2/TilesetElement.png");
    this.load.image("bg-fish-basket", "src/assets/grave1-elements/bullet-scenes/fish-basket.png");
    this.load.image("bg-daughters-drawing", "src/assets/grave1-elements/bullet-scenes/daughters-drawing.png");
    this.load.spritesheet("rain", "src/assets/grave1-v2/rain-new-sprite.png", {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.image("rain-tile", "src/assets/grave1-v2/rain-new-sprite.png");
    this.load.spritesheet("luma-idle", "src/assets/luma-idle-spritesheet.png", {
      frameWidth: 138.67,
      frameHeight: 193.67,
    });
    this.load.spritesheet("fragment-idle", "src/assets/grave1-elements/fragments/crystal_shard idle sprite sheet.png", { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet("fragment-litol-shards", "src/assets/grave1-elements/fragments/crystal_shard litol shards sprite sheet.png", { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet("fragment-bleed", "src/assets/grave1-elements/fragments/crystal_shard bleed sprite sheet.png", { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet("fragment-cracks", "src/assets/grave1-elements/fragments/crystal_shard cracks sprite sheet.png", { frameWidth: 64, frameHeight: 64 });
    
    // New Character Spritesheets
    this.load.spritesheet("npc-mang-tomas", "src/assets/grave1-v2/more-characters/mang-tomas.png", { frameWidth: 40, frameHeight: 43 });
    this.load.spritesheet("npc-sick-wife", "src/assets/grave1-v2/more-characters/sick-wife.png", { frameWidth: 40, frameHeight: 43 });
    this.load.spritesheet("npc-daughter", "src/assets/grave1-v2/more-characters/daughter.png", { frameWidth: 36, frameHeight: 35 });
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
