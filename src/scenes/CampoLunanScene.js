import Phaser from "phaser";
import { CameraSystem } from "../systems/CameraSystem.js";
import { HudOverlay } from "../ui/HudOverlay.js";
import { DialogueBox } from "../ui/DialogueBox.js";
import { Player } from "../entities/Player.js";
import { GROUND_TILE_TEXTURE_KEY } from "../utils/groundTiles.js";
import { getCache, setCache } from "../save.js";
import { saveGameState, loadGameState } from "../utils/api.js";
import { AudioManager } from "../utils/audioManager.js";

export class CampoLunanScene extends Phaser.Scene {
  constructor() {
    super("CampoLunanScene");
  }

  preload() {
    this.load.json("campo-lunan-map", "src/assets/campo-lunan/campo lunan.tmj");

    const images = [
      "bottom_center_tile.png", "bottom_left_tile.png", "bottom_right_tile.png",
      "candle_1.png", "candle_2.png", "center tile.png", "center_top_tile.png",
      "ded trees_1.png", "ded trees_2.png", "fence 2.png", "fence 3.png",
      "fence 4.png", "fence 5.png", "fence 6.png", "fence 7.png", "fence_1.png",
      "gate.png", "grass_1.png", "grass_2.png", "Grave 1.png", "Grave 2.png",
      "Grave 3.png", "Grave 4.png", "Grave 5.png", "Grave 6.png", "left_center_tile.png",
      "left_stonefence.png", "left_stonefence2.png", "right_side_tile.png",
      "right_stonefence.png", "right_stonefence2.png", "stone1.png", "stone2.png",
      "stonefence1.png", "stonefence2.png", "stonepath1.png", "stonepath4.png",
      "stonepath5.png", "top_left_side_tile.png", "top_right_side_tile.png",
      "trees-1.png", "trees-2.png"
    ];

    images.forEach(img => {
      this.load.image(img, `src/assets/campo-lunan/${img}`);
    });

    // Fallbacks for missing files in the TMJ
    this.load.image("stonepath2.png", "src/assets/campo-lunan/stonepath1.png");
    this.load.image("stonepath3.png", "src/assets/campo-lunan/stonepath1.png");

    // Idle spritesheet
    this.load.spritesheet(
      "vino-idle",
      "src/assets/vino-spritesheets/vino-idle/vino-idle.png",
      {
        frameWidth: 208,
        frameHeight: 237,
      },
    );

    // Moving up spritesheet
    this.load.spritesheet(
      "vino-moving-up",
      "src/assets/vino-spritesheets/vino-moving-up.png",
      {
        frameWidth: 208,
        frameHeight: 237,
      },
    );

    // Moving left spritesheet
    this.load.spritesheet(
      "vino-moving-left",
      "src/assets/vino-spritesheets/vino-moving-left.png",
      {
        frameWidth: 208,
        frameHeight: 237,
      },
    );

    // Moving right spritesheet
    this.load.spritesheet(
      "vino-moving-right",
      "src/assets/vino-spritesheets/vino-moving-right.png",
      {
        frameWidth: 208,
        frameHeight: 237,
      },
    );

    // Moving down spritesheet
    this.load.spritesheet(
      "vino-moving-down",
      "src/assets/vino-spritesheets/vino-moving-down.png",
      {
        frameWidth: 208,
        frameHeight: 237,
      },
    );
  }

