import Phaser from "phaser";
import { CameraSystem } from "../systems/CameraSystem.js";
import { HudOverlay } from "../ui/HudOverlay.js";
import { DialogueBox } from "../ui/DialogueBox.js";
import { Player } from "../entities/Player.js";
import { InteractionPrompt } from "../ui/InteractionPrompt.js";
import { MapOverlay } from "../ui/MapOverlay.js";
import { getCache, setCache } from "../save.js";
import { saveGameState, loadGameState, syncOfflineData } from "../utils/api.js";
import { AudioManager } from "../utils/audioManager.js";

export class CampoLunanScene extends Phaser.Scene {
  constructor() {
    super("CampoLunanScene");
  }

  preload() {
    this.load.json("campo-lunan-map", "src/assets/campo-lunanv2/gunita-campo-lunan copy.tmj");

    const v2TilesetImages = [
      "abandoned2.png",
      "graves1.png",
      "gravetileset.png",
      "stonefences1.png",
      "store.png"
    ];

    v2TilesetImages.forEach(img => {
      this.load.image(img, `src/assets/campo-lunanv2/${img}`);
    });

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

    // Map Tiled tileset names to loaded texture keys in Phaser
    const tilesetKeyMap = {
      "gravetileset": "gravetileset.png",
      "stonefences": "stonefences1.png",
      "decors": "abandoned2.png",
      "graves": "graves1.png",
      "store": "store.png"
    };

    mapData.tilesets = mapData.tilesets.map((ts) => {
      return {
        ...ts,
        image: tilesetKeyMap[ts.name] || (ts.name + ".png")
      };
    });

    this.cache.tilemap.add("campo-lunan-map-modified", {
      format: Phaser.Tilemaps.Formats ? Phaser.Tilemaps.Formats.TILED_JSON : 1,
      data: mapData
    });

    const map = this.make.tilemap({ key: "campo-lunan-map-modified" });

    const tilesetList = [];
    mapData.tilesets.forEach((ts) => {
      const textureKey = tilesetKeyMap[ts.name] || (ts.name + ".png");
      const addedTileset = map.addTilesetImage(ts.name, textureKey);
      if (addedTileset) {
        tilesetList.push(addedTileset);
      } else {
        console.warn(`Failed to add tileset image for ${ts.name} -> ${textureKey}`);
      }
    });

    this.worldWidth = map.widthInPixels;
    this.worldHeight = map.heightInPixels;

    // Build bottom ground layer
    const groundLayer = map.createLayer("ground", tilesetList, 0, 0);
    if (groundLayer) {
      groundLayer.setDepth(-100);
    }

    // Build top layers
    const topLayers = [
      "objectslayer1",
      "fenceslayer1",
      "fenceslayer2",
      "objectslayer2",
      "objectslayer3"
    ];
    topLayers.forEach(layerName => {
      const layer = map.createLayer(layerName, tilesetList, 0, 0);
      if (layer) {
        // Set depth to a large value so they render in front of player
        // Alternatively, if they should sort with the player based on Y, 
        // they can be assigned distinct depths or set up for Y-sorting.
        layer.setDepth(1);
      }
    });

    // Idle animation (frames 0–4)
    this.anims.create({
      key: "vino-idle",
      frames: this.anims.generateFrameNumbers("vino-idle", {
        start: 0,
        end: 4,
      }),
      frameRate: 5,
      repeat: -1,
    });
    

    // Moving up animation
    this.anims.create({
      key: "vino-moving-up",
      frames: this.anims.generateFrameNumbers("vino-moving-up", {
        start: 0,
        end: 4,
      }),
      frameRate: 5,
      repeat: -1,
    });

    // Moving left animation
    this.anims.create({
      key: "vino-moving-left",
      frames: this.anims.generateFrameNumbers("vino-moving-left", {
        start: 0,
        end: 4,
      }),
      frameRate: 5,
      repeat: -1,
    });

    // Moving right animation
    this.anims.create({
      key: "vino-moving-right",
      frames: this.anims.generateFrameNumbers("vino-moving-right", {
        start: 0,
        end: 4,
      }),
      frameRate: 5,
      repeat: -1,
    });

    // Moving down animation
    this.anims.create({
      key: "vino-moving-down",
      frames: this.anims.generateFrameNumbers("vino-moving-down", {
        start: 0,
        end: 4,
      }),
      frameRate: 5,
      repeat: -1,
    });

    // Retrieve coordinates from local cache immediately, default to (1278, 1779)
    const cache = getCache();
    let spawnX =
      cache && cache.position_x !== undefined ? cache.position_x : 1278;
    let spawnY =
      cache && cache.position_y !== undefined ? cache.position_y : 1779;

    // Sanitize spawn coordinates to prevent spawning inside map boundary walls
    if (spawnY < 440) spawnY = 1779;
    if (spawnX < 360) spawnX = 1278;
    if (spawnX > 2180) spawnX = 1278;
    if (spawnY > 1880) spawnY = 1779;

    this.audioManager = new AudioManager(this, "campo-lunan");

    this.player = new Player(this, spawnX, spawnY, {
      onDashStart: () => this.audioManager.playDashSfx(),
      onDirectionChange: () => this.audioManager.playVinoMoveSfx(),
    });
    this.player.sprite.setDepth(0);
    this.cursors = this.input.keyboard.createCursorKeys();

    CameraSystem.configureMainCamera(this, this.worldWidth, this.worldHeight);
    CameraSystem.follow(this, this.player.sprite);
    this.cameras.main.setZoom(4);

    // Fast scan for Grave 1 positions on the new map across all layers
    this.grave1Positions = [];
    if (map.layers) {
      map.layers.forEach((layerData) => {
        if (layerData && layerData.data) {
          for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
              const tile = layerData.data[y][x];
              if (tile && tile.index > 0) {
                if (
                  layerData.name === "graves" ||
                  (tile.tileset && tile.tileset.name === "graves") ||
                  (tile.index >= 3155 && tile.index <= 4111)
                ) {
                  this.grave1Positions.push({
                    x: x * 32 + 16,
                    y: y * 32 + 16
                  });
                }
              }
            }
          }
        }
      });
    }

    //Load static map collisions from Tiled
    this.collisionGroup = this.physics.add.staticGroup();
    const collisionLayer = map.getObjectLayer("collisions") || map.getObjectLayer("collsions");
    if (collisionLayer && collisionLayer.objects) {
      collisionLayer.objects.forEach((obj) => {
        if (obj.width && obj.height) {
          const rect = this.add.rectangle(
            obj.x + obj.width / 2,
            obj.y + obj.height / 2,
            obj.width,
            obj.height
          );
          this.physics.add.existing(rect, true);
          this.collisionGroup.add(rect);
        }
      });
      this.physics.add.collider(this.player.sprite, this.collisionGroup);
    }

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
      onPause: () => {
        this.saveProgress();
        this.scene.launch("PauseScene", { parentScene: this });
        this.scene.pause();
      },
      onMemory: () => {
        this.scene.launch("MemoryScene", { parentScene: this });
        this.scene.pause();
      },
      onToggleMusic: () => this.audioManager.toggleMusic(),
      onToggleSfx: () => this.audioManager.toggleSfx(),
      musicEnabled: this.audioManager.musicEnabled,
      sfxEnabled: this.audioManager.sfxEnabled,
    });
    this.hud.setBackVisible(false);
    this.hud.setPauseVisible(true);
    this.hud.setMemoryVisible(false);

    const mapCache = getCache();
    this.exploredChunks = new Set(mapCache?.explored_chunks || []);

    this.interactionPrompt = new InteractionPrompt(this);
    syncOfflineData();

    this.input.keyboard.on("keydown-P", () => {
      this.saveProgress();
      this.scene.launch("PauseScene", { parentScene: this });
      this.scene.pause();
    });

    this.input.keyboard.on("keydown-M", () => {
      this.scene.launch("MemoryScene", { parentScene: this });
      this.scene.pause();
    });

    this.mapOverlay = new MapOverlay(this);

    // Setup minimap camera perfectly centered within the 500x400 modal
    const { width, height } = this.scale;
    const modalWidth = 500;
    const modalHeight = 400;
    this.minimapCamera = this.cameras.add((width - modalWidth) / 2, (height - modalHeight) / 2, modalWidth, modalHeight)
      .setZoom(0.6)
      .setName("minimap")
      .setVisible(false);

    this.minimapCamera.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.minimapCamera.startFollow(this.player.sprite);

    // Phaser-based screen dimming so the minimap stays bright
    this.dimGraphics = this.add.graphics();
    this.dimGraphics.fillStyle(0x000000, 0.7);
    this.dimGraphics.fillRect(0, 0, width, height);
    this.dimGraphics.setScrollFactor(0);
    this.dimGraphics.setDepth(998);
    this.dimGraphics.setVisible(false);
    this.minimapCamera.ignore(this.dimGraphics);

    this.minimapFow = this.add.graphics();
    this.minimapFow.setDepth(999);
    // Hide FoW from main camera so game view is normal
    this.cameras.main.ignore(this.minimapFow);

    this.minimapPlayerDot = this.add.graphics();
    this.minimapPlayerDot.setDepth(1000);
    this.cameras.main.ignore(this.minimapPlayerDot);

    this.input.keyboard.on("keydown-TAB", (event) => {
      event.preventDefault();
      if (!this.minimapCamera.visible) {
        this.lastExploredChunksSize = 0; // Force immediate redraw in update()
        this.dimGraphics.setVisible(true);
        this.minimapCamera.setVisible(true);
        this.mapOverlay.show(
          "CAMPO LUNAN",
          this.player?.sprite?.x || 0,
          this.player?.sprite?.y || 0
        );
      }
    });

    this.input.keyboard.on("keyup-TAB", (event) => {
      event.preventDefault();
      if (this.minimapCamera.visible) {
        this.dimGraphics.setVisible(false);
        this.minimapCamera.setVisible(false);
        this.mapOverlay.hide();
      }
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
                  position_x: 1137,
                  position_y: 550
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
      } else {
        this.saveProgress();
        this.scene.launch("PauseScene", { parentScene: this });
        this.scene.pause();
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
      explored_chunks: Array.from(this.exploredChunks || [])
    };

    // Update local cache immediately
    setCache({
      ...cache,
      ...state,
    });

    // Save/sync with Supabase backend in the background
    try {
      await saveGameState(cache.player_id, state);
      syncOfflineData();
    } catch (err) {
      console.error("Autosave database sync failed:", err.message);
    }
  }

  update() {
    // Track explored chunks and update dynamic depth sorting
    if (this.player && this.player.sprite) {
      this.player.sprite.setDepth(this.player.sprite.y);
      const chunkX = Math.floor(this.player.sprite.x / 320);
      const chunkY = Math.floor(this.player.sprite.y / 320);
      this.exploredChunks.add(`${chunkX},${chunkY}`);
    }

    if (this.minimapCamera && this.minimapCamera.visible) {
      if (this.player && this.player.sprite) {
        this.mapOverlay?.updateLocation(
          this.player.sprite.x,
          this.player.sprite.y
        );
      }

      if (this.minimapPlayerDot && this.player && this.player.sprite) {
        this.minimapPlayerDot.clear();
        this.minimapPlayerDot.fillStyle(0x2dd4bf, 1);
        this.minimapPlayerDot.fillCircle(this.player.sprite.x, this.player.sprite.y, 12);
      }

      if (!this.lastExploredChunksSize || this.exploredChunks.size !== this.lastExploredChunksSize) {
        this.lastExploredChunksSize = this.exploredChunks.size;
        this.minimapFow.clear();
        this.minimapFow.fillStyle(0x222222, 1);
        for (let cx = -30; cx < 80; cx++) {
          for (let cy = -30; cy < 80; cy++) {
            if (!this.exploredChunks.has(`${cx},${cy}`)) {
              this.minimapFow.fillRect(cx * 320, cy * 320, 320, 320);
            }
          }
        }
      }
    }

    if (this.dialogueActive) {
      if (this.player && this.player.sprite && this.player.sprite.body) {
        this.player.sprite.body.setVelocity(0);
        if (this.player.sprite.anims.isPlaying) {
          this.player.sprite.anims.stop();
        }
      }
      if (this.interactionPrompt) {
        this.interactionPrompt.hide();
      }
      return;
    }

    this.player.update(this.cursors);

    // Proximity check for Grave 1
    let nearGrave = false;
    let nearestDist = Infinity;
    let closestGravePos = null;
    if (this.grave1Positions && this.grave1Positions.length > 0) {
      for (const pos of this.grave1Positions) {
        const dist = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, pos.x, pos.y);
        if (dist < nearestDist) {
          nearestDist = dist;
          closestGravePos = pos;
        }
      }
    }

    if (nearestDist < 45) {
      nearGrave = true;
      this.hud.setStatus("PRESS [E] TO INSPECT THE LAST FISHERMAN'S  GRAVE");
      if (this.interactionPrompt && closestGravePos) {
        this.interactionPrompt.show(closestGravePos, "E", "INSPECT GRAVE", -15);
      }
    } else {
      this.hud.setStatus("WASD / ARROWS TO MOVE - SHIFT TO DASH - P TO PAUSE - M FOR MEMORY");
      if (this.interactionPrompt) {
        this.interactionPrompt.hide();
      }
    }
    this.isNearGrave = nearGrave;
  }
}
