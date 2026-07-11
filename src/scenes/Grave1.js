import Phaser from "phaser";
import { CameraSystem } from "../systems/CameraSystem.js";
import { HudOverlay } from "../ui/HudOverlay.js";
import { DialogueBox } from "../ui/DialogueBox.js";
import { Player } from "../entities/Player.js";
import { getCache, setCache } from "../save.js";
import { saveGameState, loadGameState } from "../utils/api.js";

export class Grave1 extends Phaser.Scene {
  constructor() {
    super("Grave1");
  }

  preload() {
    // Load the Tiled map JSON file
    this.load.json("grave1-map", "src/assets/world1/gunita2.tmj");

    this.load.json("grave1-dialogues", "src/assets/data/dialogues/grave1/intro.json");
    this.load.json("random-guy-before", "src/assets/data/dialogues/grave1/random-guy/before-fragments.json");
    this.load.json("random-guy-completed", "src/assets/data/dialogues/grave1/random-guy/completed.json");
    this.load.json("old-fisherman-initial", "src/assets/data/dialogues/grave1/old-fisherman/initial.json");
    this.load.json("riddle-fish-basket", "src/assets/data/dialogues/fragments-riddles/fish-basket.json");
    this.load.json("completed-fish-basket", "src/assets/data/dialogues/fragments-completed/fish-basket.json");
    this.load.json('riddle-weather-warning-flag', 'src/assets/data/dialogues/fragments-riddles/weather-warning-flag.json');
    this.load.json('riddle-rosary', 'src/assets/data/dialogues/fragments-riddles/rosary.json');
    this.load.json('riddle-daughters-drawing', 'src/assets/data/dialogues/fragments-riddles/daughters-drawing.json');
    this.load.json('completed-weather-warning-flag', 'src/assets/data/dialogues/fragments-completed/weather-warning-flag.json');
    this.load.json('completed-rosary', 'src/assets/data/dialogues/fragments-completed/rosary.json');
    this.load.json('completed-daughters-drawing', 'src/assets/data/dialogues/fragments-completed/daughters-drawing.json');
    this.load.image('weather-warning-flag', 'src/assets/grave1-elements/fragments-uncovered/weather-flag-warning.png');
    this.load.image('rosary', 'src/assets/grave1-elements/fragments-uncovered/rosary.png');
    this.load.image('daughters-drawing', 'src/assets/grave1-elements/fragments-uncovered/daughters-drawing.png');


    // Load individual standalone ground tiles to preserve original tileset sizes
    const mappings = {
      "water": "watertile.png",
      "grass": "grasstile.png",
      "grasstile": "grasstile.png",
      "ston": "stone_tile.png",
      "stone": "stone_tile.png",
      "grasstile1": "grasstile.png",
      "grasspathways": "grasspath.png",
      "sand": "sandtile.png",
      "familyhouse": "family house.png",
      "bridge": "bridge 1.png",
      "shoreline house2": "house 2.png",
      "shoreline house3": "house 3.png",
      "signage": "signage.png",
      "stall1": "stall1.png",
      "stall2": "stall2.png",
      "stall4": "stall4.png",
      "satll3": "stall3.png",
      "stone1": "stone1.png",
      "stone2": "stone2.png",
      "well": "well.png",
      "shoreline house1": "house 1.png",
      "barrel": "barrel.png",
      "box": "box.png",
      "lighthouse": "lighthouse.png",
      "dock": "dock1.png",
      "boat1": "boat1.png",
      "net": "fishnet.png",
      "stone3": "stone3.png",
      "tree1": "tree1.png",
      "stonepath": "stone_tile.png",
      "tree2": "tree2.png",
      "ropefence": "ropefence.png",
      "stall5": "stall5.png",
      "stall6": "stall6.png",
      "frontfence": "fence.png",
      "sidefence": "fence2.png",
      "table": "table.png",
      "crop": "crop.png",
      "fountain": "fountain.png",
      "mailbox": "mailbox.png",
      "shoreline house 4": "house 4.png",
      "shoreline house 5": "house 5.png",
      "windmill": "windmill.png",
      "crop1": "crop.png",
      "crop3": "crop3.png",
      "bush": "bush.png",
      "bh1": "broken house1.png",
      "broken dock": "broken dock.png",
      "btree1": "btree1.png",
      "btree2": "btree2.png",
      "bh2": "broken house2.png",
      "bh3": "broken house3.png",
      "bh4": "broken house4.png",
      "shipwreck": "shipwreck.png"
    };

    const uniqueImages = [...new Set(Object.values(mappings))];
    uniqueImages.forEach(img => {
      this.load.image(img, `src/assets/world1/${img}`);
    });

    const npcImages = [
      { key: "debt-collector", file: "debt-collector.png", fw: 32, fh: 42 },
      { key: "old-fisherman", file: "old-fisherman.png", fw: 32, fh: 42 },
      { key: "old-wife", file: "old-wife.png", fw: 32, fh: 42 },
      { key: "random-guy", file: "random-guy.png", fw: 32, fh: 42 },
      { key: "random-woman", file: "random-woman.png", fw: 32, fh: 42 },
      { key: "school-girl", file: "school-girl.png", fw: 32, fh: 42 },
      { key: "sick-wife", file: "sick-wife.png", fw: 32, fh: 42 },
      { key: "young-daughter", file: "old-daughter.png", fw: 32, fh: 42 },
      { key: "young-fisherman", file: "young-fisherman.png", fw: 32, fh: 42 },
      { key: "young-kid", file: "young-kid.png", fw: 32, fh: 42 }
    ];
    npcImages.forEach(npc => {
      this.load.spritesheet(`npc-${npc.key}`, `src/assets/grave1-elements/characters/${npc.file}`, {
        frameWidth: npc.fw, frameHeight: npc.fh
      });
    });
    this.load.spritesheet("fragment-main", "src/assets/grave1-elements/fragment-main.png", {
      frameWidth: 32,
      frameHeight: 32
    });
    this.load.image("fish-basket", "src/assets/grave1-elements/fragments-uncovered/fish-basket.png");

    // Load player animations sheets
    this.load.spritesheet(
      "vino-idle",
      "src/assets/vino-spritesheets/vino-idle/vino-idle.png",
      {
        frameWidth: 208,
        frameHeight: 237,
      },
    );

    this.load.spritesheet(
      "vino-moving-up",
      "src/assets/vino-spritesheets/vino-moving-up.png",
      {
        frameWidth: 208,
        frameHeight: 237,
      },
    );

    this.load.spritesheet(
      "vino-moving-left",
      "src/assets/vino-spritesheets/vino-moving-left.png",
      {
        frameWidth: 208,
        frameHeight: 237,
      },
    );

    this.load.spritesheet(
      "vino-moving-right",
      "src/assets/vino-spritesheets/vino-moving-right.png",
      {
        frameWidth: 208,
        frameHeight: 237,
      },
    );

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
    // Intercept Tiled map data to inline external TSX tileset metadata at runtime
    const cachedMap = this.cache.json.get("grave1-map");
    if (!cachedMap) {
      console.error("Failed to load grave1-map JSON from cache.");
      return;
    }
    const mapData = JSON.parse(JSON.stringify(cachedMap));

    const mappings = {
      "water": "watertile.png",
      "grass": "grasstile.png",
      "grasstile": "grasstile.png",
      "ston": "stone_tile.png",
      "stone": "stone_tile.png",
      "grasstile1": "grasstile.png",
      "grasspathways": "grasspath.png",
      "sand": "sandtile.png",
      "familyhouse": "family house.png",
      "bridge": "bridge 1.png",
      "shoreline house2": "house 2.png",
      "shoreline house3": "house 3.png",
      "signage": "signage.png",
      "stall1": "stall1.png",
      "stall2": "stall2.png",
      "stall4": "stall4.png",
      "satll3": "stall3.png",
      "stone1": "stone1.png",
      "stone2": "stone2.png",
      "well": "well.png",
      "shoreline house1": "house 1.png",
      "barrel": "barrel.png",
      "box": "box.png",
      "lighthouse": "lighthouse.png",
      "dock": "dock1.png",
      "boat1": "boat1.png",
      "net": "fishnet.png",
      "stone3": "stone3.png",
      "tree1": "tree1.png",
      "stonepath": "stone_tile.png",
      "tree2": "tree2.png",
      "ropefence": "ropefence.png",
      "stall5": "stall5.png",
      "stall6": "stall6.png",
      "frontfence": "fence.png",
      "sidefence": "fence2.png",
      "table": "table.png",
      "crop": "crop.png",
      "fountain": "fountain.png",
      "mailbox": "mailbox.png",
      "shoreline house 4": "house 4.png",
      "shoreline house 5": "house 5.png",
      "windmill": "windmill.png",
      "crop1": "crop.png",
      "crop3": "crop3.png",
      "bush": "bush.png",
      "bh1": "broken house1.png",
      "broken dock": "broken dock.png",
      "btree1": "btree1.png",
      "btree2": "btree2.png",
      "bh2": "broken house2.png",
      "bh3": "broken house3.png",
      "bh4": "broken house4.png",
      "shipwreck": "shipwreck.png"
    };

    mapData.tilesets = mapData.tilesets.map((ts, index) => {
      let name = ts.name || "";
      if (ts.source) {
        name = ts.source.substring(ts.source.lastIndexOf("/") + 1).replace(".tsx", "");
      }
      const frameName = mappings[name] || (name + ".png");

      const texture = this.textures.get(frameName);
      let imgW = 32, imgH = 32;
      if (texture && texture.key !== "__MISSING") {
        imgW = texture.source[0].width;
        imgH = texture.source[0].height;
      }

      // Tiled drops remainder pixels (e.g. 68x68 -> 64x64 grid of 32x32 tiles)
      const tileWidth = 32;
      const tileHeight = 32;
      let columns = Math.max(1, Math.floor(imgW / tileWidth));
      let tilecount = columns * Math.max(1, Math.floor(imgH / tileHeight));

      // Calculate the maximum number of tiles allocated to this tileset in the map
      const nextTs = mapData.tilesets[index + 1];
      const maxTiles = nextTs ? nextTs.firstgid - ts.firstgid : tilecount;

      // Expand columns/rows if the physical image is smaller than the GID range allocated.
      let finalFrameName = frameName;
      if (tilecount < maxTiles) {
         tilecount = maxTiles;
         columns = Math.max(1, Math.ceil(Math.sqrt(tilecount)));
         const rows = Math.ceil(tilecount / columns);
         imgW = columns * tileWidth;
         imgH = rows * tileHeight;
         
         finalFrameName = frameName + "_expanded";
         if (!this.textures.exists(finalFrameName) && texture && texture.key !== "__MISSING") {
           const canvas = this.textures.createCanvas(finalFrameName, imgW, imgH);
           if (canvas) {
             const sourceImage = texture.source[0].image;
             const origW = texture.source[0].width;
             const origH = texture.source[0].height;
             // Repeat the original image across the entire new grid
             for (let y = 0; y < rows; y++) {
               for (let x = 0; x < columns; x++) {
                 canvas.context.drawImage(sourceImage, 0, 0, origW, origH, x * tileWidth, y * tileHeight, origW, origH);
               }
             }
             canvas.refresh();
           }
         }
      } else if (tilecount > maxTiles) {
         tilecount = maxTiles;
         columns = Math.min(columns, tilecount);
      }

      const newTs = {
        ...ts,
        firstgid: ts.firstgid,
        name: name,
        image: finalFrameName,
        imagewidth: imgW,
        imageheight: imgH,
        tilewidth: tileWidth,
        tileheight: tileHeight,
        tilecount: tilecount,
        columns: columns,
        margin: 0,
        spacing: 0
      };
      delete newTs.source;
      return newTs;
    });

    // Inject the modified map data back into Phaser's tilemap cache
    this.cache.tilemap.add("grave1-map-modified", {
      format: Phaser.Tilemaps.Formats ? Phaser.Tilemaps.Formats.TILED_JSON : 1,
      data: mapData
    });

    // Create the Tilemap from the correctly cached Tiled JSON
    const map = this.make.tilemap({ key: "grave1-map-modified" });

    // Map tilesets names to loaded textures
    const tilesetList = [];
    mapData.tilesets.forEach((ts) => {
      const addedTileset = map.addTilesetImage(ts.name, ts.image);
      if (addedTileset) {
        tilesetList.push(addedTileset);
      }
    });

    // Build bottom layers (drawn below the player)
    const bottomLayerNames = [
      "water", "grass", "stone", "sand", "pathway",
      "object_bot_overlay_1", "object_bot_overlay_2", "object_bot_overlay_3", "object_bot_overlay_4",
      "bridge"
    ];

    let depth = -20;
    bottomLayerNames.forEach((layerName) => {
      const layer = map.createLayer(layerName, tilesetList, 0, 0);
      if (layer) {
        layer.setDepth(depth);
        // Automatically set collision for the water layer
        if (layerName === "water") {
          layer.setCollisionByExclusion([-1]);
          // Wait, player isn't created yet at this point! We'll just set the property, 
          // and add the collider AFTER the player is created.
        }
        depth++;
      }
    });

    // Spawn player
    this.worldWidth = map.widthInPixels;
    this.worldHeight = map.heightInPixels;

    // Create Animations
    const animConfig = {
      "vino-idle": { start: 0, end: 4 },
      "vino-moving-up": { start: 0, end: 2 },
      "vino-moving-left": { start: 0, end: 2 },
      "vino-moving-right": { start: 0, end: 2 },
      "vino-moving-down": { start: 0, end: 2 }
    };

    Object.entries(animConfig).forEach(([key, config]) => {
      if (!this.anims.exists(key)) {
        this.anims.create({
          key: key,
          frames: this.anims.generateFrameNumbers(key, { start: config.start, end: config.end }),
          frameRate: 5,
          repeat: -1
        });
      }
    });

    if (!this.anims.exists("fragment-anim")) {
      this.anims.create({
        key: "fragment-anim",
        frames: this.anims.generateFrameNumbers("fragment-main"),
        frameRate: 6,
        repeat: -1
      });
    }

    // Retrieve position from cache
    const cache = getCache();
    const spawnX = (cache && cache.current_area === "Grave 1" && cache.position_x !== undefined) ? cache.position_x : 300;
    const spawnY = (cache && cache.current_area === "Grave 1" && cache.position_y !== undefined) ? cache.position_y : 600;

    this.player = new Player(this, spawnX, spawnY);
    this.player.sprite.setDepth(0);
    this.cursors = this.input.keyboard.createCursorKeys();

    // Camera Configuration
    CameraSystem.configureMainCamera(this, this.worldWidth, this.worldHeight);
    CameraSystem.follow(this, this.player.sprite);
    this.cameras.main.setZoom(4);

    // Build top layers (drawn above the player)
    const topLayerNames = [
      "object_top _overlay_1", "obejct_top_overlay_2", "object_top_overlay_3", 
      "object_top_overlay_4", "object_top_overlay_5", "object_top_overlay_6", 
      "buildings", "object_top_overlay_7"
    ];

    let topDepth = 1;
    topLayerNames.forEach((layerName) => {
      const layer = map.createLayer(layerName, tilesetList, 0, 0);
      if (layer) {
        layer.setDepth(topDepth);
        // Automatically set collision for all placed tiles in these top layers
        layer.setCollisionByExclusion([-1]);
        this.physics.add.collider(this.player.sprite, layer);
        topDepth++;
      }
    });

    // Add collider for the water layer created earlier
    const waterLayerData = map.getLayer("water");
    if (waterLayerData && waterLayerData.tilemapLayer) {
        this.physics.add.collider(this.player.sprite, waterLayerData.tilemapLayer);
    }

    // Load static collisions from Tiled
    const obstacles = this.physics.add.staticGroup();
    const collisionGroup = map.getObjectLayer("collisions");
    if (collisionGroup && collisionGroup.objects) {
      collisionGroup.objects.forEach((obj) => {
        const x = obj.x + obj.width / 2;
        const y = obj.y + obj.height / 2;
        const zone = this.add.zone(x, y, obj.width, obj.height);
        this.physics.add.existing(zone, true);
        obstacles.add(zone);
      });
    }
    this.physics.add.collider(this.player.sprite, obstacles);

    // Spawn NPCs at designated land coordinates
    this.npcs = this.physics.add.staticGroup();
    const npcPlacements = [
      { key: "debt-collector", x: 500, y: 400 },
      { key: "old-fisherman", x: 820, y: 880 },
      { key: "old-wife", x: 300, y: 480 },
      { key: "random-guy", x: 1100, y: 600 },
      { key: "random-woman", x: 1150, y: 620 },
      { key: "school-girl", x: 950, y: 520 },
      { key: "sick-wife", x: 420, y: 460 },
      { key: "young-daughter", x: 330, y: 490 },
      { key: "young-fisherman", x: 860, y: 1000 },
      { key: "young-kid", x: 980, y: 530 }
    ];

    npcPlacements.forEach(placement => {
      const pos = this.getNearestLandCoordinate(placement.x, placement.y, map);
      const npc = this.npcs.create(pos.x, pos.y, `npc-${placement.key}`);
      npc.setDepth(1);
      if (npc.body) {
        npc.body.setSize(npc.width * 0.8, npc.height * 0.5);
        npc.body.setOffset(npc.width * 0.1, npc.height * 0.5);
      }

      const animKey = `npc-anim-${placement.key}`;
      if (!this.anims.exists(animKey)) {
        this.anims.create({
          key: animKey,
          frames: this.anims.generateFrameNumbers(`npc-${placement.key}`, { start: 0, end: 3 }),
          frameRate: 4,
          repeat: -1
        });
      }
      npc.anims.play(animKey, true);
    });

    this.physics.add.collider(this.player.sprite, this.npcs);
        this.storyStage = 1;
    this.currentFragment = null;
    this.currentArtifactKey = null;
    this.currentArtifact = null;
    this.map = map;

    // Sync database position if available
    if (cache && cache.player_id) {
      loadGameState(cache.player_id)
        .then(serverState => {
          if (serverState && serverState.current_area === "Grave 1" && (serverState.position_x !== cache.position_x || serverState.position_y !== cache.position_y)) {
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

    // Set up HUD
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

    // Keyboard bindings for pausing, memory screen, and menu exit
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

    // Autosave timer every 5 seconds
    this.time.addEvent({
      delay: 5000,
      callback: this.saveProgress,
      callbackScope: this,
      loop: true
    });

    // Start-up dialogue for Grave 1 (The Last Fisherman)
    this.dialogueActive = true;
    this.startDialogueWithAI();

    // Advance dialogue with key down events
    const handleInteract = () => {
      if (this.dialogueActive && this.dialogue && typeof this.dialogue.onComplete === 'function') {
        this.dialogue.onComplete();
      } else if (!this.dialogueActive && this.currentFragment && Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, this.currentFragment.x, this.currentFragment.y) < 60) {
        let riddleData, artifactKey, dialogueText;
        if (this.storyStage === 1) {
            riddleData = this.cache.json.get("riddle-fish-basket");
            artifactKey = "fish-basket";
            dialogueText = "Correct! The crystal shatters and takes the form of a weathered Fish Basket!";
        } else if (this.storyStage === 2) {
            riddleData = this.cache.json.get("riddle-weather-warning-flag");
            artifactKey = "weather-warning-flag";
            dialogueText = "Correct! The crystal reveals a Red Weather Warning Flag.";
        } else if (this.storyStage === 3) {
            riddleData = this.cache.json.get("riddle-rosary");
            artifactKey = "rosary";
            dialogueText = "Correct! The crystal clears, leaving behind a delicate Rosary.";
        } else if (this.storyStage === 4) {
            riddleData = this.cache.json.get("riddle-daughters-drawing");
            artifactKey = "daughters-drawing";
            dialogueText = "Correct! The crystal becomes a child's Drawing.";
        }
        
        const randomRiddle = riddleData.riddles[Math.floor(Math.random() * riddleData.riddles.length)];
        this.showRiddleUI(randomRiddle, () => {
            const fragmentX = this.currentFragment.x;
            const fragmentY = this.currentFragment.y;
            this.currentFragment.destroy();
            this.currentFragment = null;

            this.currentArtifact = this.physics.add.sprite(fragmentX, fragmentY, artifactKey);
            this.currentArtifact.setDepth(1);
            this.currentArtifactKey = artifactKey;

            this.startDialogueSequence([{ speaker: "Vino", text: dialogueText }]);
        }, () => {
            this.startDialogueSequence([{ speaker: "Vino", text: "That answer doesn't seem right... I should try again." }]);
        });
      } else if (!this.dialogueActive && this.currentArtifact && Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, this.currentArtifact.x, this.currentArtifact.y) < 60) {
        let completedData = this.cache.json.get(`completed-${this.currentArtifactKey}`);
        const interactions = completedData.interactions;
        const randomInteraction = interactions[Math.floor(Math.random() * interactions.length)];
        const steps = randomInteraction.dialogues.map(text => ({ speaker: randomInteraction.speaker, text: text }));
        
        this.startDialogueSequence(steps, () => {
            this.currentArtifact.destroy();
            this.currentArtifact = null;
            this.currentArtifactKey = null;
            this.storyStage++;
            if (this.storyStage === 5) {
                this.startDialogueSequence([
                  { speaker: "Vino", text: "The fog seems to be lifting... All the memories are restored." },
                  { speaker: "Mang Tomas", text: "Thank you... for remembering me." }
                ]);
            }
        });
      } else if (!this.dialogueActive && this.nearNpc) {
          const npcKey = this.closestNpc.texture.key;
          if (this.storyStage === 5) {
               this.startDialogueSequence([{ speaker: "Villager", text: "The sea is calm now. We remember." }]);
               return;
          }

          if (this.storyStage === 1 && npcKey === "npc-old-fisherman") {
               this.spawnFragment(this.closestNpc, "Old Fisherman", "Always respect the sea, my friend. It gives, but it also takes. Sometimes, it leaves behind a fragment of what it took.");
          } else if (this.storyStage === 2 && npcKey === "npc-young-fisherman") {
               this.spawnFragment(this.closestNpc, "Young Fisherman", "Everyone remembers the storm... I only remember seeing something red waving near the shore.");
          } else if (this.storyStage === 3 && npcKey === "npc-old-wife") {
               this.spawnFragment(this.closestNpc, "Old Wife", "Before every voyage... Tomas never forgot something precious. I just can't remember what it was.");
          } else if (this.storyStage === 4 && npcKey === "npc-young-daughter") {
               this.spawnFragment(this.closestNpc, "Daughter", "I made Papa a drawing... but I don't remember where I left it.");
          } else {
               let flavor = "(They are staring into the distance, lost in forgotten memories...)";
               if (npcKey === "npc-random-woman") flavor = "Drying fish takes time. The sea feeds us all, you know.";
               if (npcKey === "npc-young-kid") flavor = "Mang Tomas had a really big boat! I want one too.";
               if (npcKey === "npc-debt-collector") flavor = "Where's my money? People always disappear when they owe you.";
               this.startDialogueSequence([{ speaker: "Villager", text: flavor }]);
          }
      }
    };
    
    this.input.keyboard.on("keydown-E", handleInteract);
    this.input.keyboard.on("keydown-SPACE", handleInteract);

    this.game.events.emit("game-ready");
  }

  spawnFragment(npc, speaker, text) {
      if (this.currentFragment || this.currentArtifact) {
           this.startDialogueSequence([ { speaker: speaker, text: text } ]);
           return;
      }
      this.startDialogueSequence([
          { speaker: speaker, text: text }
      ], () => {
          const fragmentPos = this.getNearestLandCoordinate(npc.x + 50, npc.y + 50, this.map);
          this.currentFragment = this.physics.add.sprite(fragmentPos.x, fragmentPos.y, "fragment-main");
          this.currentFragment.setDepth(1);
          this.currentFragment.play("fragment-anim");
          this.startDialogueSequence([
              { speaker: "Vino", text: "A glowing memory fragment has materialized nearby! Let me inspect it." }
          ]);
      });
  }

  generateAIDialogues() {
    console.log("[AI] Attempting to generate dialogues...");
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error("AI generation timed out or failed."));
      }, 500); 
    });
  }

  async startDialogueWithAI() {
    try {
      await this.generateAIDialogues();
    } catch (error) {
      console.log("[AI] Failed to generate dialogue:", error.message);
      this.startDialogueFromJSON();
    }
  }

  startDialogueFromJSON() {
    console.log("[JSON] Attempting to load JSON fallback dialogue...");
    const cachedDialogues = this.cache.json.get("grave1-dialogues");
    
    if (!cachedDialogues || !cachedDialogues.dialogues) {
      console.log("[Fallback] JSON missing or invalid. Using hardcoded dialogues.");
      this.startDialogueSequence(this.getHardcodedDialogues());
      return;
    }

    console.log("[JSON] Successfully loaded JSON dialogue. Selecting random variants.");
    const sequence = cachedDialogues.dialogues.map(item => {
      const variants = item.variants || ["..."];
      const randomVariant = variants[Math.floor(Math.random() * variants.length)];
      return { speaker: item.speaker, text: randomVariant };
    });

    this.startDialogueSequence(sequence);
  }

  getHardcodedDialogues() {
    return [
      { speaker: "Vino", text: "I can smell the sea salt... and feel a chilling breeze. We have entered the forgotten memory world." },
      { speaker: "???", text: "This is Mang Tomas' memory, Vino. A world frozen in time. The black fog of oblivion covers the paths." },
      { speaker: "Vino", text: "I must look for clues and talk to the villagers to reconstruct the truth." }
    ];
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
      this.dialogue.showText(this.currentDialogueSteps[0].speaker, this.currentDialogueSteps[0].text);
    }
  }

  async saveProgress() {
    const cache = getCache();
    if (!cache || !cache.player_id || !this.player?.sprite) return;

    const state = {
      current_world: "Lunan",
      current_area: "Grave 1",
      position_x: Math.round(this.player.sprite.x),
      position_y: Math.round(this.player.sprite.y)
    };

    setCache({
      ...cache,
      ...state
    });

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

    let nearNpc = false;
    let closestNpc = null;
    let minDist = 60;

    if (this.npcs) {
      this.npcs.getChildren().forEach(npc => {
        const dist = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, npc.x, npc.y);
        if (dist < minDist) {
          minDist = dist;
          closestNpc = npc;
          nearNpc = true;
        }
      });
    }

    let nearFragment = false;
    if (this.currentFragment && this.currentFragment.active) {
      const dist = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, this.currentFragment.x, this.currentFragment.y);
      if (dist < 60) {
        nearFragment = true;
      }
    }

    let nearArtifact = false;
    if (this.currentArtifact && this.currentArtifact.active) {
      const dist = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, this.currentArtifact.x, this.currentArtifact.y);
      if (dist < 60) {
        nearArtifact = true;
      }
    }

    this.nearNpc = nearNpc;
    this.closestNpc = closestNpc;
    this.nearFragment = nearFragment;
    this.nearArtifact = nearArtifact;

    if (nearFragment) {
      this.hud.setStatus("PRESS [E] OR [SPACE] TO SOLVE RIDDLE");
    } else if (nearArtifact) {
      this.hud.setStatus("PRESS [E] OR [SPACE] TO INSPECT ARTIFACT");
    } else if (nearNpc) {
      this.hud.setStatus("PRESS [E] OR [SPACE] TO TALK");
    } else {
      this.hud.setStatus("WASD / ARROWS TO MOVE   P PAUSE   M MEMORY");
    }

        this.player.update(this.cursors);
  }

  getNearestLandCoordinate(startX, startY, map) {
    let tileX = Math.floor(startX / 32);
    let tileY = Math.floor(startY / 32);

    for (let r = 0; r < 10; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          let checkX = tileX + dx;
          let checkY = tileY + dy;
          if (checkX >= 0 && checkX < map.width && checkY >= 0 && checkY < map.height) {
            const waterTile = map.getTileAt(checkX, checkY, true, "water");
            if (!waterTile || waterTile.index === -1) {
              return { x: checkX * 32 + 16, y: checkY * 32 + 16 };
            }
          }
        }
      }
    }
    return { x: startX, y: startY };
  }

  showRiddleUI(riddleData, onCorrect, onIncorrect) {
    this.dialogueActive = true;
    if (this.player && this.player.sprite && this.player.sprite.body) {
      this.player.sprite.body.setVelocity(0);
      if (this.player.sprite.anims.isPlaying) {
        this.player.sprite.anims.stop();
      }
    }

    // Modal Background Overlay
    const modalBg = document.createElement("div");
    modalBg.style.position = "absolute";
    modalBg.style.top = "0";
    modalBg.style.left = "0";
    modalBg.style.width = "100%";
    modalBg.style.height = "100%";
    modalBg.style.background = "rgba(0,0,0,0.7)";
    modalBg.style.zIndex = "1002";
    modalBg.style.display = "flex";
    modalBg.style.justifyContent = "center";
    modalBg.style.alignItems = "center";

    // Dialog structure similar to DialogueBox but centered and larger
    const overlay = document.createElement("div");
    overlay.className = "gunita-dialogue";
    overlay.style.position = "relative";
    overlay.style.bottom = "auto";
    overlay.style.left = "auto";
    overlay.style.transform = "none";
    overlay.style.width = "min(90vw, 550px)";
    overlay.style.display = "flex";
    overlay.style.flexDirection = "column";

    const inner = document.createElement("div");
    inner.className = "gunita-dialogue__inner";
    inner.style.display = "flex";
    inner.style.flexDirection = "column";
    inner.style.gap = "20px";
    inner.style.padding = "20px";

    const title = document.createElement("div");
    title.className = "gunita-dialogue__name";
    title.textContent = "Memory Riddle";
    inner.appendChild(title);

    const question = document.createElement("div");
    question.className = "gunita-dialogue__message";
    question.style.fontSize = "12px";
    question.style.lineHeight = "1.8";
    question.textContent = riddleData.question;
    inner.appendChild(question);

    const choicesContainer = document.createElement("div");
    choicesContainer.style.display = "grid";
    choicesContainer.style.gridTemplateColumns = "1fr";
    choicesContainer.style.gap = "10px";
    choicesContainer.style.marginTop = "10px";

    riddleData.choices.forEach(choice => {
      const btn = document.createElement("button");
      btn.textContent = choice;
      btn.style.background = "#000000";
      btn.style.color = "#ffffff";
      btn.style.border = "3px solid #ffffff";
      btn.style.padding = "10px";
      btn.style.fontFamily = "'Press Start 2P', monospace";
      btn.style.fontSize = "9px";
      btn.style.cursor = "pointer";
      btn.style.boxSizing = "border-box";
      btn.style.textTransform = "uppercase";
      btn.style.textAlign = "left";
      btn.style.transition = "all 0.1s ease";

      btn.addEventListener("mouseenter", () => {
        btn.style.background = "#b07eff"; // Purple glow
        btn.style.color = "#000000";
        btn.style.borderColor = "#b07eff";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.background = "#000000";
        btn.style.color = "#ffffff";
        btn.style.borderColor = "#ffffff";
      });

      btn.addEventListener("click", () => {
        modalBg.remove();
        this.dialogueActive = false;
        if (choice === riddleData.answer) {
          onCorrect();
        } else {
          onIncorrect();
        }
      });
      choicesContainer.appendChild(btn);
    });

    inner.appendChild(choicesContainer);
    overlay.appendChild(inner);
    modalBg.appendChild(overlay);

    const container = document.getElementById("game-container") || document.body;
    container.appendChild(modalBg);
  }
}
