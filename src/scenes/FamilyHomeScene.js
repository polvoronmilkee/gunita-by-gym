import Phaser from "phaser";
import { CameraSystem } from "../systems/CameraSystem.js";
import { HudOverlay } from "../ui/HudOverlay.js";
import { DialogueBox } from "../ui/DialogueBox.js";
import { Player } from "../entities/Player.js";
import { InteractionPrompt } from "../ui/InteractionPrompt.js";
import { getCache, setCache } from "../save.js";
import { saveGameState, loadGameState, syncOfflineData } from "../utils/api.js";
import { AudioManager } from "../utils/audioManager.js";

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
    this.cursors = this.input.keyboard.createCursorKeys();

    this.physics.add.collider(this.player.sprite, this.collisionGroup);

    CameraSystem.configureMainCamera(this, this.worldWidth, this.worldHeight);
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    CameraSystem.follow(this, this.player.sprite);
    this.cameras.main.setZoom(3.5);

    // Escape or P opens pause menu
    this.input.keyboard.on("keydown-P", () => this.handlePause());
    this.input.keyboard.on("keydown-ESC", () => this.handlePause());



    // Advance dialogue sequence with E or SPACE
    const handleInteract = () => {
      if (this.dialogueActive && this.dialogue && typeof this.dialogue.onComplete === 'function') {
        this.dialogue.onComplete();
      }
    };
    this.input.keyboard.on("keydown-E", handleInteract);
    this.input.keyboard.on("keydown-SPACE", handleInteract);

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

    // Exit trigger if player walks near the bottom door area
    if (this.player.sprite.y > 1210) {
      this.exitFamilyHouse();
    }
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
