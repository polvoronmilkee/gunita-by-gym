import Phaser from "phaser";
import { CameraSystem } from "../systems/CameraSystem.js";
import { HudOverlay } from "../ui/HudOverlay.js";
import { DialogueBox } from "../ui/DialogueBox.js";
import { Player } from "../entities/Player.js";
import { InteractionPrompt } from "../ui/InteractionPrompt.js";
import { MapOverlay } from "../ui/MapOverlay.js";
import { LumaGuidanceBox } from "../ui/LumaGuidanceBox.js";
import { getCache, setCache } from "../save.js";
import { saveGameState, loadGameState, syncOfflineData } from "../utils/api.js";
import { AudioManager } from "../utils/audioManager.js";
import { TransitionSystem } from "../systems/TransitionSystem.js";

export class CampoLunanScene extends Phaser.Scene {
  constructor() {
    super("CampoLunanScene");
  }

  preload() {
    this.load.json(
      "campo-lunan-map",
      "src/assets/campo-lunanv2/gunita-campo-lunan copy.tmj",
    );

    const v2TilesetImages = [
      "abandoned2.png",
      "graves1.png",
      "gravetileset.png",
      "stonefences1.png",
      "store.png",
    ];

    v2TilesetImages.forEach((img) => {
      this.load.image(img, `src/assets/campo-lunanv2/${img}`);
    });

    // Idle spritesheet

    this.load.spritesheet(
      "pink-frog",
      "src/assets/campo-lunanv2/memeng-easter-eggs/pink-frog.png",
      {
        frameWidth: 36,
        frameHeight: 44,
      },
    );

    this.load.spritesheet(
      "poison-shroom",
      "src/assets/campo-lunanv2/memeng-easter-eggs/poison-shroom.png",
      {
        frameWidth: 36,
        frameHeight: 44,
      },
    );

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

    // Luma idle spritesheet
    this.load.spritesheet(
      "luma-idle",
      "src/assets/luma-idle-spritesheet.png",
      {
        frameWidth: 138.67,
        frameHeight: 193.67,
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
      gravetileset: "gravetileset.png",
      stonefences: "stonefences1.png",
      decors: "abandoned2.png",
      graves: "graves1.png",
      store: "store.png",
    };

    mapData.tilesets = mapData.tilesets.map((ts) => {
      return {
        ...ts,
        image: tilesetKeyMap[ts.name] || ts.name + ".png",
      };
    });

    this.cache.tilemap.add("campo-lunan-map-modified", {
      format: Phaser.Tilemaps.Formats ? Phaser.Tilemaps.Formats.TILED_JSON : 1,
      data: mapData,
    });

    const map = this.make.tilemap({ key: "campo-lunan-map-modified" });

    const tilesetList = [];
    mapData.tilesets.forEach((ts) => {
      const textureKey = tilesetKeyMap[ts.name] || ts.name + ".png";
      const addedTileset = map.addTilesetImage(ts.name, textureKey);
      if (addedTileset) {
        tilesetList.push(addedTileset);
      } else {
        console.warn(
          `Failed to add tileset image for ${ts.name} -> ${textureKey}`,
        );
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
      "objectslayer3",
    ];
    topLayers.forEach((layerName) => {
      const layer = map.createLayer(layerName, tilesetList, 0, 0);
      if (layer) {
        // Set depth to a large value so they render in front of player
        // Alternatively, if they should sort with the player based on Y,
        // they can be assigned distinct depths or set up for Y-sorting.
        layer.setDepth(1);
      }
    });

    // Pink Frog animation
    this.anims.create({
      key: "pink-frog-idle",
      frames: this.anims.generateFrameNumbers("pink-frog", {
        start: 0,
        end: 5,
      }),
      frameRate: 6,
      repeat: -1,
    });

    // Poison Shroom animation
    this.anims.create({
      key: "poison-shroom-idle",
      frames: this.anims.generateFrameNumbers("poison-shroom", {
        start: 0,
        end: 4,
      }),
      frameRate: 6,
      repeat: -1,
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

    // Parse chars layer objects from TMJ map
    const charsLayer = map.getObjectLayer("chars");
    const pinkObj = charsLayer?.objects?.find((o) => o.id === 66 || o.name === "pink shroom" || o.name === "pink-frog");
    const poisonObj = charsLayer?.objects?.find((o) => o.id === 67 || o.name === "poison-idle" || o.name === "poison-shroom");
    const luma2Obj = charsLayer?.objects?.find((o) => o.id === 69 || o.name === "luma-second-appearance");

    const pinkX = pinkObj ? pinkObj.x : 1359;
    const pinkY = pinkObj ? pinkObj.y : 1075;
    const poisonX = poisonObj ? poisonObj.x : 1384;
    const poisonY = poisonObj ? poisonObj.y : 1074;

    // Add Pink Frog (id 66) with Physics
    this.pinkFrog = this.physics.add.sprite(pinkX, pinkY, "pink-frog");
    this.pinkFrog.setScale(0.75);
    this.pinkFrog.play("pink-frog-idle");
    this.pinkFrog.setImmovable(true); // Prevents Vino from pushing it

    // Add Poison Shroom (id 67) with Physics
    this.poisonShroom = this.physics.add.sprite(poisonX, poisonY, "poison-shroom");
    this.poisonShroom.setScale(0.75);
    this.poisonShroom.play("poison-shroom-idle");
    this.poisonShroom.setImmovable(true); // Prevents Vino from pushing it

    // Retrieve coordinates from local cache immediately, default to (1278, 1779)
    const cache = getCache() || {};
    
    if (!cache.has_completed_tutorial && !cache.has_talked_to_luma) {
        cache.position_x = 1278;
        cache.position_y = 1779;
        setCache(cache);
    }

    let spawnX =
      cache.position_x !== undefined && cache.position_x !== null ? Number(cache.position_x) : 1278;
    let spawnY =
      cache.position_y !== undefined && cache.position_y !== null ? Number(cache.position_y) : 1779;

    // Sanitize spawn coordinates to prevent spawning inside map boundary walls or crashing camera with NaN
    if (isNaN(spawnX) || spawnX < 360 || spawnX > 2180) spawnX = 1278;
    if (isNaN(spawnY) || spawnY < 440 || spawnY > 1880) spawnY = 1779;

    this.audioManager = new AudioManager(this, "campo-lunan");

    this.player = new Player(this, spawnX, spawnY, {
      onDashStart: () => this.audioManager.playDashSfx(),
    });
    this.player.sprite.setDepth(0);
    this.cursors = this.input.keyboard.createCursorKeys();

    // Add colliders so Vino can't walk through them
    this.physics.add.collider(this.player.sprite, this.pinkFrog);
    this.physics.add.collider(this.player.sprite, this.poisonShroom);

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
                    y: y * 32 + 16,
                  });
                }
              }
            }
          }
        }
      });
    }

    this.graveClusters = [];
    if (this.grave1Positions && this.grave1Positions.length > 0) {
      this.grave1Positions.forEach(pos => {
        let found = false;
        for (let cluster of this.graveClusters) {
          const dx = cluster.x - pos.x;
          const dy = cluster.y - pos.y;
          if (Math.sqrt(dx * dx + dy * dy) < 200) {
            cluster.tiles.push(pos);
            cluster.x = cluster.tiles.reduce((sum, t) => sum + t.x, 0) / cluster.tiles.length;
            cluster.y = cluster.tiles.reduce((sum, t) => sum + t.y, 0) / cluster.tiles.length;
            found = true;
            break;
          }
        }
        if (!found) {
          this.graveClusters.push({ x: pos.x, y: pos.y, tiles: [pos] });
        }
      });
      
      this.graveClusters.sort((a, b) => a.x - b.x);
      
      const mapCenterX = map.widthInPixels / 2;
      let grave1Idx = -1;
      let minDistRight = Infinity;
      this.graveClusters.forEach((cluster, idx) => {
        if (cluster.x > mapCenterX) {
          const dist = cluster.x - mapCenterX;
          if (dist < minDistRight) {
            minDistRight = dist;
            grave1Idx = idx;
          }
        }
      });
      
      if (grave1Idx === -1 && this.graveClusters.length > 0) {
        grave1Idx = Math.floor(this.graveClusters.length / 2); 
      }
      
      this.graveClusters.forEach((cluster, idx) => {
        cluster.isGrave1 = (idx === grave1Idx);
        cluster.id = cluster.isGrave1 ? 1 : (idx < grave1Idx ? idx + 2 : idx + 1);
      });
    }

    //Load static map collisions from Tiled
    this.collisionGroup = this.physics.add.staticGroup();
    const collisionLayer =
      map.getObjectLayer("collisions") || map.getObjectLayer("collsions");
    if (collisionLayer && collisionLayer.objects) {
      collisionLayer.objects.forEach((obj) => {
        if (obj.width && obj.height) {
          const rect = this.add.rectangle(
            obj.x + obj.width / 2,
            obj.y + obj.height / 2,
            obj.width,
            obj.height,
          );
          this.physics.add.existing(rect, true);
          this.collisionGroup.add(rect);
        }
      });
      this.physics.add.collider(this.player.sprite, this.collisionGroup);
    }

    // Background verify cache with Supabase
    if (cache && cache.player_id && cache.has_completed_tutorial) {
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
    this.minimapCamera = this.cameras
      .add(
        (width - modalWidth) / 2,
        (height - modalHeight) / 2,
        modalWidth,
        modalHeight,
      )
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
          this.player?.sprite?.y || 0,
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

    // Check cache to see if the player has already met Luma
    const activeCache = getCache() || {};
    this.hasTalkedToLuma = activeCache.has_talked_to_luma || false;

    // Create and configure LumaGuidanceBox for Campo Lunan objectives
    this.lumaGuidanceBox = new LumaGuidanceBox();
    this.updateLumaObjective();

    // Check if returning after completing tutorial for the first time
    if (activeCache.has_completed_tutorial && !activeCache.played_post_tutorial_dialogue) {
      this.time.delayedCall(400, () => {
        this.triggerPostTutorialSequence();
      });
    }

    // Objective Compass Arrow
    this.objectiveArrow = this.add.graphics();
    this.objectiveArrow.setDepth(15);
    this.objectiveArrow.lineStyle(2, 0x6ee7b7, 1);
    this.objectiveArrow.fillStyle(0x6ee7b7, 0.8);
    this.objectiveArrow.beginPath();
    this.objectiveArrow.moveTo(6, 0);
    this.objectiveArrow.lineTo(-6, 4);
    this.objectiveArrow.lineTo(-6, -4);
    this.objectiveArrow.closePath();
    this.objectiveArrow.fillPath();
    this.objectiveArrow.strokePath();
    this.objectiveArrow.setVisible(false);

    // Always create DialogueBox instance for Campo Lunan interactions
    this.dialogue = new DialogueBox(this);
    this.dialogue.hide();

    if (!this.hasTalkedToLuma) {
      this.dialogueActive = true;
      if (this.player?.sprite?.body) {
        this.player.sprite.body.setVelocity(0);
        this.player.sprite.anims.stop();
      }

      // Create Luma sprite (initially hidden/invisible)
      this.lumaSprite = this.physics.add.sprite(spawnX + 36, spawnY - 60, "luma-idle");
      this.lumaSprite.setScale(0.3); // matches Vino's scale/proportion
      this.lumaSprite.setDepth(this.lumaSprite.y);
      this.lumaSprite.setImmovable(true);
      this.lumaSprite.setVisible(false);
      this.lumaSprite.setAlpha(0);

      if (!this.anims.exists("luma-idle-anim")) {
        this.anims.create({
          key: "luma-idle-anim",
          frames: this.anims.generateFrameNumbers("luma-idle", { start: 0, end: 3 }),
          frameRate: 5,
          repeat: -1
        });
      }
      this.lumaSprite.play("luma-idle-anim");

      // Add purple glowing effect to Luma (similar to Vino's postFX glow)
      if (this.cameras.main.postFX) {
        this.lumaGlow = this.lumaSprite.preFX.addGlow(0xbc80ff, 0, 0, false, 0.1, 10);
        this.tweens.add({
          targets: this.lumaGlow,
          outerStrength: 1.3,
          innerStrength: 0.9,
          duration: 1200,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut"
        });
      }

      this.lumaCollider = this.physics.add.collider(this.player.sprite, this.lumaSprite);

      // Part A: Vino waking up alone
      const partADialogues = [
        { speaker: "Vino", text: "... Where... am I?" },
        { speaker: "Vino", text: "This doesn't look like home..." },
        { speaker: "Vino", text: "Am I... dead?" }
      ];

      let stepA = 0;
      this.dialogue.showText(partADialogues[0].speaker, partADialogues[0].text, () => {
        const runPartA = () => {
          stepA++;
          if (stepA < partADialogues.length) {
            const next = partADialogues[stepA];
            this.dialogue.showText(next.speaker, next.text, () => runPartA());
          } else {
            // Hide dialogue box temporarily during Luma transition
            this.dialogue.hide();

            // Part B transition sequence: slow wind gust (camera shake + blue particles)
            this.cameras.main.shake(350, 0.004);
            if (this.audioManager) {
              this.audioManager.playLumaSwishSfx();
            }

            // Create crystal-spark texture at runtime if needed for wisps particle effect
            if (!this.textures.exists('crystal-spark')) {
              const g = this.make.graphics({ x: 0, y: 0 });
              g.fillStyle(0xffffff, 1);
              g.fillRect(0, 0, 4, 4);
              g.generateTexture('crystal-spark', 4, 4);
              g.destroy();
            }

            // Emit blue and purple wisps gathering around Luma's coordinates
            const emitter = this.add.particles(spawnX + 36, spawnY - 60, "crystal-spark", {
              speed: { min: 15, max: 50 },
              angle: { min: 0, max: 360 },
              scale: { start: 1.5, end: 0 },
              alpha: { start: 0.8, end: 0 },
              tint: [0x50c0ff, 0xbc80ff, 0xffffff],
              lifespan: 1200,
              quantity: 3,
              frequency: 45,
              maxParticles: 35,
              blendMode: 'SCREEN'
            });
            emitter.setDepth(this.lumaSprite.y + 1);

            // Fade in Luma (ghostly entrance)
            this.lumaSprite.setVisible(true);
            this.tweens.add({
              targets: this.lumaSprite,
              alpha: 1,
              duration: 1500,
              onComplete: () => {
                emitter.destroy();

                // Part B: Dialogue with Luma
                const partBDialogues = [
                  { speaker: "Luma", text: "... At last. You've awakened." },
                  { speaker: "Vino", text: "Who are you?" },
                  { speaker: "Luma", text: "Merely someone who has watched this place for a very long time." },
                  { speaker: "Vino", text: "Then tell me where I am." },
                  { speaker: "Luma", text: "This place is called *Campo Lunan*. It is where forgotten memories come to rest... and where forgotten souls wait to be remembered." },
                  { speaker: "Vino", text: "Forgotten... souls?" },
                  { speaker: "Luma", text: "Their stories fade. Piece by piece. Until no one remembers they ever lived." },
                  { speaker: "Vino", text: "The cemetery feels strangely empty... Why am I here?" },
                  { speaker: "Luma", text: "Because... Campo Lunan needs someone who can still hear the *echoes*." },
                  { speaker: "Vino", text: "I don't understand." },
                  { speaker: "Luma", text: "You will, Vino. *In time.*" },
                  { speaker: "Vino", text: "Hoy, wait lang!" }
                ];

                let stepB = 0;
                this.dialogue.showText(partBDialogues[0].speaker, partBDialogues[0].text, () => {
                  const runPartB = () => {
                    stepB++;
                    if (stepB < partBDialogues.length) {
                      const next = partBDialogues[stepB];
                      this.dialogue.showText(next.speaker, next.text, () => {
                        runPartB();
                      });
                    } else {
                      // Dialogue complete: fade out and destroy Luma
                      this.dialogue.hide();
                      this.dialogueActive = false;

                      if (this.audioManager) {
                        this.audioManager.playLumaSwishSfx();
                      }

                      this.tweens.add({
                        targets: this.lumaSprite,
                        alpha: 0,
                        duration: 1600,
                        onComplete: () => {
                          this.lumaSprite?.destroy();
                          if (this.lumaCollider) {
                            this.physics.world.removeCollider(this.lumaCollider);
                          }

                          // Persist talked to Luma state
                          const freshCache = getCache() || {};
                          freshCache.has_talked_to_luma = true;
                          setCache(freshCache);
                          this.hasTalkedToLuma = true;
                          this.updateLumaObjective();
                          this.saveProgress(true);
                        }
                      });
                    }
                  };
                  runPartB();
                });
              }
            });
          }
        };
        runPartA();
      });
    } else if (this.hasTalkedToLuma && !activeCache.has_completed_tutorial) {
      // Spawn persistent glowing Luma NPC at upper pathway until tutorial is finished
      const targetX = 1410;
      const targetY = 1074;
      this.luma2PersistentSprite = this.physics.add.sprite(targetX, targetY, "luma-idle");
      this.luma2PersistentSprite.setScale(0.3);
      this.luma2PersistentSprite.setDepth(this.luma2PersistentSprite.y);
      this.luma2PersistentSprite.setImmovable(true);
      if (!this.anims.exists("luma-idle-anim")) {
        this.anims.create({
          key: "luma-idle-anim",
          frames: this.anims.generateFrameNumbers("luma-idle", { start: 0, end: 3 }),
          frameRate: 5,
          repeat: -1
        });
      }
      this.luma2PersistentSprite.play("luma-idle-anim");
      if (this.cameras.main.postFX) {
        const glow = this.luma2PersistentSprite.preFX.addGlow(0xbc80ff, 0, 0, false, 0.1, 10);
        this.tweens.add({
          targets: glow,
          outerStrength: 1.3,
          innerStrength: 0.9,
          duration: 1200,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut"
        });
      }
      this.physics.add.collider(this.player.sprite, this.luma2PersistentSprite);
    } else {
      this.dialogueActive = false;
    }

    const triggerGraveDialogue = () => {
      this.dialogueActive = true;
      if (this.player && this.player.sprite && this.player.sprite.body) {
        this.player.sprite.body.setVelocity(0);
        if (this.player.sprite.anims.isPlaying) {
          this.player.sprite.anims.stop();
        }
      }

      if (!this.currentGraveCluster || !this.currentGraveCluster.isGrave1) {
        const customGraves = {
          2: { title: "Grave II\nSinulid ng Panahon (Threads of Time)", desc: "A memory of traditional weaving. (Cannot enter yet)" },
          3: { title: "Grave III\nAng Huling Tinig (The Last Voice)", desc: "A memory of Philippine folklore and oral tradition. (Cannot enter yet)" },
          4: { title: "Grave IV\nGinto at Asin (Gold and Salt)", desc: "A memory of regional trade and barter. (Cannot enter yet)" },
          5: { title: "Grave V\nAng Pinunong Iniwan (The Abandoned King)", desc: "A memory of pre-colonial civilization and leadership. (Cannot enter yet)" },
          6: { title: "Grave VI\nLihim ng Kalikasan (Secret of Nature)", desc: "A memory of indigenous farming and harmony with the land. (Cannot enter yet)" },
          7: { title: "Grave VII\nAwit ng Bagani (Song of the Warrior)", desc: "A memory of traditional martial arts and defense. (Cannot enter yet)" },
          8: { title: "Grave VIII\nSayaw ng Pagsamo (Dance of Supplication)", desc: "A memory of pre-colonial rituals and spirituality. (Cannot enter yet)" },
        };
        
        const id = this.currentGraveCluster ? this.currentGraveCluster.id : 2;
        const graveData = customGraves[id] || { title: `Grave ${id}\nUnknown Memory`, desc: "A forgotten memory waiting to be discovered. (Cannot enter yet)" };

        this.dialogue.showText(
          "Tombstone",
          `${graveData.title}\n\n${graveData.desc}`,
          () => {
            this.dialogue.hide();
            this.dialogueActive = false;
          }
        );
        return;
      }

      const cache = getCache();
      if (cache?.is_exploration_mode) {
        this.dialogue.showText(
          "Grave I",
          "You are wandering Campo Lunan. Teleporting to Memory Worlds is disabled in this exploration mode.",
          () => {
            this.dialogue.hide();
            this.dialogueActive = false;
          }
        );
        return;
      }

      let step = 0;
      const steps = [
        {
          speaker: "Tombstone",
          text: "Grave I\nAng Huling Mangingisda\nThe Last Fisherman",
        },
        {
          speaker: "Memory",
          text: '"The sea remembers... but the village does not."',
        },
        {
          speaker: "Grave I",
          text: "A forgotten fisherman waits beyond these echoes. Discover the memories he left behind and reveal the truth hidden beneath the waves.",
        },
        { speaker: "Campo Lunan", text: "Will you answer the sea's call?" },
        {
          speaker: "Grave I",
          text: "▶ Enter the Memory (Click dialogue box or press E to Enter, ESC to Cancel)",
        },
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
              // Keep dialogueActive = true so Vino stays still during portal transition!

              // Set the area cache to Grave 1 before transitioning
              const currentCache = getCache();
              if (currentCache) {
                setCache({
                  ...currentCache,
                  current_area: "Grave 1",
                  position_x: 1137,
                  position_y: 550,
                });
              }

              if (this.lumaGuidanceBox) {
                this.lumaGuidanceBox.destroy();
                this.lumaGuidanceBox = null;
              }

              import("../ui/portalLoadingScreen.js").then(({ PortalLoadingScreen }) => {
                const loadingScreen = new PortalLoadingScreen({
                  title: "GRAVE I",
                  subtitle: "Entering Memory",
                  hint: "Crossing the veil between Campo Lunan and forgotten memories..."
                });
                
                setTimeout(() => {
                  import("../systems/TransitionSystem.js").then(
                    ({ TransitionSystem }) => {
                      TransitionSystem.fadeToScene(this, "Grave1", { loadingScreen });
                    },
                  );
                }, 1800);
              });
            }
          });
        }
      };

      runDialogue();
    };

    this.hasTalkedToCreatures = false;

    const triggerCreaturesDialogue = () => {
      this.dialogueActive = true;
      if (this.player?.sprite?.body) {
        this.player.sprite.body.setVelocity(0);
        this.player.sprite.anims.stop();
      }

      if (this.hasTalkedToCreatures) {
        this.dialogue.showText(
          "Vino",
          "Maybe not a good idea",
          () => {
            this.dialogue.hide();
            this.dialogueActive = false;
          }
        );
        return;
      }

      const sequence = [
        { speaker: "Pink Frog", text: "DE WAYYYY!!!!!" },
        { speaker: "Poison Shroom", text: "the frog has been saying that for a while i just wanna sleep" },
        { speaker: "Poison Shroom", text: "peanut or done?" },
        { speaker: "Vino", text: "those two are weird better leave them be" }
      ];

      let step = 0;
      const runStep = () => {
        if (step < sequence.length) {
          const current = sequence[step];
          this.dialogue.showText(current.speaker, current.text, () => {
            step++;
            runStep();
          });
        } else {
          this.dialogue.hide();
          this.dialogueActive = false;
          this.hasTalkedToCreatures = true;
        }
      };

      runStep();
    };

    // Luma Second Appearance (Upper Pathway ID 68)
    const luma2TargetX = 1410;
    const luma2TargetY = 1074;
    this.luma2Pos = { x: luma2TargetX, y: luma2TargetY };

    this.triggerLumaSecondAppearance = () => {
      if (this.hasTriggeredLumaSecondAppearance) return;
      this.hasTriggeredLumaSecondAppearance = true;
      this.dialogueActive = true;
      if (this.player?.sprite?.body) {
        this.player.sprite.body.setVelocity(0);
        this.player.sprite.anims.stop();
      }

      if (!this.luma2PersistentSprite) {
        this.luma2PersistentSprite = this.physics.add.sprite(luma2TargetX, luma2TargetY, "luma-idle");
      }
      const luma2Sprite = this.luma2PersistentSprite;
      luma2Sprite.setScale(0.3);
      luma2Sprite.setDepth(luma2Sprite.y);

      // Camera shake & sound effect
      this.cameras.main.shake(350, 0.004);
      if (this.audioManager) {
        this.audioManager.playLumaSwishSfx();
      }

      const lumaSecondDialogues = [
        { speaker: "Vino", text: "This place..." },
        { speaker: "Vino", text: "It feels..." },
        { speaker: "Vino", text: "Broken." },
        { speaker: "Luma", text: "It wasn't always." },
        { speaker: "Luma", text: "There was a time when every lantern burned brightly." },
        { speaker: "Luma", text: "Every grave carried a name." },
        { speaker: "Luma", text: "And every soul found peace." },
        { speaker: "Vino", text: "What happened?" },
        { speaker: "Luma", text: "..." },
        { speaker: "Luma", text: "Memories were forgotten." },
        { speaker: "Luma", text: "When a story disappears..." },
        { speaker: "Luma", text: "So does the soul." },
        { speaker: "Vino", text: "Can they be saved?" },
        { speaker: "Luma", text: "They can. But not by force. Only by remembering." },
        { speaker: "Vino", text: "What do I have to do?" },
        { speaker: "Luma", text: "A soul's memory is shattered into glowing glass fragments." },
        { speaker: "Luma", text: "To save a soul, you must break its glass seals and restore its scattered fragments." },
        { speaker: "Luma", text: "Here... let me show you how to face a fragment." }
      ];

      let step = 0;
      const runDialogue = () => {
        if (step < lumaSecondDialogues.length) {
          const current = lumaSecondDialogues[step];
          this.dialogue.showText(current.speaker, current.text, () => {
            step++;
            runDialogue();
          });
        } else {
          this.dialogue.hide();
          this.dialogue.onComplete = null; // PREVENT SPACEBAR SPAM
          // Keep dialogueActive = true during transition to prevent interaction prompts

          if (this.audioManager) {
            this.audioManager.playLumaSwishSfx();
          }

          // Create practice fragment sprite
          if (!this.anims.exists("fragment-idle-anim")) {
            this.anims.create({
              key: "fragment-idle-anim",
              frames: this.anims.generateFrameNumbers("fragment-idle"),
              frameRate: 6,
              repeat: -1,
            });
          }

          const fragment = this.add.sprite(luma2TargetX - 35, luma2TargetY + 15, "fragment-idle");
          fragment.setScale(0);
          fragment.setDepth(luma2Sprite.y + 1);
          fragment.play("fragment-idle-anim");
          this.tutorialFragment = fragment;

          this.tweens.add({
            targets: fragment,
            scaleX: 32 / 64,
            scaleY: 32 / 64,
            duration: 800,
            ease: "Back.easeOut"
          });

          // Play shattered glass transition & auto-dive into tutorial!
          this.time.delayedCall(800, () => {
            TransitionSystem.shatteredGlassTransition(this, () => {
              if (this.audioManager) this.audioManager.stopMusic();
              if (this.lumaGuidanceBox) this.lumaGuidanceBox.hide();
              if (this.interactionPrompt) this.interactionPrompt.hide();
              if (this.hud) this.hud.setPauseVisible(false);
              if (this.objectiveArrow) this.objectiveArrow.setVisible(false);

              this.scene.pause();
              this.scene.launch("tutorial-bullet-hell", {
                returnScene: "CampoLunanScene",
                onComplete: () => {
                  const cache = getCache() || {};
                  cache.has_completed_tutorial = true;
                  setCache(cache);

                  this.scene.stop("tutorial-bullet-hell");
                  this.scene.resume("CampoLunanScene");
                  if (this.luma2PersistentSprite) this.luma2PersistentSprite.destroy();
                  if (this.tutorialFragment) this.tutorialFragment.destroy();
                  if (this.hud) this.hud.setPauseVisible(true);
                  if (this.lumaGuidanceBox) this.lumaGuidanceBox.show();
                  this.triggerPostTutorialSequence();
                }
              });
            });
          });
        }
      };
      runDialogue();
    };

    this.reenterTutorial = () => {
      if (!this.tutorialFragment) return;
      this.dialogueActive = true;
      if (this.player?.sprite?.body) {
        this.player.sprite.body.setVelocity(0);
        this.player.sprite.anims.stop();
      }
      
      TransitionSystem.shatteredGlassTransition(this, () => {
        if (this.audioManager) this.audioManager.stopMusic();
        if (this.lumaGuidanceBox) this.lumaGuidanceBox.hide();
        if (this.interactionPrompt) this.interactionPrompt.hide();
        if (this.hud) this.hud.setPauseVisible(false);
        if (this.objectiveArrow) this.objectiveArrow.setVisible(false);

        this.scene.pause();
        this.scene.launch("tutorial-bullet-hell", {
          returnScene: "CampoLunanScene",
          onComplete: () => {
            const cache = getCache() || {};
            cache.has_completed_tutorial = true;
            setCache(cache);

            this.scene.stop("tutorial-bullet-hell");
            this.scene.resume("CampoLunanScene");
            if (this.luma2PersistentSprite) this.luma2PersistentSprite.destroy();
            if (this.tutorialFragment) this.tutorialFragment.destroy();
            if (this.hud) this.hud.setPauseVisible(true);
            if (this.lumaGuidanceBox) this.lumaGuidanceBox.show();
            this.triggerPostTutorialSequence();
          }
        });
      });
    };





    this.triggerPostTutorialSequence = () => {
      const activeCache = getCache() || {};
      if (activeCache.played_post_tutorial_dialogue) return;
      activeCache.played_post_tutorial_dialogue = true;
      setCache(activeCache);

      this.dialogueActive = true;
      if (this.player?.sprite?.body) {
        this.player.sprite.body.setVelocity(0);
        this.player.sprite.anims.stop();
      }

      const px = this.player?.sprite?.x || 1410;
      const py = this.player?.sprite?.y || 1074;

      const postLuma = this.physics.add.sprite(px + 36, py - 40, "luma-idle");
      postLuma.setScale(0.3);
      postLuma.setDepth(postLuma.y);
      if (!this.anims.exists("luma-idle-anim")) {
        this.anims.create({
          key: "luma-idle-anim",
          frames: this.anims.generateFrameNumbers("luma-idle", { start: 0, end: 3 }),
          frameRate: 5,
          repeat: -1
        });
      }
      postLuma.play("luma-idle-anim");

      const postTutorialDialogues = [
        { speaker: "Luma", text: "Well done, Vino. You now know how to shatter the glass seals and restore a soul's memory." },
        { speaker: "Luma", text: "Now, walk among the forgotten graves. Listen to those left behind... restore what has been scattered." }
      ];

      let postStep = 0;
      const runPostDialogue = () => {
        if (postStep < postTutorialDialogues.length) {
          const current = postTutorialDialogues[postStep];
          this.dialogue.showText(current.speaker, current.text, () => {
            postStep++;
            runPostDialogue();
          });
        } else {
          this.dialogue.hide();
          this.dialogueActive = false;

          if (this.audioManager) {
            if (typeof this.audioManager.playLumaSwishSfx === "function") {
              this.audioManager.playLumaSwishSfx();
            } else if (typeof this.audioManager.playLumaSwish === "function") {
              this.audioManager.playLumaSwish();
            }
          }

          this.tweens.add({
            targets: postLuma,
            alpha: 0,
            duration: 1400,
            onComplete: () => {
              postLuma.destroy();
              this.updateLumaObjective();
            }
          });
        }
      };

      this.time.delayedCall(400, () => {
        runPostDialogue();
      });
    };

    // Keyboard bindings for dialogue & interaction
    this.input.keyboard.on("keydown-E", () => {
      if (this.dialogueActive) {
        this.dialogue.onComplete();
      } else if (this.isNearTutorialFragment) {
        this.reenterTutorial();
      } else if (this.isNearLuma2) {
        this.triggerLumaSecondAppearance();
      } else if (this.isNearGrave) {
        triggerGraveDialogue();
      } else if (this.isNearCreatures) {
        triggerCreaturesDialogue();
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

    this.events.on("resume", () => {
      this.cameras.main.fadeIn(300, 0, 0, 0);
      if (this.transitionFadeBlack) {
        this.transitionFadeBlack.destroy();
        this.transitionFadeBlack = null;
      }
    });

    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.game.events.emit("game-ready");
  }

  async saveProgress(forceBackendSave = false) {
    if (window.isExplorationMode) return;
    const cache = getCache();
    if (!cache || !cache.player_id || cache.is_exploration_mode || cache.player_id === "explorer" || !this.player?.sprite) return;

    // During intro tutorial sequence, don't blindly autosave coordinates to backend
    // to avoid spam, unless a manual forceBackendSave (like dialogue finish) is called.
    if (!cache.has_completed_tutorial && !forceBackendSave) {
      return; 
    }

    const state = {
      current_world: "Lunan",
      current_area: "Campo Lunan",
      position_x: Math.round(this.player.sprite.x),
      position_y: Math.round(this.player.sprite.y),
      explored_chunks: Array.from(this.exploredChunks || []),
      // Sync tutorial and game flags to backend
      has_talked_to_luma: cache.has_talked_to_luma || false,
      has_completed_tutorial: cache.has_completed_tutorial || false,
      played_post_tutorial_dialogue: cache.played_post_tutorial_dialogue || false,
      essence: cache.essence !== undefined ? cache.essence : 5,
    };

    const stateString = JSON.stringify(state);
    const hasStateChanged = this.lastSavedStateString !== stateString;

    // Update local cache immediately
    setCache({
      ...cache,
      ...state,
    });

    // Skip backend API call if nothing changed, to throttle network requests
    if (!forceBackendSave && !hasStateChanged) {
      return; 
    }

    if (this.isSaving) return; // Prevent overlapping API calls
    this.isSaving = true;

    // Save/sync with Supabase backend in the background
    try {
      await saveGameState(cache.player_id, state);
      this.lastSavedStateString = stateString;
      syncOfflineData();
    } catch (err) {
      console.error("Autosave database sync failed:", err.message);
    } finally {
      this.isSaving = false;
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
          this.player.sprite.y,
        );
      }

      if (this.minimapPlayerDot && this.player && this.player.sprite) {
        this.minimapPlayerDot.clear();
        this.minimapPlayerDot.fillStyle(0x2dd4bf, 1);
        this.minimapPlayerDot.fillCircle(
          this.player.sprite.x,
          this.player.sprite.y,
          12,
        );
      }

      if (
        !this.lastExploredChunksSize ||
        this.exploredChunks.size !== this.lastExploredChunksSize
      ) {
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

    let nearGrave = false;
    let nearestDist = Infinity;
    let closestGraveCluster = null;
    
    if (this.graveClusters && this.graveClusters.length > 0) {
      for (const cluster of this.graveClusters) {
        const dist = Phaser.Math.Distance.Between(
          this.player.sprite.x,
          this.player.sprite.y,
          cluster.x,
          cluster.y,
        );
        if (dist < nearestDist) {
          nearestDist = dist;
          closestGraveCluster = cluster;
        }
      }
    }

    // Distance checks for NPCs / Creatures
    const distFrog = Phaser.Math.Distance.Between(
      this.player.sprite.x,
      this.player.sprite.y,
      this.pinkFrog.x,
      this.pinkFrog.y,
    );
    const distShroom = Phaser.Math.Distance.Between(
      this.player.sprite.x,
      this.player.sprite.y,
      this.poisonShroom.x,
      this.poisonShroom.y,
    );
    const midX = (this.pinkFrog.x + this.poisonShroom.x) / 2;
    const midY = (this.pinkFrog.y + this.poisonShroom.y) / 2;
    const distMid = Phaser.Math.Distance.Between(
      this.player.sprite.x,
      this.player.sprite.y,
      midX,
      midY,
    );

    const distLuma2 = this.luma2Pos ? Phaser.Math.Distance.Between(
      this.player.sprite.x,
      this.player.sprite.y,
      this.luma2Pos.x,
      this.luma2Pos.y,
    ) : Infinity;

    const currentCache = getCache() || {};
    if (distLuma2 < 75 && !currentCache.has_completed_tutorial && !this.hasTriggeredLumaSecondAppearance) {
      this.triggerLumaSecondAppearance();
      return;
    }

    this.isNearCreatures = distFrog < 60 || distShroom < 60 || distMid < 80;

    let nearTutorialFragment = false;
    if (this.tutorialFragment && this.tutorialFragment.active && !currentCache.has_completed_tutorial) {
      const distFrag = Phaser.Math.Distance.Between(
        this.player.sprite.x,
        this.player.sprite.y,
        this.tutorialFragment.x,
        this.tutorialFragment.y
      );
      if (distFrag < 50) {
        nearTutorialFragment = true;
      }
    }
    this.isNearTutorialFragment = nearTutorialFragment;

    if (nearTutorialFragment) {
      this.hud.setStatus("PRESS [E] TO TOUCH THE FRAGMENT");
      if (this.interactionPrompt && this.tutorialFragment) {
        this.interactionPrompt.show(this.tutorialFragment, "E", "TOUCH", -15);
      }
    } else if (nearestDist < 80) {
      nearGrave = true;
      this.currentGraveCluster = closestGraveCluster;
      if (closestGraveCluster.isGrave1) {
        this.hud.setStatus("PRESS [E] TO INSPECT THE LAST FISHERMAN'S GRAVE");
      } else {
        this.hud.setStatus(`PRESS [E] TO INSPECT GRAVE ${closestGraveCluster.id}`);
      }
      if (this.interactionPrompt && closestGraveCluster) {
        this.interactionPrompt.show(closestGraveCluster, "E", "INSPECT GRAVE", -15);
      }
    } else if (this.isNearCreatures) {
      this.hud.setStatus("PRESS [E] TO TALK TO THE CREATURES");
      if (this.interactionPrompt) {
        this.interactionPrompt.show({ x: midX, y: midY - 20 }, "E", "TALK");
      }
    } else {
      this.hud.setStatus(
        "WASD / ARROWS TO MOVE - SHIFT TO DASH - P TO PAUSE - M FOR MEMORY",
      );
      if (this.interactionPrompt) {
        this.interactionPrompt.hide();
      }
    }

    // Update Objective Compass Arrow
    if (this.objectiveArrow && this.player && this.player.sprite) {
      const activeCache = getCache() || {};
      const talkedLuma1 = activeCache.has_talked_to_luma || this.hasTalkedToLuma;
      const completedTutorial = activeCache.has_completed_tutorial;

      let targetX = null;
      let targetY = null;

      if (completedTutorial) {
        const grave1 = this.graveClusters?.find(c => c.isGrave1);
        if (grave1) {
          targetX = grave1.x;
          targetY = grave1.y;
        }
      }

      if (targetX !== null && targetY !== null) {
        this.objectiveArrow.setVisible(true);
        const px = this.player.sprite.x;
        const py = this.player.sprite.y;
        const angle = Phaser.Math.Angle.Between(px, py, targetX, targetY);
        
        const radius = 35;
        this.objectiveArrow.x = px + Math.cos(angle) * radius;
        this.objectiveArrow.y = py + Math.sin(angle) * radius;
        this.objectiveArrow.rotation = angle;
      } else {
        this.objectiveArrow.setVisible(false);
      }
    }

    this.isNearGrave = nearGrave;
  }

  updateLumaObjective() {
    if (!this.lumaGuidanceBox) return;

    const activeCache = getCache() || {};
    const talkedLuma1 = activeCache.has_talked_to_luma || this.hasTalkedToLuma;
    const completedTutorial = activeCache.has_completed_tutorial;

    if (completedTutorial) {
      // Objective after completing tutorial
      this.lumaGuidanceBox.update(
        "Seek the Forgotten Graves & Restore Lost Souls",
        "<em>\"Walk among the graves. Listen to those left behind... restore what has been scattered.\"</em>",
        "ECHOES OF THE PAST"
      );
      this.lumaGuidanceBox.show();
    } else if (talkedLuma1) {
      // Objective after 1st Luma interaction (before tutorial)
      this.lumaGuidanceBox.update(
        "Find Luma at the Upper Pathway & Learn to Face Echoes",
        "<em>\"Luma is waiting for you near the upper graveyard path...\"</em>",
        "LESSON OF THE ECHOES"
      );
      this.lumaGuidanceBox.show();
    } else {
      this.lumaGuidanceBox.hide();
    }
  }
}
