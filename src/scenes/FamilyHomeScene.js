import Phaser from "phaser";
import { CameraSystem } from "../systems/CameraSystem.js";
import { HudOverlay } from "../ui/HudOverlay.js";
import { DialogueBox } from "../ui/DialogueBox.js";
import { Player } from "../entities/Player.js";
import { InteractionPrompt } from "../ui/InteractionPrompt.js";
import { getCache, setCache } from "../save.js";
import { saveGameState, loadGameState, syncOfflineData } from "../utils/api.js";
import { AudioManager } from "../utils/audioManager.js";
import { TransitionSystem } from "../systems/TransitionSystem.js";
import { showArtifactClaimModal as displayArtifactClaimModal } from "../ui/ArtifactClaimModal.js";
import { addInventoryItem } from "../utils/api.js";

export class FamilyHomeScene extends Phaser.Scene {
  constructor() {
    super("FamilyHomeScene");
  }

  preload() {
    const { width, height } = this.scale;

    // Preload family-house assets
    this.load.json("family-home-map", "src/assets/family-house/family house.tmj");
    this.load.image("TilesetElement", "src/assets/family-house/TilesetElement.png");
    this.load.image("TopDownHouse_FurnitureState2", "src/assets/family-house/TopDownHouse_FurnitureState2.png");
    // Fallback for missing floors and walls png
    this.load.image("TopDownHouse_FloorsAndWalls", "src/assets/family-house/interior1.png");
    this.load.image("Interior", "src/assets/family-house/Interior.png");
    this.load.image("interior1", "src/assets/family-house/interior1.png");
    this.load.image("Items_1_32x32", "src/assets/family-house/Items_1_32x32.png");
    this.load.image("paintings", "src/assets/family-house/paintings.png");

    // Preload player animations sheets
    this.load.spritesheet("vino-idle", "src/assets/vino-spritesheets/vino-idle/vino-idle.png", { frameWidth: 208, frameHeight: 237 });
    this.load.spritesheet("vino-moving-up", "src/assets/vino-spritesheets/vino-moving-up.png", { frameWidth: 208, frameHeight: 237 });
    this.load.spritesheet("vino-moving-left", "src/assets/vino-spritesheets/vino-moving-left.png", { frameWidth: 208, frameHeight: 237 });
    this.load.spritesheet("vino-moving-right", "src/assets/vino-spritesheets/vino-moving-right.png", { frameWidth: 208, frameHeight: 237 });
    this.load.spritesheet("vino-moving-down", "src/assets/vino-spritesheets/vino-moving-down.png", { frameWidth: 208, frameHeight: 237 });
    this.load.spritesheet("sick-wife", "src/assets/grave1-v2/more-characters/sick-wife.png", { frameWidth: 40, frameHeight: 43 });
    this.load.json("sick-wife-initial", "src/assets/data/dialogues/grave1/old-wife/initial.json");
    this.load.json("sick-wife-clue", "src/assets/data/dialogues/grave1/old-wife/clue.json");
    this.load.json("riddle-rosary", "src/assets/data/dialogues/fragments-riddles/rosary.json");
    this.load.image("bg-rosary", "src/assets/grave1-elements/bullet-scenes/rosary.png");
  }

