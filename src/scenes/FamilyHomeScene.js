import Phaser from "phaser";
import { CameraSystem } from "../systems/CameraSystem.js";
import { HudOverlay } from "../ui/HudOverlay.js";
import { DialogueBox } from "../ui/DialogueBox.js";
import { Player } from "../entities/Player.js";
import { InteractionPrompt } from "../ui/InteractionPrompt.js";
import { getCache, setCache } from "../save.js";
import { AudioManager } from "../utils/audioManager.js";

export class FamilyHomeScene extends Phaser.Scene {
  constructor() {
    super("FamilyHomeScene");
  }

  preload() {
    const { width, height } = this.scale;

    this.loadingText = this.add.text(width / 2, height / 2 - 30, "Loading Family Home...", {
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "24px",
      color: "#ffffff",
    }).setOrigin(0.5);

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
    this.hud = new HudOverlay(this);
    this.hud.setStatus("WASD / ARROWS TO MOVE   E TO EXIT");

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
    const spawnX = 500;
    const spawnY = 1140;

    this.audioManager = new AudioManager(this, "village-v1");

    this.player = new Player(this, spawnX, spawnY, {
      onDashStart: () => this.audioManager.playDashSfx(),
    });
    this.player.sprite.setDepth(0);
    this.cursors = this.input.keyboard.createCursorKeys();

    this.physics.add.collider(this.player.sprite, this.collisionGroup);

    CameraSystem.configureMainCamera(this, this.worldWidth, this.worldHeight);
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

    this.dialogueActive = false;
    this.game.events.emit("game-ready");
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
    this.scene.pause();
    this.scene.launch("PauseScene", { parentScene: this });
  }

  playIntroDialogue() {
    this.startDialogueSequence([
      { speaker: "Vino", text: "This is it... the family home of Mang Tomas." },
      { speaker: "Vino", text: "It feels completely empty, but the memories of this place must still linger here." },
      { speaker: "Vino", text: "I should look around. There might be clues about his final keepsake." }
    ]);
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
}
