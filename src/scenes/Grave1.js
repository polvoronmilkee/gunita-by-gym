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
        topDepth++;
      }
    });

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

    // Start-up dialogue
    const dialogues = [
      { speaker: "Vino", text: "This... this is a graveyard. It feels cold and heavy here." },
      { speaker: "???", text: "The grave of memories holds the key to the past..." },
      { speaker: "Vino", text: "Whose grave is this? Let me look around." }
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
    this.player.update(this.cursors);
  }
}