  create() {
    const cachedMap = this.cache.json.get("campo-lunan-map");
    if (!cachedMap) {
      console.error("Failed to load campo-lunan-map JSON from cache.");
      return;
    }
    const mapData = JSON.parse(JSON.stringify(cachedMap));

    const newTilesets = [];
    mapData.tilesets.forEach(ts => {
      if (ts.tiles) {
        // Image Collection: explode into individual tilesets
        ts.tiles.forEach(tile => {
          if (tile.image) {
            let filename = tile.image.substring(tile.image.lastIndexOf("/") + 1);
            newTilesets.push({
              name: filename.replace(".png", "") + "_" + tile.id,
              firstgid: ts.firstgid + tile.id,
              image: filename,
              imagewidth: tile.imagewidth || 32,
              imageheight: tile.imageheight || 32,
              tilewidth: tile.imagewidth || 32,
              tileheight: tile.imageheight || 32,
              margin: 0,
              spacing: 0,
              columns: 1,
              tilecount: 1
            });
          }
        });
      } else {
        newTilesets.push(ts);
      }
    });
    mapData.tilesets = newTilesets;

    this.cache.tilemap.add("campo-lunan-map-modified", {
      format: Phaser.Tilemaps.Formats ? Phaser.Tilemaps.Formats.TILED_JSON : 1,
      data: mapData
    });

    const map = this.make.tilemap({ key: "campo-lunan-map-modified" });

    const tilesetList = [];
    mapData.tilesets.forEach((ts) => {
      const addedTileset = map.addTilesetImage(ts.name, ts.image);
      if (addedTileset) {
        tilesetList.push(addedTileset);
      }
    });

    this.worldWidth = map.widthInPixels;
    this.worldHeight = map.heightInPixels;

    // Build bottom layers
    const bottomLayers = ["Tile Layer 1", "bottom"];
    let depth = -20;
    bottomLayers.forEach(layerName => {
      const layer = map.createLayer(layerName, tilesetList, 0, 0);
      if (layer) {
        layer.setDepth(depth);
        depth++;
      }
    });

    // Idle animation (frames 0–4 because you have 5 frames)
    this.anims.create({
      key: "vino-idle",
      frames: this.anims.generateFrameNumbers("vino-idle", {
        start: 0,
        end: 4,
      }),
      frameRate: 5,
      repeat: -1,
    });

    // Moving up animation (adjust start/end to match your frame count)
    this.anims.create({
      key: "vino-moving-up",
      frames: this.anims.generateFrameNumbers("vino-moving-up", {
        start: 0,
        end: 4,
      }), // assuming 5 frames too
      frameRate: 5,
      repeat: -1,
    });

    // Moving left animation
    this.anims.create({
      key: "vino-moving-left",
      frames: this.anims.generateFrameNumbers("vino-moving-left", {
        start: 0,
        end: 4,
      }), // assuming 5 frames too
      frameRate: 5,
      repeat: -1,
    });

    // Moving right animation
    this.anims.create({
      key: "vino-moving-right",
      frames: this.anims.generateFrameNumbers("vino-moving-right", {
        start: 0,
        end: 4,
      }), // assuming 5 frames too
      frameRate: 5,
      repeat: -1,
    });

    // Moving down animation
    this.anims.create({
      key: "vino-moving-down",
      frames: this.anims.generateFrameNumbers("vino-moving-down", {
        start: 0,
        end: 4,
      }), // assuming 5 frames too
      frameRate: 5,
      repeat: -1,
    });

    // Retrieve coordinates from local cache immediately, default to (320, 360)
    const cache = getCache();
    const spawnX =
      cache && cache.position_x !== undefined ? cache.position_x : 320;
    const spawnY =
      cache && cache.position_y !== undefined ? cache.position_y : 360;

    this.audioManager = new AudioManager(this);

    this.player = new Player(this, spawnX, spawnY, {
      onDashStart: () => this.audioManager.playDashSfx(),
      onDirectionChange: () => this.audioManager.playVinoMoveSfx(),
    });
    this.player.sprite.setDepth(0);
    this.cursors = this.input.keyboard.createCursorKeys();

    CameraSystem.configureMainCamera(this, this.worldWidth, this.worldHeight);
    CameraSystem.follow(this, this.player.sprite);
    this.cameras.main.setZoom(4);

    // Build top layers
    const topLayers = ["top", "top1", "top2"];
    let topDepth = 1;
    
    // GIDs to exclude from collision (e.g. grass, non-solid ground decor)
    // firstgid is 1. grass_1 is id 9 -> GID 10. grass_2 is id 10 -> GID 11.
    const nonCollidingGIDs = [-1, 10, 11];

    topLayers.forEach(layerName => {
      const layer = map.createLayer(layerName, tilesetList, 0, 0);
      if (layer) {
        layer.setDepth(topDepth);
        // Automatically set collision for all placed tiles in these layers except grass
        layer.setCollisionByExclusion(nonCollidingGIDs);
        this.physics.add.collider(this.player.sprite, layer);
        topDepth++;
      }
    });

    // Scan for Grave 1 positions on the map
    this.grave1Positions = [];
    const grave1Tilesets = map.tilesets.filter(ts => ts.name && ts.name.includes("Grave 1"));
    grave1Tilesets.forEach(ts => {
      const gid = ts.firstgid;
      const topLayer = map.getLayer("top");
      if (topLayer && topLayer.data) {
        for (let y = 0; y < map.height; y++) {
          for (let x = 0; x < map.width; x++) {
            const tile = map.getTileAt(x, y, true, "top");
            if (tile && tile.index === gid) {
              this.grave1Positions.push({
                x: x * 32 + 16,
                y: y * 32 + 16
              });
            }
          }
        }
      }
    });

    // Background verify cache with Supabase
    if (cache && cache.player_id) {
      loadGameState(cache.player_id)
        .then((serverState) => {
          if (
            serverState &&
            (serverState.position_x !== cache.position_x ||
              serverState.position_y !== cache.position_y)
          ) {
            console.log(
              "Supabase coordinates differ from cache. Snapping player to match server...",
            );

            this.player.sprite.setPosition(
              serverState.position_x,
              serverState.position_y,
            );

            const freshCache = getCache();
            if (freshCache) {
              setCache({
                ...freshCache,
                position_x: serverState.position_x,
                position_y: serverState.position_y,
                current_world:
                  serverState.current_world || freshCache.current_world,
                current_area:
                  serverState.current_area || freshCache.current_area,
              });
            }
          }
        })
        .catch((err) => {
          console.warn(
            "Background coordinates validation failed:",
            err.message,
          );
        });
    }

    this.hud = new HudOverlay(this, {
      status: "WASD / ARROWS MOVE   SHIFT DASH   P PAUSE   M MEMORY",
      onButtonPress: () => this.audioManager.playButtonSfx(),
      onBack: async () => {
        await this.saveProgress();
        window.returnToGunitaMenu?.();
      },
      onPause: async () => {
        await this.saveProgress();
        this.scene.launch("PauseScene");
        this.scene.pause();
      },
      onMemory: () => {
        this.scene.launch("MemoryScene");
        this.scene.pause();
      },
      onToggleMusic: () => this.audioManager.toggleMusic(),
      onToggleSfx: () => this.audioManager.toggleSfx(),
      musicEnabled: this.audioManager.musicEnabled,
      sfxEnabled: this.audioManager.sfxEnabled,
    });
    this.hud.setBackVisible(true);
    this.hud.setPauseVisible(true);
    this.hud.setMemoryVisible(true);

    this.input.keyboard.on("keydown-P", async () => {
      await this.saveProgress();
      this.scene.launch("PauseScene");
      this.scene.pause();
    });

    this.input.keyboard.on("keydown-M", () => {
      this.scene.launch("MemoryScene");
      this.scene.pause();
    });

    this.input.keyboard.on("keydown-BACKSPACE", async () => {
      await this.saveProgress();
      window.returnToGunitaMenu?.();
    });

    // Autosave timer: updates cache instantly and saves to server every 5 seconds
    this.time.addEvent({
      delay: 5000,
      callback: this.saveProgress,
      callbackScope: this,
      loop: true,
    });

    // Instantiate Dialogue Box to showcase scale
    const dialogues = [
      {
        speaker: "Vino",
        text: "Where am I? This place... Campo Lunan. It feels familiar yet distant.",
      },
      {
        speaker: "???",
        text: "Be careful, Vino. The memories of this place can be heavy...",
      },
      { speaker: "Vino", text: "Who said that? Is someone there?" },
    ];
    let currentStep = 0;
    this.dialogueActive = true;

    this.dialogue = new DialogueBox(this, {
      speaker: dialogues[0].speaker,
      text: dialogues[0].text,
      onComplete: () => {
        currentStep++;
        if (currentStep < dialogues.length) {
          const next = dialogues[currentStep];
          this.dialogue.showText(next.speaker, next.text);
        } else {
          this.dialogue.hide();
          this.dialogueActive = false;
        }
      },
    });

    const triggerGraveDialogue = () => {
      this.dialogueActive = true;
      if (this.player && this.player.sprite && this.player.sprite.body) {
        this.player.sprite.body.setVelocity(0);
        if (this.player.sprite.anims.isPlaying) {
          this.player.sprite.anims.stop();
        }
      }
      
      let step = 0;
      const steps = [
        { speaker: "Tombstone", text: "Grave I\nAng Huling Mangingisda\nThe Last Fisherman" },
        { speaker: "Memory", text: "\"The sea remembers... but the village does not.\"" },
        { speaker: "Campo Lunan", text: "A forgotten fisherman waits beyond these echoes. Discover the memories he left behind and reveal the truth hidden beneath the waves." },
        { speaker: "Campo Lunan", text: "Will you answer the sea's call?" },
        { speaker: "Grave I", text: "▶ Enter the Memory (Click dialogue box or press E to Enter, ESC to Cancel)" }
      ];

      const runDialogue = () => {
        if (step < steps.length) {
          const current = steps[step];
          this.dialogue.showText(current.speaker, current.text, () => {
            step++;
            if (step < steps.length) {
              runDialogue();
            } else {
              this.dialogue.hide();
              this.dialogueActive = false;
              
              // Set the area cache to Grave 1 before transitioning
              const cache = getCache();
              if (cache) {
                setCache({
                  ...cache,
                  current_area: "Grave 1",
                  position_x: 300,
                  position_y: 600
                });
              }
              
              import("../systems/TransitionSystem.js").then(({ TransitionSystem }) => {
                TransitionSystem.fadeToScene(this, "Grave1");
              });
            }
          });
        }
      };

      runDialogue();
    };

    // Keyboard bindings for dialogue & interaction
    this.input.keyboard.on("keydown-E", () => {
      if (this.dialogueActive) {
        this.dialogue.onComplete();
      } else if (this.isNearGrave) {
        triggerGraveDialogue();
      }
    });

    this.input.keyboard.on("keydown-SPACE", () => {
      if (this.dialogueActive) {
        this.dialogue.onComplete();
      }
    });

    this.input.keyboard.on("keydown-ESC", () => {
      if (this.dialogueActive) {
        this.dialogue.hide();
        this.dialogueActive = false;
      }
    });

    this.game.events.emit("game-ready");
  }