  create(data) {
    if (this.loadingText) {
      this.loadingText.destroy();
    }

    // Hide and destroy portal loading screen if passed from previous scene
    if (data && data.loadingScreen) {
      setTimeout(() => {
        data.loadingScreen.hide();
        setTimeout(() => {
          data.loadingScreen.destroy();
          this.playIntroDialogue();
        }, 400); // Wait for CSS transition
      }, 300); // Wait a bit after scene is created before hiding
    } else {
      this.playIntroDialogue();
    }

    if (!this.anims.exists("fragment-idle-anim")) {
      this.anims.create({
        key: "fragment-idle-anim",
        frames: this.anims.generateFrameNumbers("fragment-idle"),
        frameRate: 6,
        repeat: -1
      });
    }

    const mapData = this.cache.json.get("family-home-map");
    // Deep copy to avoid mutating cache
    const copiedMapData = JSON.parse(JSON.stringify(mapData));

    const tilesetKeyMap = {
      "house-elements": "TilesetElement",
      "house-elements2": "TopDownHouse_FurnitureState2",
      "floor": "TopDownHouse_FloorsAndWalls",
      "house-elements3": "Interior",
      "flooring": "interior1",
      "house-elements5": "Items_1_32x32",
      "paintings": "paintings"
    };

    copiedMapData.tilesets = copiedMapData.tilesets.map((ts) => {
      return {
        ...ts,
        image: tilesetKeyMap[ts.name] || ts.name,
      };
    });

    this.cache.tilemap.add("family-home-map-modified", {
      format: Phaser.Tilemaps.Formats ? Phaser.Tilemaps.Formats.TILED_JSON : 1,
      data: copiedMapData,
    });

    const map = this.make.tilemap({ key: "family-home-map-modified" });

    const tilesetList = [];
    copiedMapData.tilesets.forEach((ts) => {
      const added = map.addTilesetImage(ts.name, tilesetKeyMap[ts.name]);
      if (added) tilesetList.push(added);
    });

    this.worldWidth = map.widthInPixels;
    this.worldHeight = map.heightInPixels;

    // Create tile layers
    const floorLayer = map.createLayer("floor", tilesetList, 0, 0);
    const wallLayer = map.createLayer("wall", tilesetList, 0, 0);
    const wall2Layer = map.createLayer("wall2", tilesetList, 0, 0);
    const obj1Layer = map.createLayer("objectslayer1", tilesetList, 0, 0);
    const obj2Layer = map.createLayer("objectslayer2", tilesetList, 0, 0);
    const obj3Layer = map.createLayer("objectslayer3", tilesetList, 0, 0);

    if (floorLayer) floorLayer.setDepth(-10);
    if (wallLayer) wallLayer.setDepth(-5);
    if (wall2Layer) wall2Layer.setDepth(-4);
    if (obj1Layer) obj1Layer.setDepth(-3);
    if (obj2Layer) obj2Layer.setDepth(-2);
    if (obj3Layer) obj3Layer.setDepth(10);

    // Initialize HUD and UI
    this.hud = new HudOverlay(this, {
      status: "WASD / ARROWS TO MOVE   E TO EXIT",
      onPause: () => {
        this.saveProgress();
        this.scene.launch("PauseScene", { parentScene: this });
        this.scene.pause();
      }
    });
    this.hud.setBackVisible(false);
    this.hud.setPauseVisible(true);
    this.hud.setMemoryVisible(false);

    this.interactionPrompt = new InteractionPrompt(this);

    // Load static map collisions from Tiled
    this.collisionGroup = this.physics.add.staticGroup();
    const collisionLayer = map.getObjectLayer("Object Layer 1");
    if (collisionLayer && collisionLayer.objects) {
      collisionLayer.objects.forEach((obj) => {
        if (obj.id === 53 || obj.name === "sick-wife") {
          this.sickWifeSprite = this.physics.add.sprite(obj.x + (obj.width || 0) / 2, obj.y - (obj.height || 0) / 2, "sick-wife");
          this.sickWifeSprite.setDepth(this.sickWifeSprite.y);
          this.sickWifeSprite.setImmovable(true);
          if (!this.anims.exists("sick-wife-idle")) {
            this.anims.create({
              key: "sick-wife-idle",
              frames: this.anims.generateFrameNumbers("sick-wife", { start: 6, end: 7 }),
              frameRate: 5,
              repeat: -1
            });
          }
          this.sickWifeSprite.play("sick-wife-idle");
        } else if (obj.width && obj.height) {
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
    }

    const charsLayer = map.getObjectLayer("chars");
    if (charsLayer && charsLayer.objects) {
      charsLayer.objects.forEach((obj) => {
        if (obj.id === 53 || obj.name === "sick-wife") {
          this.sickWifeSprite = this.physics.add.sprite(obj.x + (obj.width || 0) / 2, obj.y - (obj.height || 0) / 2, "sick-wife");
          this.sickWifeSprite.setDepth(this.sickWifeSprite.y);
          this.sickWifeSprite.setImmovable(true);
          if (!this.anims.exists("sick-wife-idle")) {
            this.anims.create({
              key: "sick-wife-idle",
              frames: this.anims.generateFrameNumbers("sick-wife", { start: 6, end: 7 }),
              frameRate: 5,
              repeat: -1
            });
          }
          this.sickWifeSprite.play("sick-wife-idle");
        }
      });
    }

    // Default spawn coordinate inside house
    const startCache = getCache();
    let spawnX = 500;
    let spawnY = 1140;

    if (startCache && (startCache.current_area === "FamilyHomeScene" || startCache.current_area === "FamilyHome") && startCache.position_x !== undefined) {
      spawnX = startCache.position_x;
      spawnY = startCache.position_y;
    }

    // Create Vino Animations if not created yet
    if (!this.anims.exists("vino-idle")) {
      this.anims.create({
        key: "vino-idle",
        frames: this.anims.generateFrameNumbers("vino-idle", { start: 0, end: 4 }),
        frameRate: 5,
        repeat: -1,
      });
    }
    if (!this.anims.exists("vino-moving-up")) {
      this.anims.create({
        key: "vino-moving-up",
        frames: this.anims.generateFrameNumbers("vino-moving-up", { start: 0, end: 2 }),
        frameRate: 5,
        repeat: -1,
      });
    }
    if (!this.anims.exists("vino-moving-left")) {
      this.anims.create({
        key: "vino-moving-left",
        frames: this.anims.generateFrameNumbers("vino-moving-left", { start: 0, end: 2 }),
        frameRate: 5,
        repeat: -1,
      });
    }
    if (!this.anims.exists("vino-moving-right")) {
      this.anims.create({
        key: "vino-moving-right",
        frames: this.anims.generateFrameNumbers("vino-moving-right", { start: 0, end: 2 }),
        frameRate: 5,
        repeat: -1,
      });
    }
    if (!this.anims.exists("vino-moving-down")) {
      this.anims.create({
        key: "vino-moving-down",
        frames: this.anims.generateFrameNumbers("vino-moving-down", { start: 0, end: 2 }),
        frameRate: 5,
        repeat: -1,
      });
    }

    this.audioManager = new AudioManager(this, "village-v1");

    this.player = new Player(this, spawnX, spawnY, {
      onDashStart: () => this.audioManager.playDashSfx(),
    });
    this.player.sprite.setDepth(0);
    this.player.sprite.setScale(0.25);
    this.cursors = this.input.keyboard.createCursorKeys();

    this.physics.add.collider(this.player.sprite, this.collisionGroup);
    if (this.sickWifeSprite) {
      this.physics.add.collider(this.player.sprite, this.sickWifeSprite);
    }

    CameraSystem.configureMainCamera(this, this.worldWidth, this.worldHeight);
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    CameraSystem.follow(this, this.player.sprite);
    this.cameras.main.setZoom(2);

    // Escape or P opens pause menu
    this.input.keyboard.on("keydown-P", () => this.handlePause());
    this.input.keyboard.on("keydown-ESC", () => this.handlePause());

    this.input.keyboard.on("keydown-E", () => {
      if (this.scene.isPaused()) return;
      if (this.dialogueActive) return;

      if (this.currentFragment && this.currentFragment.active) {
        const distToFragment = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, this.currentFragment.x, this.currentFragment.y);
        if (distToFragment < 60) {
          const riddleData = this.cache.json.get("riddle-rosary") || {};
          this.startFragmentChallenge(riddleData, () => {
            if (this.currentFragment) {
              this.currentFragment.destroy();
              this.currentFragment = null;
            }
            try {
              const cache = getCache();
              const inventoryId = cache ? (cache.inventory_id || cache.player_id) : "local_unknown";
              addInventoryItem(inventoryId, "rosary", "memory_fragment");
            } catch (e) {
              console.warn("Failed to add inventory item:", e);
            }
            this.showArtifactClaimModal("rosary", () => {
              this.dialogueActive = false;
            });
          }, () => {
            this.startDialogueSequence([{ speaker: "Vino", text: "That answer doesn't seem right... I should try again." }]);
          }, "bg-rosary", "fragment-rosary");
          return; // ensure we don't also trigger sick wife
        }
      }

      if (this.isNearSickWife) {
        this.talkToSickWife();
      }
    });

    this.input.keyboard.on("keydown-SPACE", () => {
      if (this.dialogueActive && this.dialogue && typeof this.dialogue.onComplete === 'function') {
        this.dialogue.onComplete();
      }
    });
    this.input.keyboard.on("keydown-BACKSPACE", async () => {
      await this.saveProgress();
      window.returnToGunitaMenu?.();
    });

    // Autosave timer every 5 seconds
    this.time.addEvent({
      delay: 5000,
      callback: this.saveProgress,
      callbackScope: this,
      loop: true
    });

    this.dialogueActive = false;
    this.game.events.emit("game-ready");

    // Save initial progress immediately on entry
    this.saveProgress();
  }

  update(time, delta) {
    if (this.dialogueActive) {
      if (this.player && this.player.sprite && this.player.sprite.body) {
        this.player.sprite.body.setVelocity(0);
        this.player.sprite.anims.stop();
      }
      return;
    }

    this.player.update(this.cursors);

    // Handle interaction with Sick Wife
    if (this.sickWifeSprite && this.player && this.player.sprite) {
      const dist = Phaser.Math.Distance.Between(
        this.player.sprite.x,
        this.player.sprite.y,
        this.sickWifeSprite.x,
        this.sickWifeSprite.y
      );

      if (dist < 55) {
        this.isNearSickWife = true;
      } else {
        if (this.isNearSickWife) {
          this.isNearSickWife = false;
        }
      }
    }

    // Handle interaction with Fragment
    if (this.currentFragment && this.currentFragment.active) {
      const dist = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, this.currentFragment.x, this.currentFragment.y);
      if (dist < 60) {
        if (this.interactionPrompt) this.interactionPrompt.show(this.currentFragment, "E", "SOLVE RIDDLE");
      } else if (!this.isNearSickWife && this.interactionPrompt) {
        this.interactionPrompt.hide();
      }
    } else if (this.isNearSickWife && this.interactionPrompt) {
      this.interactionPrompt.show(this.sickWifeSprite, "E", "Talk to Sick Wife");
    } else if (this.interactionPrompt) {
      this.interactionPrompt.hide();
    }

    // Exit trigger if player walks near the bottom door area
    if (this.player.sprite.y > 1210) {
      this.exitFamilyHouse();
    }
  }

  getRandomVariant(cacheKey, fallback) {
    const list = this.cache.json.get(cacheKey);
    if (Array.isArray(list) && list.length > 0) {
      const idx = Math.floor(Math.random() * list.length);
      return list[idx];
    }
    return fallback;
  }

  talkToSickWife() {
    this.dialogueActive = true;
    if (this.player?.sprite?.body) {
      this.player.sprite.body.setVelocity(0);
      this.player.sprite.anims.stop();
    }

    const cache = getCache() || {};
    const storyStage = cache.story_stage !== undefined ? cache.story_stage : 3;

    let clueText = "";
    if (storyStage === 3) {
      clueText = this.getRandomVariant("sick-wife-clue", "Before every voyage... Tomas never forgot something precious.");
      this.spawnFragment(this.sickWifeSprite, "Sick Wife", clueText);
    } else {
      clueText = this.getRandomVariant("sick-wife-initial", "Every afternoon when the sun sets over the waves, I still glance at the pathway...");
      this.startDialogueSequence([{ speaker: "Sick Wife", text: clueText }]);
    }
  }

  spawnFragment(npc, speaker, text) {
    if (this.currentFragment || this.currentArtifact) {
      this.startDialogueSequence([{ speaker: speaker, text: text }]);
      return;
    }
    this.startDialogueSequence([
      { speaker: speaker, text: text }
    ], () => {
      this.currentFragment = this.physics.add.sprite(npc.x, npc.y + 60, "fragment-idle");
      this.currentFragment.setScale(32/64);
      this.currentFragment.setDepth(this.currentFragment.y);
      this.currentFragment.play("fragment-idle-anim");
      
      this.startDialogueSequence([
        { speaker: "Vino", text: "A glowing memory fragment has materialized nearby! Let me inspect it." }
      ]);
    });
  }

  startFragmentChallenge(riddleData, onCorrect, onIncorrect, bgKey, sceneKey) {
    this.dialogueActive = true;
    if (this.interactionPrompt) this.interactionPrompt.hide();
    if (this.player?.sprite?.body) {
      this.player.sprite.body.setVelocity(0);
      if (this.player.sprite.anims.isPlaying) this.player.sprite.anims.stop();
    }

    const activeScene = sceneKey || 'fragment-rosary';
    const soulName = "The Faithful Soul";
    const dodgeLines = [
      "Faith will guide you through the storm...",
      "Hold onto your prayers.",
      "Do not lose hope in the dark."
    ];

    TransitionSystem.shatteredGlassTransition(this, () => {
      if (this.audioManager) this.audioManager.stopMusic();
      if (this.interactionPrompt) this.interactionPrompt.hide();
      if (this.hud) this.hud.setPauseVisible(false);
      if (this.dialogue) {
        this.dialogue.destroy();
        this.dialogue = null;
      }
      this.scene.pause();
      this.scene.launch(activeScene, {
          riddleData: riddleData,
          soulName: soulName,
          dodgeLines: dodgeLines,
          bgKey: bgKey,
          onExit: () => {
              this.dialogueActive = false;
              if (this.interactionPrompt) this.interactionPrompt.hide();
              if (this.audioManager) {
                 this.audioManager.stopMusic();
                 this.audioManager.playTrack("village-v1");
              }
              if (this.hud) this.hud.setPauseVisible(true);
              this.scene.stop(activeScene);
              this.scene.resume();
          },
          onComplete: () => {
              console.log("[FamilyHomeScene] Fragment completed.");
              this.dialogueActive = false;
              if (this.currentFragment) {
                  this.currentFragment.destroy();
                  this.currentFragment = null;
              }
              if (this.interactionPrompt) this.interactionPrompt.hide();
              if (this.audioManager) {
                 this.audioManager.stopMusic();
                 this.audioManager.playTrack("village-v1");
              }
              if (this.hud) this.hud.setPauseVisible(true);
              this.scene.stop(activeScene);
              this.scene.resume();
              if (onCorrect) onCorrect();
          },
          onDeath: () => {
              console.log("[FamilyHomeScene] Fragment failed.");
              this.dialogueActive = false;
              if (this.interactionPrompt) this.interactionPrompt.hide();
              if (this.audioManager) {
                 this.audioManager.stopMusic();
                 this.audioManager.playTrack("village-v1");
              }
              if (this.hud) this.hud.setPauseVisible(true);
              this.scene.stop(activeScene);
              this.scene.resume();
              if (onIncorrect) onIncorrect();
          }
      });
      // CRITICAL: FamilyHomeScene is higher in the scene list than the fragment scenes.
      // We MUST bring the fragment scene to the top, otherwise it will render UNDERNEATH FamilyHomeScene.
      this.scene.bringToTop(activeScene);
    });
  }

  showArtifactClaimModal(artifactKey, onContinue) {
    this.dialogueActive = true;
    displayArtifactClaimModal(artifactKey, () => {
      // Advance storyStage locally just like Grave1 does
      const cache = getCache() || {};
      const currentStage = cache.story_stage || 1;
      setCache({ ...cache, story_stage: currentStage + 1 });
      this.dialogueActive = false;
      if (onContinue) onContinue();
    }, this.audioManager);
  }

  exitFamilyHouse() {
    this.dialogueActive = true;
    if (this.player && this.player.sprite && this.player.sprite.body) {
      this.player.sprite.body.setVelocity(0);
      this.player.sprite.anims.stop();
    }

    // Restore coordinate cache to be right in front of the house in Grave1
    const cache = getCache();
    if (cache) {
      setCache({
        ...cache,
        current_area: "Grave 1",
        position_x: 3044,
        position_y: 330,
      });
    }

    import("../ui/portalLoadingScreen.js").then(({ PortalLoadingScreen }) => {
      const loadingScreen = new PortalLoadingScreen({
        title: "GRAVE I",
        subtitle: "Exiting House",
        hint: "Returning to the village paths..."
      });

      setTimeout(() => {
        import("../systems/TransitionSystem.js").then(({ TransitionSystem }) => {
          TransitionSystem.fadeToScene(this, "Grave1", { loadingScreen });
        });
      }, 250);
    });
  }

  handlePause() {
    this.saveProgress();
    this.scene.launch("PauseScene", { parentScene: this });
    this.scene.pause();
  }

  playIntroDialogue() {
    const cache = getCache();
    let shouldPlay = false;
    if (cache) {
      if (!cache.played_family_home_intro) {
        cache.played_family_home_intro = true;
        setCache(cache);
        shouldPlay = true;
      }
    } else {
      if (!window.played_family_home_intro) {
        window.played_family_home_intro = true;
        shouldPlay = true;
      }
    }

    if (shouldPlay) {
      this.startDialogueSequence([
        { speaker: "Vino", text: "This is it... the family home of Mang Tomas." },
        { speaker: "Vino", text: "It feels completely empty, but the memories of this place must still linger here." },
        { speaker: "Vino", text: "I should look around. There might be clues about his final keepsake." }
      ]);
    } else {
      this.dialogueActive = false;
    }
  }

  startDialogueSequence(dialogueSteps, onFinished = null) {
    if (!dialogueSteps || dialogueSteps.length === 0) return;

    this.currentDialogueSteps = dialogueSteps;
    this.currentStep = 0;
    this.dialogueActive = true;

    if (!this.dialogue) {
      this.dialogue = new DialogueBox(this, {
        speaker: this.currentDialogueSteps[0].speaker,
        text: this.currentDialogueSteps[0].text,
        onComplete: () => {
          this.currentStep++;
          if (this.currentStep < this.currentDialogueSteps.length) {
            const next = this.currentDialogueSteps[this.currentStep];
            this.dialogue.showText(next.speaker, next.text);
          } else {
            if (this.dialogue && typeof this.dialogue.hide === 'function') {
              this.dialogue.hide();
            }
            this.dialogueActive = false;
            if (typeof onFinished === 'function') {
              onFinished();
            }
          }
        }
      });
    } else {
      if (typeof this.dialogue.show === 'function') {
        this.dialogue.show();
      }
      this.dialogue.showText(
        this.currentDialogueSteps[0].speaker,
        this.currentDialogueSteps[0].text
      );
      this.dialogue.onComplete = () => {
        this.currentStep++;
        if (this.currentStep < this.currentDialogueSteps.length) {
          const next = this.currentDialogueSteps[this.currentStep];
          this.dialogue.showText(next.speaker, next.text);
        } else {
          if (this.dialogue && typeof this.dialogue.hide === 'function') {
            this.dialogue.hide();
          }
          this.dialogueActive = false;
          if (typeof onFinished === 'function') {
            onFinished();
          }
        }
      };
    }
  }

  async saveProgress(forceBackendSave = false) {
    if (window.isExplorationMode) return;
    const cache = getCache();
    if (!cache || !cache.player_id || cache.is_exploration_mode || cache.player_id === "explorer" || !this.player?.sprite) return;

    const state = {
      current_world: "Lunan",
      current_area: "FamilyHomeScene",
      position_x: Math.round(this.player.sprite.x),
      position_y: Math.round(this.player.sprite.y),
      has_talked_to_luma: cache.has_talked_to_luma || false,
      has_completed_tutorial: cache.has_completed_tutorial || false,
      played_post_tutorial_dialogue: cache.played_post_tutorial_dialogue || false,
      essence: cache.essence !== undefined ? cache.essence : 5,
    };

    const stateString = JSON.stringify(state);
    const hasStateChanged = this.lastSavedStateString !== stateString;

    setCache({
      ...cache,
      ...state
    });

    if (!forceBackendSave && !hasStateChanged) {
      return;
    }

    if (this.isSaving) return;
    this.isSaving = true;

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
}
