import Phaser from "phaser";
import { CameraSystem } from "../systems/CameraSystem.js";
import { HudOverlay } from "../ui/HudOverlay.js";
import { DialogueBox } from "../ui/DialogueBox.js";
import { Player } from "../entities/Player.js";
import { GROUND_TILE_TEXTURE_KEY } from "../utils/groundTiles.js";
import { getCache, setCache } from "../save.js";
import { saveGameState, loadGameState } from "../utils/api.js";

export class CampoLunanScene extends Phaser.Scene {
  constructor() {
    super("CampoLunanScene");
  }

  preload() {
    const groundTileModules = import.meta.glob("../assets/ground-tiles/*.png", {
      eager: true,
      import: "default",
    });

    // Load all border tiles dynamically.
    const tileKeys = {
      bottom_center: "bottom_center_tile",
      bottom_left: "bottom_left_tile",
      bottom_right: "bottom_right_tile",
      center_top: "center_top_tile",
      left_center: "left_center_tile",
      right_side: "right_side_tile",
      top_left_side: "top_left_side_tile",
      top_right_side: "top_right_side_tile",
    };

    // Map each key to its path using the glob result
    for (const [key, fileName] of Object.entries(tileKeys)) {
      const path = `../assets/ground-tiles/${fileName}.png`;
      if (groundTileModules[path]) {
        this.load.image(key, groundTileModules[path]);
      } else {
        console.warn(`Tile not found: ${path}`);
      }
    }

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
    const baseWorldWidth = 1280;
    const baseWorldHeight = 720;

    // ---- GROUND WITH BORDERS ----
    const tileSize = 32; // Adjust to your tile's actual pixel size
    const cols = Math.ceil(baseWorldWidth / tileSize);
    const rows = Math.ceil(baseWorldHeight / tileSize);

    this.worldWidth = cols * tileSize;
    this.worldHeight = rows * tileSize;

    // 1. Fill the interior with the center tile
    const interior = this.add.tileSprite(
      0,
      0,
      this.worldWidth,
      this.worldHeight,
      GROUND_TILE_TEXTURE_KEY,
    );
    interior.setOrigin(0).setDepth(-2);

    // 2. Place border tiles along the edges (on top of the interior, depth -1)
    const borderDepth = -1;

    // Helper to place a tile at a specific grid position
    const placeTile = (key, col, row) => {
      const x = col * tileSize + tileSize / 2;
      const y = row * tileSize + tileSize / 2;
      this.add.image(x, y, key).setDepth(borderDepth);
    };

    // Top row (row 0)
    for (let c = 0; c < cols; c++) {
      let key;
      if (c === 0) key = "top_left_side";
      else if (c === cols - 1) key = "top_right_side";
      else key = "center_top";
      placeTile(key, c, 0);
    }

    // Bottom row (row = rows - 1)
    for (let c = 0; c < cols; c++) {
      let key;
      if (c === 0) key = "bottom_left";
      else if (c === cols - 1) key = "bottom_right";
      else key = "bottom_center";
      placeTile(key, c, rows - 1);
    }

    // Left column (excluding corners already placed)
    for (let r = 1; r < rows - 1; r++) {
      placeTile("left_center", 0, r);
    }

    // Right column (excluding corners)
    for (let r = 1; r < rows - 1; r++) {
      placeTile("right_side", cols - 1, r);
    }

    // ---- END GROUND ----

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
    const spawnX = (cache && cache.position_x !== undefined) ? cache.position_x : 320;
    const spawnY = (cache && cache.position_y !== undefined) ? cache.position_y : 360;

    this.player = new Player(this, spawnX, spawnY);
    this.cursors = this.input.keyboard.createCursorKeys();

    CameraSystem.configureMainCamera(this, this.worldWidth, this.worldHeight);
    CameraSystem.follow(this, this.player.sprite);
    this.cameras.main.setZoom(4); // keep your zoom if you want

    // Background verify cache with Supabase
    if (cache && cache.player_id) {
      loadGameState(cache.player_id)
        .then(serverState => {
          if (serverState && (serverState.position_x !== cache.position_x || serverState.position_y !== cache.position_y)) {
            console.log("Supabase coordinates differ from cache. Snapping player to match server...");
            
            this.player.sprite.setPosition(serverState.position_x, serverState.position_y);
            
            const freshCache = getCache();
            if (freshCache) {
              setCache({
                ...freshCache,
                position_x: serverState.position_x,
                position_y: serverState.position_y,
                current_world: serverState.current_world || freshCache.current_world,
                current_area: serverState.current_area || freshCache.current_area
              });
            }
          }
        })
        .catch(err => {
          console.warn("Background coordinates validation failed:", err.message);
        });
    }

    this.hud = new HudOverlay(this, {
      status: "WASD / ARROWS TO MOVE   P PAUSE   M MEMORY",
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
      loop: true
    });

    // Instantiate Dialogue Box to showcase scale
    const dialogues = [
      { speaker: "Vino", text: "Where am I? This place... Campo Lunan. It feels familiar yet distant." },
      { speaker: "???", text: "Be careful, Vino. The memories of this place can be heavy..." },
      { speaker: "Vino", text: "Who said that? Is someone there?" }
    ];
    let currentStep = 0;

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
        }
      }
    });
  }

  async saveProgress() {
    const cache = getCache();
    if (!cache || !cache.player_id || !this.player?.sprite) return;

    const state = {
      current_world: "Lunan",
      current_area: "Campo Lunan",
      position_x: Math.round(this.player.sprite.x),
      position_y: Math.round(this.player.sprite.y)
    };

    // Update local cache immediately
    setCache({
      ...cache,
      ...state
    });

    // Save/sync with Supabase backend in the background
    try {
      await saveGameState(cache.player_id, state);
    } catch (err) {
      console.error("Autosave database sync failed:", err.message);
    }
  }

  update() {
    this.player.update(this.cursors);
  }
}