  async saveProgress() {
    const cache = getCache();
    if (!cache || !cache.player_id || !this.player?.sprite) return;

    const state = {
      current_world: "Lunan",
      current_area: "Campo Lunan",
      position_x: Math.round(this.player.sprite.x),
      position_y: Math.round(this.player.sprite.y),
    };

    // Update local cache immediately
    setCache({
      ...cache,
      ...state,
    });

    // Save/sync with Supabase backend in the background
    try {
      await saveGameState(cache.player_id, state);
    } catch (err) {
      console.error("Autosave database sync failed:", err.message);
    }
  }

  update() {
    if (this.dialogueActive) {
      if (this.player && this.player.sprite && this.player.sprite.body) {
        this.player.sprite.body.setVelocity(0);
        if (this.player.sprite.anims.isPlaying) {
          this.player.sprite.anims.stop();
        }
      }
      return;
    }

    this.player.update(this.cursors);

    // Proximity check for Grave 1
    let nearGrave = false;
    let nearestDist = Infinity;
    if (this.grave1Positions && this.grave1Positions.length > 0) {
      for (const pos of this.grave1Positions) {
        const dist = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, pos.x, pos.y);
        if (dist < nearestDist) {
          nearestDist = dist;
        }
      }
    }

    if (nearestDist < 30) {
      nearGrave = true;
      this.hud.setStatus("PRESS [E] TO INSPECT THE LAST FISHERMAN'S  GRAVE");
    } else {
      this.hud.setStatus("WASD / ARROWS TO MOVE - SHIFT TO DASH - P TO PAUSE - M FOR MEMORY");
    }
    this.isNearGrave = nearGrave;
  }
}
