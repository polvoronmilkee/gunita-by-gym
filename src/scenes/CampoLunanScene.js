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
                  { speaker: "Vino", text: "Hoy, wait lang!" },
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
                          this.saveProgress();
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

      const cache = getCache();
      if (cache?.is_guest || cache?.player_id === "guest_account") {
        this.dialogue.showText(
          "Grave I",
          "This Memory World is sealed for Guest accounts. Register a Codename in the Main Menu to enter World 1!",
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

    // Luma Second Appearance (TMJ Object ID 68)
    const luma68Obj = charsLayer?.objects?.find((o) => o.id === 68 || o.name === "luma");

    const luma2TargetX = luma68Obj ? luma68Obj.x : 1410;
    const luma2TargetY = luma68Obj ? luma68Obj.y : 1074;
    this.luma2Pos = { x: luma2TargetX, y: luma2TargetY };

    this.hasTriggeredLumaSecondAppearance = activeCache.luma_second_appearance_done || false;

    this.triggerLumaSecondAppearance = () => {
      if (this.hasTriggeredLumaSecondAppearance) return;
      this.hasTriggeredLumaSecondAppearance = true;
      this.dialogueActive = true;
      if (this.player?.sprite?.body) {
        this.player.sprite.body.setVelocity(0);
        this.player.sprite.anims.stop();
      }

      // Create Luma sprite (initially hidden) at target position
      const luma2Sprite = this.physics.add.sprite(luma2TargetX, luma2TargetY, "luma-idle");
      luma2Sprite.setScale(0.3);
      luma2Sprite.setDepth(luma2Sprite.y);
      luma2Sprite.setImmovable(true);
      luma2Sprite.setVisible(false);
      luma2Sprite.setAlpha(0);

      if (!this.anims.exists("luma-idle-anim")) {
        this.anims.create({
          key: "luma-idle-anim",
          frames: this.anims.generateFrameNumbers("luma-idle", { start: 0, end: 3 }),
          frameRate: 5,
          repeat: -1
        });
      }
      luma2Sprite.play("luma-idle-anim");

      // Glowing effect
      if (this.cameras.main.postFX) {
        const glow = luma2Sprite.preFX.addGlow(0xbc80ff, 0, 0, false, 0.1, 10);
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

      // Camera shake & sound effect
      this.cameras.main.shake(350, 0.004);
      if (this.audioManager) {
        if (typeof this.audioManager.playLumaSwishSfx === "function") {
          this.audioManager.playLumaSwishSfx();
        } else if (typeof this.audioManager.playLumaSwish === "function") {
          this.audioManager.playLumaSwish();
        }
      }

      // Crystal spark particles gathering
      if (!this.textures.exists("crystal-spark")) {
        const g = this.make.graphics({ x: 0, y: 0 });
        g.fillStyle(0xffffff, 1);
        g.fillRect(0, 0, 4, 4);
        g.generateTexture("crystal-spark", 4, 4);
        g.destroy();
      }

      const emitter = this.add.particles(luma2TargetX, luma2TargetY, "crystal-spark", {
        speed: { min: 15, max: 50 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.5, end: 0 },
        alpha: { start: 0.8, end: 0 },
        tint: [0x50c0ff, 0xbc80ff, 0xffffff],
        lifespan: 1200,
        quantity: 3,
        frequency: 45,
        maxParticles: 35,
        blendMode: "SCREEN"
      });
      emitter.setDepth(luma2Sprite.y + 1);

      // Fade in Luma
      luma2Sprite.setVisible(true);
      this.tweens.add({
        targets: luma2Sprite,
        alpha: 1,
        duration: 1500,
        onComplete: () => {
          emitter.destroy();

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
            { speaker: "Luma", text: "They can." },
            { speaker: "Luma", text: "But not by force." },
            { speaker: "Luma", text: "Only by remembering." },
            { speaker: "Vino", text: "What do I have to do?" },
            { speaker: "Luma", text: "Walk among the graves." },
            { speaker: "Luma", text: "Listen to those left behind." },
            { speaker: "Luma", text: "Restore what has been scattered." },
            { speaker: "Luma", text: "When enough memories return..." },
            { speaker: "Luma", text: "The soul will remember its own name." },
            { speaker: "Vino", text: "And then?" },
            { speaker: "Luma", text: "They may finally rest." },
            { speaker: "Vino", text: "Have you done this before?" },
            { speaker: "Luma", text: "..." },
            { speaker: "Luma", text: "For longer than I care to remember." }
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
              // Dialogue complete: sound FX & fade out
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
                targets: luma2Sprite,
                alpha: 0,
                duration: 1600,
                onComplete: () => {
                  luma2Sprite.destroy();

                  this.hasTriggeredLumaSecondAppearance = true;
                  const freshCache = getCache() || {};
                  freshCache.luma_second_appearance_done = true;
                  setCache(freshCache);
                  this.updateLumaObjective();
                  this.saveProgress();
                }
              });
            }
          };
          runDialogue();
        }
      });
    };

    // Keyboard bindings for dialogue & interaction
    this.input.keyboard.on("keydown-E", () => {
      if (this.dialogueActive) {
        this.dialogue.onComplete();
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
      explored_chunks: Array.from(this.exploredChunks || []),
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

    // Proximity check for Grave 1
    let nearGrave = false;
    let nearestDist = Infinity;
    let closestGravePos = null;
    if (this.grave1Positions && this.grave1Positions.length > 0) {
      for (const pos of this.grave1Positions) {
        const dist = Phaser.Math.Distance.Between(
          this.player.sprite.x,
          this.player.sprite.y,
          pos.x,
          pos.y,
        );
        if (dist < nearestDist) {
          nearestDist = dist;
          closestGravePos = pos;
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

    if (distLuma2 < 60 && !this.hasTriggeredLumaSecondAppearance) {
      this.triggerLumaSecondAppearance();
      return;
    }

    this.isNearCreatures = distMid < 55 || distFrog < 45 || distShroom < 45;

    if (nearestDist < 40) {
      nearGrave = true;
      this.hud.setStatus("PRESS [E] TO INSPECT THE LAST FISHERMAN'S  GRAVE");
      if (this.interactionPrompt && closestGravePos) {
        this.interactionPrompt.show(closestGravePos, "E", "INSPECT GRAVE", -15);
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
    this.isNearGrave = nearGrave;
  }

  updateLumaObjective() {
    if (!this.lumaGuidanceBox) return;

    const activeCache = getCache() || {};
    const talkedLuma1 = activeCache.has_talked_to_luma || this.hasTalkedToLuma;
    const talkedLuma2 = activeCache.luma_second_appearance_done || this.hasTriggeredLumaSecondAppearance;

    if (talkedLuma2) {
      // Objective after 2nd Luma interaction
      this.lumaGuidanceBox.update(
        "Seek the Forgotten Graves & Restore Lost Souls",
        "<em>\"Walk among the graves. Listen to those left behind... restore what has been scattered.\"</em>",
        "ECHOES OF THE PAST"
      );
      this.lumaGuidanceBox.show();
    } else if (talkedLuma1) {
      // Objective after 1st Luma interaction
      this.lumaGuidanceBox.update(
        "Explore Campo Lunan & Discover Your Purpose",
        "<em>\"Listen closely to the whispers of this place... you will understand in time.\"</em>",
        "AWAKENING PURPOSE"
      );
      this.lumaGuidanceBox.show();
    } else {
      this.lumaGuidanceBox.hide();
    }
  }
}
