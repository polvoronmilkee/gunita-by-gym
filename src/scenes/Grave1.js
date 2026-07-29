import Phaser from "phaser";
import { CameraSystem } from "../systems/CameraSystem.js";
import { HudOverlay } from "../ui/HudOverlay.js";
import { DialogueBox } from "../ui/DialogueBox.js";
import { Player } from "../entities/Player.js";
import { InteractionPrompt } from "../ui/InteractionPrompt.js";
import { MapOverlay } from "../ui/MapOverlay.js";
import { getCache, setCache, getEssence, setEssence } from "../save.js";
import { saveGameState, loadGameState, syncOfflineData, resetPlayerRiddles } from "../utils/api.js";
import characterData from "../data/characters.json";
import { AudioManager } from "../utils/audioManager.js";
import { TransitionSystem } from "../systems/TransitionSystem.js";

export class Grave1 extends Phaser.Scene {
  constructor() {
    super("Grave1");
  }

  preload() {
    // Load the Tiled map JSON file from grave1-v2
    this.load.json("grave1-map", "src/assets/grave1-v2/gunita grave1.tmj");

    this.load.json("grave1-dialogues", "src/assets/data/dialogues/grave1/intro.json");
    this.load.json("random-guy-before", "src/assets/data/dialogues/grave1/random-guy/before-fragments.json");
    this.load.json("random-guy-completed", "src/assets/data/dialogues/grave1/random-guy/completed.json");
    this.load.json("old-fisherman-initial", "src/assets/data/dialogues/grave1/old-fisherman/initial.json");
    this.load.json("old-fisherman-clue", "src/assets/data/dialogues/grave1/old-fisherman/clue.json");
    this.load.json("young-fisherman-initial", "src/assets/data/dialogues/grave1/young-fisherman/initial.json");
    this.load.json("young-fisherman-clue", "src/assets/data/dialogues/grave1/young-fisherman/clue.json");
    this.load.json("old-wife-initial", "src/assets/data/dialogues/grave1/old-wife/initial.json");
    this.load.json("old-wife-clue", "src/assets/data/dialogues/grave1/old-wife/clue.json");
    this.load.json("young-daughter-initial", "src/assets/data/dialogues/grave1/young-daughter/initial.json");
    this.load.json("young-daughter-clue", "src/assets/data/dialogues/grave1/young-daughter/clue.json");
    this.load.json("random-woman-initial", "src/assets/data/dialogues/grave1/random-woman/initial.json");
    this.load.json("young-boy-initial", "src/assets/data/dialogues/grave1/young-boy/initial.json");
    this.load.json("school-girl-initial", "src/assets/data/dialogues/grave1/school-girl/initial.json");
    this.load.json("debt-collector-initial", "src/assets/data/dialogues/grave1/debt-collector/initial.json");
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
    this.load.json('final-riddle', 'src/assets/data/dialogues/grave-1-final-riddle/final-riddle.json');
    this.load.spritesheet('rain', 'src/assets/grave1-v2/rain.png', {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.image('rain-tile', 'src/assets/grave1-v2/rain.png');

    // Mappings for grave1-v2 tilesets
    const mappings = {
      "ground": "TilesetFloor (1).png",
      "water": "TilesetWater.png",
      "tileset_camp": "tileset_camp.png",
      "bahay-kubo": "bahay-kubo.png",
      "nature": "TilesetNature.png",
      "bridges": "Bridges.png",
      "decor1": "decor1.png",
      "decor2": "TilesetHouse.png",
      "stonepath-tileset": "Road2_ground.png",
      "decor3": "decor3.png",
      "supplies": "Supplies.png",
      "broken-houses": "broken houses.png",
      "house": "TilesetHouse.png",
      "TilesetHouse": "TilesetHouse.png"
    };

    const uniqueImages = [...new Set(Object.values(mappings))];
    uniqueImages.forEach(img => {
      this.load.image(img, `src/assets/grave1-v2/${img}`);
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
      frameWidth: 16,
      frameHeight: 16
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

  create(data) {
    // Hide and destroy portal loading screen if passed from previous scene
    if (data && data.loadingScreen) {
      setTimeout(() => {
        data.loadingScreen.hide();
        setTimeout(() => {
          data.loadingScreen.destroy();
        }, 400); // Wait for CSS transition
      }, 1000); // Wait a bit after scene is created before hiding
    }

    // Intercept Tiled map data to inline external TSX tileset metadata at runtime
    const cachedMap = this.cache.json.get("grave1-map");
    if (!cachedMap) {
      console.error("Failed to load grave1-map JSON from cache.");
      return;
    }
    const mapData = JSON.parse(JSON.stringify(cachedMap));

    const mappings = {
      "ground": "TilesetFloor (1).png",
      "water": "TilesetWater.png",
      "tileset_camp": "tileset_camp.png",
      "bahay-kubo": "bahay-kubo.png",
      "nature": "TilesetNature.png",
      "bridges": "Bridges.png",
      "decor1": "decor1.png",
      "decor2": "TilesetHouse.png",
      "stonepath-tileset": "Road2_ground.png",
      "decor3": "decor3.png",
      "supplies": "Supplies.png",
      "broken-houses": "broken houses.png"
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
      "water", "grass", "sand", "sand2", "pathway", "bridge"
    ];

    let depth = -20;
    bottomLayerNames.forEach((layerName) => {
      const layer = map.createLayer(layerName, tilesetList, 0, 0);
      if (layer) {
        layer.setDepth(depth);
        if (layerName === "water") {
          layer.setCollisionByExclusion([-1]);
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

    // Retrieve position from cache or default spawn
    const cache = getCache();
    const spawnX = (cache && cache.current_area === "Grave 1" && cache.position_x !== undefined) ? cache.position_x : 1137;
    const spawnY = (cache && cache.current_area === "Grave 1" && cache.position_y !== undefined) ? cache.position_y : 550;

    this.audioManager = new AudioManager(this, "village-v1");

    this.player = new Player(this, spawnX, spawnY, {
      onDashStart: () => this.audioManager.playDashSfx(),
    });
    this.player.sprite.setDepth(this.player.sprite.y);
    this.cursors = this.input.keyboard.createCursorKeys();

    // Camera Configuration
    CameraSystem.configureMainCamera(this, this.worldWidth, this.worldHeight);
    CameraSystem.follow(this, this.player.sprite);
    this.cameras.main.setZoom(3);

    // Build top layers (drawn above ground elements, but below player dynamic Y-depth unless roof level)
    const topLayerNames = [
      "objectslayer1", "objectslayer2", "objectslayer3",
      "objectlayer4", "familyuse", "trees", "treeslayer2"
    ];

    topLayerNames.forEach((layerName) => {
      const layer = map.createLayer(layerName, tilesetList, 0, 0);
      if (layer) {
        // Keep decorative object layers behind player (depth: -1) unless specific roof overlays
        layer.setDepth(-1);
      }
    });



    // Load static collisions from Tiled (supports both Rectangles and Polygons)
    const obstacles = this.physics.add.staticGroup();
    const collisionGroup = map.getObjectLayer("collsions") || map.getObjectLayer("collisions");
    if (collisionGroup && collisionGroup.objects) {
      collisionGroup.objects.forEach((obj) => {
        // Skip Wasteland region object (ID 509) so it doesn't create solid collision walls around the rain area
        if (obj.id === 509 || (obj.name && obj.name.toLowerCase() === "wasteland")) {
          return;
        }

        if (obj.polygon && obj.polygon.length >= 3) {
          // Process Tiled Polygons: decompose polygon edges into static rectangle colliders
          const points = obj.polygon.map(p => ({ x: obj.x + p.x, y: obj.y + p.y }));

          for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const length = Math.hypot(dx, dy);

            if (length > 0) {
              const midX = (p1.x + p2.x) / 2;
              const midY = (p1.y + p2.y) / 2;
              const thickness = 12; // Wall thickness for polygon edges

              // Create edge box zone along the polygon segment
              const width = Math.max(thickness, Math.abs(dx));
              const height = Math.max(thickness, Math.abs(dy));

              const zone = this.add.zone(midX, midY, width, height);
              this.physics.add.existing(zone, true);
              obstacles.add(zone);
            }
          }
        } else if (obj.width && obj.height) {
          // Standard Tiled Rectangles
          const x = obj.x + obj.width / 2;
          const y = obj.y + obj.height / 2;
          const zone = this.add.zone(x, y, obj.width, obj.height);
          this.physics.add.existing(zone, true);
          obstacles.add(zone);
        }
      });
    }
    this.physics.add.collider(this.player.sprite, obstacles);

    // Spawn NPCs dynamically from CHARS_SPAWNS layer in TMJ map
    this.npcs = this.physics.add.staticGroup();
    // Map TMJ character names to sprite keys
    const characterNameMap = {
      "OLD-FISHERMAN": "old-fisherman",
      "YOUNG-FISHERMAN": "young-fisherman",
      "OLD-WIFE": "old-wife",
      "OLD-DAUGHTER": "young-daughter",
      "SCHOOL-GIRL": "school-girl",
      "YOUNG-KID": "young-kid",
      "npc-RANDOM-GUY": "random-guy",
      "npc-RANDOM-WOMAN": "random-woman",
      "npc-DEBT-COLLECTOR": "debt-collector",
      "npc-SICK-WFE": "sick-wife"
    };

    // Get CHARS_SPAWNS layer from map
    const charsSpawnLayer = map.getObjectLayer("CHARS_SPAWNS");
    
    if (charsSpawnLayer && charsSpawnLayer.objects) {
      charsSpawnLayer.objects.forEach(obj => {
        // Skip polygon objects, only process point objects
        if (obj.polygon || !obj.point) {
          return;
        }

        const charName = obj.name;
        const spriteKey = characterNameMap[charName];
        
        if (spriteKey) {
          const pos = this.getNearestLandCoordinate(obj.x, obj.y, map);
          const npc = this.npcs.create(pos.x, pos.y, `npc-${spriteKey}`);
          npc.setDepth(1);
          if (npc.body) {
            npc.body.setSize(npc.width * 0.8, npc.height * 0.5);
            npc.body.setOffset(npc.width * 0.1, npc.height * 0.5);
          }

          const animKey = `npc-anim-${spriteKey}`;
          if (!this.anims.exists(animKey)) {
            this.anims.create({
              key: animKey,
              frames: this.anims.generateFrameNumbers(`npc-${spriteKey}`, { start: 0, end: 3 }),
              frameRate: 4,
              repeat: -1
            });
          }
          npc.setFrame(0); // Set to default frame (face down) instead of spinning
        } else {
          console.warn(`Unknown character name in CHARS_SPAWNS: ${charName}`);
        }
      });
    } else {
      console.warn("CHARS_SPAWNS layer not found in map");
    }

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
      onPause: () => {
        this.saveProgress();
        this.scene.launch("PauseScene", { parentScene: this });
        this.scene.pause();
      },
      onMemory: () => {
        this.scene.launch("MemoryScene", { parentScene: this });
        this.scene.pause();
      },
    });
    this.hud.setBackVisible(false);
    this.hud.setPauseVisible(true);
    this.hud.setMemoryVisible(false);

    const mapCache = getCache();
    this.exploredChunks = new Set(mapCache?.explored_chunks || []);

    this.interactionPrompt = new InteractionPrompt(this);
    syncOfflineData();

    // Keyboard bindings for pausing, memory screen, and menu exit
    this.input.keyboard.on("keydown-P", () => {
      this.saveProgress();
      this.scene.launch("PauseScene", { parentScene: this });
      this.scene.pause();
    });

    this.input.keyboard.on("keydown-ESC", () => {
      if (!this.dialogueActive) {
        this.saveProgress();
        this.scene.launch("PauseScene", { parentScene: this });
        this.scene.pause();
      }
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
      .setZoom(0.4)
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

    // --- DYNAMIC WASTELAND / RAIN SYSTEM FROM TILED MAP (ID 509 / "Wasteland") ---
    if (!this.anims.exists("rain-fall")) {
      this.anims.create({
        key: "rain-fall",
        frames: this.anims.generateFrameNumbers("rain", { start: 0, end: 23 }),
        frameRate: 16,
        repeat: -1,
      });
    }

    let wastelandObj = null;
    if (map.objects) {
      map.objects.forEach(layer => {
        if (layer.objects) {
          const found = layer.objects.find(o => o.id === 509 || (o.name && o.name.toLowerCase() === "wasteland"));
          if (found) wastelandObj = found;
        }
      });
    }

    if (!wastelandObj) {
      const objLayers = map.getObjectLayerNames ? map.getObjectLayerNames() : [];
      for (const name of objLayers) {
        const layer = map.getObjectLayer(name);
        if (layer && layer.objects) {
          const found = layer.objects.find(o => o.id === 509 || (o.name && o.name.toLowerCase() === "wasteland"));
          if (found) {
            wastelandObj = found;
            break;
          }
        }
      }
    }

    if (wastelandObj && wastelandObj.polygon && wastelandObj.polygon.length > 0) {
      const originX = wastelandObj.x;
      const originY = wastelandObj.y;
      const rainPolygonPoints = wastelandObj.polygon.map(p => ({
        x: originX + p.x,
        y: originY + p.y
      }));

      // Calculate Bounding Box
      const xs = rainPolygonPoints.map(p => p.x);
      const ys = rainPolygonPoints.map(p => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const bboxW = maxX - minX;
      const bboxH = maxY - minY;

      const rainMaskGraphics = this.make.graphics();
      rainMaskGraphics.fillStyle(0xffffff);
      rainMaskGraphics.beginPath();
      rainMaskGraphics.moveTo(rainPolygonPoints[0].x, rainPolygonPoints[0].y);
      for (let i = 1; i < rainPolygonPoints.length; i++) {
        rainMaskGraphics.lineTo(rainPolygonPoints[i].x, rainPolygonPoints[i].y);
      }
      rainMaskGraphics.closePath();
      rainMaskGraphics.fillPath();
      const rainMask = rainMaskGraphics.createGeometryMask();

      // TileSprite for falling rain layer covering dynamic bounding box
      this.rainTileSprite = this.add.tileSprite(minX, minY, bboxW, bboxH, "rain-tile");
      this.rainTileSprite.setOrigin(0, 0);
      this.rainTileSprite.setAlpha(0.65);
      this.rainTileSprite.setDepth(9999);
      this.rainTileSprite.setMask(rainMask);

      // Animated rain drop sprites placed dynamically across polygon bounds
      const rainPolyGeom = new Phaser.Geom.Polygon(rainPolygonPoints);
      this.wastelandPolyGeom = rainPolyGeom;
      this.rainSpritesGroup = this.add.group();

      for (let rx = minX + 32; rx < maxX; rx += 96) {
        for (let ry = minY + 32; ry < maxY; ry += 96) {
          if (Phaser.Geom.Polygon.Contains(rainPolyGeom, rx, ry)) {
            const s = this.add.sprite(rx, ry, "rain");
            s.setOrigin(0.5, 0.5);
            s.setAlpha(0.7);
            s.setDepth(9999);
            s.play("rain-fall");
            s.setMask(rainMask);
            this.rainSpritesGroup.add(s);
          }
        }
      }
    }

    // Periodic Thunder Lightning & Camera Shake Effects
    this.time.addEvent({
      delay: Phaser.Math.Between(7000, 14000),
      loop: true,
      callback: () => {
        if (this.wastelandPolyGeom && this.player && this.player.sprite) {
          const isInside = Phaser.Geom.Polygon.Contains(
            this.wastelandPolyGeom,
            this.player.sprite.x,
            this.player.sprite.y
          );
          if (isInside) {
            // Flash camera white for lightning effect
            this.cameras.main.flash(350, 240, 248, 255);
            // Camera shake effect
            this.cameras.main.shake(300, 0.009);
          }
        }
      }
    });

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
        this.mapOverlay.show("GRAVE I", this.player?.sprite?.x || 0, this.player?.sprite?.y || 0);
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

    // Autosave timer every 5 seconds
    this.time.addEvent({
      delay: 5000,
      callback: this.saveProgress,
      callbackScope: this,
      loop: true
    });

    // Start-up dialogue for Grave 1 (The Last Fisherman)
    const cache = getCache();
    let shouldPlayIntro = false;
    if (cache) {
      if (!cache.played_grave1_intro) {
        cache.played_grave1_intro = true;
        setCache(cache);
        shouldPlayIntro = true;
      }
    } else {
      if (!window.played_grave1_intro) {
        window.played_grave1_intro = true;
        shouldPlayIntro = true;
      }
    }

    if (shouldPlayIntro) {
      this.dialogueActive = true;
      this.startDialogueWithAI();
    } else {
      this.dialogueActive = false;
    }

    // Advance dialogue with key down events
    const handleInteract = () => {
      if (this.scene.isPaused()) return;
      if (this.dialogueActive && this.dialogue && typeof this.dialogue.onComplete === 'function') {
        this.dialogue.onComplete();
      } else if (!this.dialogueActive && this.currentFragment && Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, this.currentFragment.x, this.currentFragment.y) < 60) {
        let riddleData, artifactKey, dialogueText, sceneKey, bgKey;
        if (this.storyStage === 1) {
          riddleData = this.cache.json.get("riddle-fish-basket");
          artifactKey = "fish-basket";
          dialogueText = "Correct! The crystal shatters and takes the form of a weathered Fish Basket!";
          sceneKey = "fragment-fish-basket";
          bgKey = "bg-fish-basket";
        } else if (this.storyStage === 2) {
          riddleData = this.cache.json.get("riddle-weather-warning-flag");
          artifactKey = "weather-warning-flag";
          dialogueText = "Correct! The crystal reveals a Red Weather Warning Flag.";
          sceneKey = "fragment-red-warning-flag";
          bgKey = "red-warning-flag";
        } else if (this.storyStage === 3) {
          riddleData = this.cache.json.get("riddle-rosary");
          artifactKey = "rosary";
          dialogueText = "Correct! The crystal clears, leaving behind a delicate Rosary.";
          sceneKey = "fragment-rosary";
          bgKey = "bg-rosary-scene";
        } else if (this.storyStage === 4) {
          riddleData = this.cache.json.get("riddle-daughters-drawing");
          artifactKey = "daughters-drawing";
          dialogueText = "Correct! The crystal becomes a child's Drawing.";
          sceneKey = "fragment-daughters-drawing";
          bgKey = "bg-daughters-drawing";
        }

        const riddlesToPass = riddleData.riddles || riddleData;
        this.startFragmentChallenge(riddlesToPass, () => {
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
        }, bgKey, sceneKey);
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
            this.startFinalRiddleSequence();
          }
        });
      } else if (!this.dialogueActive && this.nearHouseDoor) {
        this.enterFamilyHouse();
      } else if (!this.dialogueActive && this.nearNpc) {
        const npc = this.closestNpc;
        const npcKey = npc.texture.key;

        // Stop spinning and face the player
        npc.anims.stop();
        const dx = this.player.x - npc.x;
        const dy = this.player.y - npc.y;
        npc.setFrame(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 1) : (dy > 0 ? 0 : 3));

        if (this.storyStage === 5) {
             const compText = this.getRandomVariant("random-guy-completed", "The sea is calm now. We remember Mang Tomas.");
             this.startDialogueSequence([{ speaker: "Villager", text: compText }]);
             return;
        }

        if (this.storyStage === 1 && npcKey === "npc-old-fisherman") {
             const clueText = this.getRandomVariant("old-fisherman-clue", "Always respect the sea, my friend. It gives, but it also takes.");
             this.spawnFragment(this.closestNpc, "Old Fisherman", clueText);
        } else if (this.storyStage === 2 && npcKey === "npc-young-fisherman") {
             const clueText = this.getRandomVariant("young-fisherman-clue", "Everyone remembers the storm... I only remember seeing something red waving near the shore.");
             this.spawnFragment(this.closestNpc, "Young Fisherman", clueText);
        } else if (this.storyStage === 3 && npcKey === "npc-old-wife") {
             const clueText = this.getRandomVariant("old-wife-clue", "Before every voyage... Tomas never forgot something precious.");
             this.spawnFragment(this.closestNpc, "Old Wife", clueText);
        } else if (this.storyStage === 4 && npcKey === "npc-young-daughter") {
             const clueText = this.getRandomVariant("young-daughter-clue", "I made Papa a drawing... but I don't remember where I left it.");
             this.spawnFragment(this.closestNpc, "Daughter", clueText);
        } else {
             let speaker = "Villager";
             let cacheKey = "random-guy-before";

             if (npcKey === "npc-old-fisherman") { speaker = "Old Fisherman"; cacheKey = "old-fisherman-initial"; }
             else if (npcKey === "npc-young-fisherman") { speaker = "Young Fisherman"; cacheKey = "young-fisherman-initial"; }
             else if (npcKey === "npc-old-wife") { speaker = "Old Wife"; cacheKey = "old-wife-initial"; }
             else if (npcKey === "npc-young-daughter") { speaker = "Daughter"; cacheKey = "young-daughter-initial"; }
             else if (npcKey === "npc-random-woman") { speaker = "Barangay Woman"; cacheKey = "random-woman-initial"; }
             else if (npcKey === "npc-random-guy") { speaker = "Villager"; cacheKey = "random-guy-before"; }
             else if (npcKey === "npc-young-kid") { speaker = "Young Boy"; cacheKey = "young-boy-initial"; }
             else if (npcKey === "npc-school-girl") { speaker = "School Girl"; cacheKey = "school-girl-initial"; }
             else if (npcKey === "npc-debt-collector") { speaker = "Debt Collector"; cacheKey = "debt-collector-initial"; }

             const flavorText = this.getRandomVariant(cacheKey, "(They are staring into the distance, lost in forgotten memories...)");
             this.startDialogueSequence([{ speaker: speaker, text: flavorText }]);
        }
      }
    };

    this.input.keyboard.on("keydown-E", handleInteract);
    this.input.keyboard.on("keydown-SPACE", handleInteract);

    this.game.events.emit("game-ready");
  }

  spawnFragment(npc, speaker, text) {
    if (this.currentFragment || this.currentArtifact) {
      this.startDialogueSequence([{ speaker: speaker, text: text }]);
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

  startFinalRiddleSequence() {
    const finalRiddleData = this.cache.json.get("final-riddle");
    if (!finalRiddleData) {
      console.error("Failed to load final-riddle.json");
      return;
    }
    this.startDialogueSequence(finalRiddleData.introDialogue, () => {
      this.askFinalRiddleQuestion(0);
    });
  }

  askFinalRiddleQuestion(index) {
    const finalRiddleData = this.cache.json.get("final-riddle");
    const questions = finalRiddleData.questions;

    if (index >= questions.length) {
      this.startDialogueSequence(finalRiddleData.correctDialogue, () => {
        this.showFinalEndingModal();
      });
      return;
    }

    const currentQ = questions[index];
    this.showRiddleUI({
      question: `Question ${index + 1} of ${questions.length}:\n\n${currentQ.question}`,
      choices: currentQ.choices,
      answer: currentQ.answer
    }, () => {
      this.startDialogueSequence([
        { speaker: "Echo", text: "Correct. The memories align further." }
      ], () => {
        this.askFinalRiddleQuestion(index + 1);
      });
    }, () => {
      this.startDialogueSequence([
        { speaker: "Echo", text: "That is incorrect. The fog grows thick... Let us reflect and try again." }
      ], () => {
        this.askFinalRiddleQuestion(index);
      });
    });
  }

  showFinalEndingModal() {
    this.dialogueActive = true;
    if (this.player && this.player.sprite && this.player.sprite.body) {
      this.player.sprite.body.setVelocity(0);
      if (this.player.sprite.anims.isPlaying) {
        this.player.sprite.anims.stop();
      }
    }

    const modalBg = document.createElement("div");
    modalBg.style.position = "absolute";
    modalBg.style.top = "0";
    modalBg.style.left = "0";
    modalBg.style.width = "100%";
    modalBg.style.height = "100%";
    modalBg.style.background = "radial-gradient(circle, rgba(20,10,35,0.95) 0%, rgba(5,5,10,0.98) 100%)";
    modalBg.style.zIndex = "2000";
    modalBg.style.display = "flex";
    modalBg.style.justifyContent = "center";
    modalBg.style.alignItems = "center";
    modalBg.style.fontFamily = "'Press Start 2P', monospace";
    modalBg.style.color = "#ffffff";
    modalBg.style.padding = "20px";
    modalBg.style.boxSizing = "border-box";

    const contentBox = document.createElement("div");
    contentBox.style.maxWidth = "600px";
    contentBox.style.background = "rgba(15, 10, 25, 0.85)";
    contentBox.style.border = "4px solid #b07eff";
    contentBox.style.borderRadius = "8px";
    contentBox.style.padding = "30px";
    contentBox.style.boxShadow = "0 0 25px rgba(176, 126, 255, 0.4)";
    contentBox.style.display = "flex";
    contentBox.style.flexDirection = "column";
    contentBox.style.alignItems = "center";
    contentBox.style.textAlign = "center";
    contentBox.style.gap = "20px";

    const trophy = document.createElement("div");
    trophy.style.fontSize = "40px";
    trophy.style.animation = "bounce 1.5s infinite alternate";
    trophy.textContent = "🏆";
    contentBox.appendChild(trophy);

    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = `
      @keyframes bounce {
        from { transform: translateY(0px); }
        to { transform: translateY(-10px); }
      }
    `;
    document.head.appendChild(styleSheet);

    const title = document.createElement("h1");
    title.style.fontSize = "16px";
    title.style.color = "#b07eff";
    title.style.textShadow = "0 0 10px rgba(176,126,255,0.8)";
    title.style.margin = "0";
    title.textContent = "CONGRATULATIONS, VINO!";
    contentBox.appendChild(title);

    const subtitle = document.createElement("h2");
    subtitle.style.fontSize = "10px";
    subtitle.style.color = "#4be3ac";
    subtitle.style.margin = "0";
    subtitle.textContent = "You have given justice to Mang Tomas' death!";
    contentBox.appendChild(subtitle);

    const message = document.createElement("p");
    message.style.fontSize = "9px";
    message.style.lineHeight = "1.8";
    message.style.color = "#dddddd";
    message.style.textAlign = "justify";
    message.style.margin = "0";
    message.innerHTML = `
      Mang Tomas was not just a fisherman; he was a husband, a father, and a man of deep faith. 
      In the face of a devastating storm, he put the safety of others before himself. 
      <br/><br/>
      His legacy teaches us the value of <strong>Bayanihan</strong> (communal unity), 
      <strong>Pakikipagkapwa-tao</strong> (shared empathy), and the enduring power of family. 
      Through your journey, you have reminded the village that the true measure of a person's life 
      is not in fame or wealth, but in the love and sacrifice they leave behind.
    `;
    contentBox.appendChild(message);

    const returnBtn = document.createElement("button");
    returnBtn.textContent = "RETURN TO MENU";
    returnBtn.style.background = "#4be3ac";
    returnBtn.style.color = "#000000";
    returnBtn.style.border = "none";
    returnBtn.style.padding = "12px 25px";
    returnBtn.style.fontSize = "10px";
    returnBtn.style.fontFamily = "'Press Start 2P', monospace";
    returnBtn.style.cursor = "pointer";
    returnBtn.style.borderRadius = "4px";
    returnBtn.style.boxShadow = "0 4px 0px #2a9b73";
    returnBtn.style.transition = "transform 0.1s";

    returnBtn.addEventListener("mouseenter", () => {
      returnBtn.style.background = "#6effcb";
    });
    returnBtn.addEventListener("mouseleave", () => {
      returnBtn.style.background = "#4be3ac";
    });
    returnBtn.addEventListener("mousedown", () => {
      returnBtn.style.transform = "translateY(2px)";
      returnBtn.style.boxShadow = "0 2px 0px #2a9b73";
    });
    returnBtn.addEventListener("mouseup", () => {
      returnBtn.style.transform = "translateY(0px)";
      returnBtn.style.boxShadow = "0 4px 0px #2a9b73";
    });

    returnBtn.addEventListener("click", async () => {
      modalBg.remove();
      this.dialogueActive = false;
      await this.saveProgress();
      window.returnToGunitaMenu?.();
    });

    contentBox.appendChild(returnBtn);
    modalBg.appendChild(contentBox);

    const container = document.getElementById("game-container") || document.body;
    container.appendChild(modalBg);
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

  getRandomVariant(cacheKey, fallback = "") {
    const data = this.cache.json.get(cacheKey);
    if (!data) return fallback;
    if (Array.isArray(data) && data.length > 0) {
      return data[Math.floor(Math.random() * data.length)];
    }
    if (data.variants && Array.isArray(data.variants) && data.variants.length > 0) {
      return data.variants[Math.floor(Math.random() * data.variants.length)];
    }
    return fallback;
  }

  async saveProgress() {
    const cache = getCache();
    if (!cache || !cache.player_id || !this.player?.sprite) return;

    const state = {
      current_world: "Lunan",
      current_area: "Grave 1",
      position_x: Math.round(this.player.sprite.x),
      position_y: Math.round(this.player.sprite.y),
      explored_chunks: Array.from(this.exploredChunks || [])
    };

    setCache({
      ...cache,
      ...state
    });

    try {
      await saveGameState(cache.player_id, state);
      syncOfflineData();
    } catch (err) {
      console.error("Autosave database sync failed:", err.message);
    }
  }

  update() {
    if (this.rainTileSprite) {
      this.rainTileSprite.tilePositionY += 12;
      this.rainTileSprite.tilePositionX -= 3;
    }

    if (this.player && this.player.sprite) {
      // Dynamic depth sorting: Vino's depth updates dynamically according to Y position so he walks in front of lower objects & behind taller objects
      this.player.sprite.setDepth(this.player.sprite.y);

      // Rain and Thunder Audio SFX triggering when player is inside the Wasteland region
      if (this.wastelandPolyGeom) {
        const inWasteland = Phaser.Geom.Polygon.Contains(
          this.wastelandPolyGeom,
          this.player.sprite.x,
          this.player.sprite.y
        );
        if (inWasteland) {
          this.audioManager?.playRainThunder();
        } else {
          this.audioManager?.stopRainThunder();
        }
      }

      const chunkX = Math.floor(this.player.sprite.x / 320);
      const chunkY = Math.floor(this.player.sprite.y / 320);
      this.exploredChunks.add(`${chunkX},${chunkY}`);
    }

    if (this.minimapCamera && this.minimapCamera.visible) {
      if (this.minimapPlayerDot && this.player && this.player.sprite) {
        this.minimapPlayerDot.clear();
        this.minimapPlayerDot.fillStyle(0x2dd4bf, 1);
        this.minimapPlayerDot.fillCircle(this.player.sprite.x, this.player.sprite.y, 18);
        this.mapOverlay?.updateLocation(this.player.sprite.x, this.player.sprite.y);
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

    let nearHouseDoor = false;
    const houseDoorX = 3044;
    const houseDoorY = 320;
    const distToHouse = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, houseDoorX, houseDoorY);
    if (distToHouse < 60) {
      nearHouseDoor = true;
    }

    this.nearNpc = nearNpc;
    this.closestNpc = closestNpc;
    this.nearFragment = nearFragment;
    this.nearArtifact = nearArtifact;
    this.nearHouseDoor = nearHouseDoor;

    if (nearFragment) {
      this.hud.setStatus("PRESS [E] OR [SPACE] TO SOLVE RIDDLE");
      if (this.interactionPrompt && this.currentFragment) {
        this.interactionPrompt.show(this.currentFragment, "E", "SOLVE RIDDLE");
      }
    } else if (nearArtifact) {
      this.hud.setStatus("PRESS [E] OR [SPACE] TO INSPECT ARTIFACT");
      if (this.interactionPrompt && this.currentArtifact) {
        this.interactionPrompt.show(this.currentArtifact, "E", "INSPECT ARTIFACT");
      }
    } else if (nearHouseDoor) {
      this.hud.setStatus("PRESS [E] OR [SPACE] TO ENTER HOUSE");
      if (this.interactionPrompt) {
        this.interactionPrompt.show({ x: houseDoorX, y: houseDoorY - 20 }, "E", "ENTER HOUSE");
      }
    } else if (nearNpc) {
      this.hud.setStatus("PRESS [E] OR [SPACE] TO TALK");
      if (this.interactionPrompt && this.closestNpc) {
        this.interactionPrompt.show(this.closestNpc, "E", "TALK");
      }
    } else {
      this.hud.setStatus("WASD / ARROWS TO MOVE   P PAUSE   M MEMORY");
      if (this.interactionPrompt) {
        this.interactionPrompt.hide();
      }
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

  startFragmentChallenge(riddleData, onCorrect, onIncorrect, bgKey, sceneKey) {
    this.dialogueActive = true;
    if (this.interactionPrompt) {
      this.interactionPrompt.hide();
    }
    if (this.player && this.player.sprite && this.player.sprite.body) {
      this.player.sprite.body.setVelocity(0);
      if (this.player.sprite.anims.isPlaying) {
        this.player.sprite.anims.stop();
      }
    }

    const activeScene = sceneKey || 'fragment-red-warning-flag';
    let soulName = "The Unknown";
    let dodgeLines = ["Survive."];

    if (activeScene === "fragment-fish-basket") {
      soulName = "The Old Fisherman";
      dodgeLines = [
        "The tides will not wait for you...",
        "Respect the deep ocean currents.",
        "Hold fast against the storm!"
      ];
    } else if (activeScene === "fragment-daughters-drawing") {
      soulName = "The Young Daughter";
      dodgeLines = [
        "Please don't forget my picture, Papa...",
        "The colors are running in the rain...",
        "Remember the bright sun we drew together!"
      ];
    } else if (activeScene === "fragment-rosary") {
      soulName = "The Faithful Soul";
      dodgeLines = [
        "Faith will guide you through the storm...",
        "Hold onto your prayers.",
        "Do not lose hope in the dark."
      ];
    } else {
      const data = characterData.fisherman || { name: "The Unknown", dodge_lines: ["Survive."] };
      soulName = data.name;
      dodgeLines = data.dodge_lines;
    }

    // Use the shattered glass transition before launching the bullet hell scene
    TransitionSystem.shatteredGlassTransition(this, () => {
      this.scene.pause();
      this.scene.launch(activeScene, {
          riddleData: riddleData,
          soulName: soulName,
          dodgeLines: dodgeLines,
          bgKey: bgKey || "bg-fish-basket",
          onComplete: () => {
              this.dialogueActive = false;
              if (this.transitionFadeBlack) {
                this.transitionFadeBlack.destroy();
                this.transitionFadeBlack = null;
              }
              this.scene.stop(activeScene);
              this.scene.resume();
              if (this.physics && typeof this.physics.resume === 'function') {
                this.physics.resume();
              }
              this.audioManager?.playTrack("village-v1");
              onCorrect();
          },
          onDeath: async () => {
              this.dialogueActive = false;
              if (this.physics && typeof this.physics.resume === 'function') {
                this.physics.resume();
              }
              this.scene.stop(activeScene);
              this.scene.resume();
              this.audioManager?.playTrack("village-v1");
              
              const cache = getCache();
              if (cache && cache.player_id) {
                  await resetPlayerRiddles(cache.player_id);
              }
              setEssence(5); // reset essence
          }
      });
    });
  }

  enterFamilyHouse() {
    this.dialogueActive = true;
    if (this.player && this.player.sprite && this.player.sprite.body) {
      this.player.sprite.body.setVelocity(0);
      this.player.sprite.anims.stop();
    }

    const cache = getCache();
    if (cache) {
      setCache({
        ...cache,
        current_area: "Grave1",
        position_x: 3044,
        position_y: 330,
      });
    }

    import("../ui/portalLoadingScreen.js").then(({ PortalLoadingScreen }) => {
      const loadingScreen = new PortalLoadingScreen({
        title: "FAMILY HOUSE",
        subtitle: "Entering Memory",
        hint: "Returning to the old home..."
      });

      setTimeout(() => {
        import("../systems/TransitionSystem.js").then(({ TransitionSystem }) => {
          TransitionSystem.fadeToScene(this, "FamilyHomeScene", { loadingScreen });
        });
      }, 250);
    });
  }
}
