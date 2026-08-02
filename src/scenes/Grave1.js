import Phaser from "phaser";
import { CameraSystem } from "../systems/CameraSystem.js";
import { HudOverlay } from "../ui/HudOverlay.js";
import { DialogueBox } from "../ui/DialogueBox.js";
import { Player } from "../entities/Player.js";
import { InteractionPrompt } from "../ui/InteractionPrompt.js";
import { MapOverlay } from "../ui/MapOverlay.js";
import { getCache, setCache, getEssence, setEssence } from "../save.js";
import { saveGameState, loadGameState, syncOfflineData, resetPlayerRiddles, addInventoryItem, loadPlayerInventory } from "../utils/api.js";
import characterData from "../data/characters.json";
import { AudioManager } from "../utils/audioManager.js";
import { TransitionSystem } from "../systems/TransitionSystem.js";
import { LumaGuidanceBox } from "../ui/LumaGuidanceBox.js";
import { showArtifactClaimModal as displayArtifactClaimModal } from "../ui/ArtifactClaimModal.js";
import { connectAndUnlock } from "../utils/portalApi.js";
import { investigationPhases } from "../data/investigationData.js";

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
    this.load.json("sick-wife-initial", "src/assets/data/dialogues/grave1/old-wife/initial.json");
    this.load.json("sick-wife-clue", "src/assets/data/dialogues/grave1/old-wife/clue.json");
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
    this.load.image('fish-basket', 'src/assets/grave1-elements/fragments-uncovered/fish-basket.png');
    this.load.image('weather-warning-flag', 'src/assets/grave1-elements/fragments-uncovered/weather-flag-warning.png');
    this.load.image('rosary', 'src/assets/grave1-elements/fragments-uncovered/rosary.png');
    this.load.image('daughters-drawing', 'src/assets/grave1-elements/fragments-uncovered/daughters-drawing.png');
    this.load.json('final-riddle', 'src/assets/data/dialogues/grave-1-final-riddle/final-riddle.json');
    this.load.spritesheet('rain', 'src/assets/grave1-v2/rain-new-sprite.png', {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.image('rain-tile', 'src/assets/grave1-v2/rain-new-sprite.png');

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
    const newNpcList = [
      { key: "man-mowing", file: "man-mowing.png", fw: 40, fh: 43 },
      { key: "man-searching", file: "man-searching.png", fw: 40, fh: 43 },
      { key: "man-talking", file: "man-talking.png", fw: 40, fh: 43 },
      { key: "mang-tomas", file: "mang-tomas.png", fw: 40, fh: 43 },
      { key: "sick-wife", file: "sick-wife.png", fw: 40, fh: 43 },
      { key: "woman-picking-flowers", file: "woman-picking-flowers.png", fw: 40, fh: 43 },
      { key: "woman-searching", file: "woman-searching.png", fw: 40, fh: 43 },
      { key: "woman-thinking", file: "woman-thinking.png", fw: 40, fh: 43 },
      { key: "woman-with-broom", file: "woman-with-broom.png", fw: 40, fh: 43 },
      { key: "boy-jumping-front", file: "boy-jumping-front.png", fw: 35, fh: 36 },
      { key: "boy-waving-front", file: "boy-waving-front.png", fw: 35, fh: 36 },
      { key: "girl-jumping-front", file: "girl-jumping-front.png", fw: 36, fh: 35 },
      { key: "girl-waving-front", file: "girl-waving-front.png", fw: 35, fh: 36 },
      { key: "villager-woman", file: "villager-woman.png", fw: 40, fh: 43 },
    ];
    newNpcList.forEach(npc => {
      this.load.spritesheet(`npc-${npc.key}`, `src/assets/grave1-v2/more-characters/${npc.file}`, {
        frameWidth: npc.fw, frameHeight: npc.fh
      });
    });
    if (!this.textures.exists("luma-idle")) {
      this.load.spritesheet("luma-idle", "src/assets/luma-idle-spritesheet.png", {
        frameWidth: 200,
        frameHeight: 200,
      });
    }
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
    this.dialogue = null;
    // Hide and destroy portal loading screen if passed from previous scene or left in DOM
    const removeLoadingScreens = () => {
      document.querySelectorAll(".gunita-portal-loading-screen").forEach(el => {
        el.classList.add("hidden");
        setTimeout(() => el.remove(), 400);
      });
    };

    if (data && data.loadingScreen) {
      setTimeout(() => {
        data.loadingScreen.hide();
        setTimeout(() => {
          data.loadingScreen.destroy();
          removeLoadingScreens();
        }, 400);
      }, 500);
    } else {
      removeLoadingScreens();
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

    // Remove the 3rd duplicate decor3 (Index 13) to prevent it from overlapping the 2nd decor3's GID range
    mapData.tilesets = mapData.tilesets.filter((ts, index) => !(ts.name === "decor3" && index === 13));

    mapData.tilesets = mapData.tilesets.map((ts, index) => {
      let name = ts.name || "";
      if (ts.source) {
        name = ts.source.substring(ts.source.lastIndexOf("/") + 1).replace(".tsx", "");
      }
      let frameName = mappings[name] || (name + ".png");

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
        name: name + "_" + index, // Fix duplicate name bug
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

    if (!this.anims.exists("fragment-idle-anim")) {
      this.anims.create({
        key: "fragment-idle-anim",
        frames: this.anims.generateFrameNumbers("fragment-idle"),
        frameRate: 6,
        repeat: -1
      });
    }

    // Retrieve position from cache or default spawn near npc-RANDOM-GUY (x: 576, y: 1920)
    const cache = getCache();
    this.isNewGame = (!cache || cache.position_x === undefined || !cache.played_grave1_intro || data?.isNewGame);
    
    let spawnX = 576;
    let spawnY = 1920;

    if (this.isNewGame) {
      const charsSpawnLayer = map.getObjectLayer("CHARS_SPAWNS");
      if (charsSpawnLayer && charsSpawnLayer.objects) {
        const rgObj = charsSpawnLayer.objects.find((o) => o.name === "vino-start");
        if (rgObj) {
          spawnX = rgObj.x;
          spawnY = rgObj.y;
        }
      }
    } else {
      spawnX = cache.position_x !== null && cache.position_x !== undefined ? Number(cache.position_x) : 1137;
      spawnY = cache.position_y !== null && cache.position_y !== undefined ? Number(cache.position_y) : 550;

      if (isNaN(spawnX)) spawnX = 1137;
      if (isNaN(spawnY)) spawnY = 550;
    }

    const safeSpawn = this.getNearestLandCoordinate(spawnX, spawnY, map);
    spawnX = safeSpawn.x;
    spawnY = safeSpawn.y;

    if (this.isNewGame && cache) {
      setCache({
        ...cache,
        position_x: spawnX,
        position_y: spawnY
      });
    }

    this.lumaGuidanceBox = new LumaGuidanceBox();

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
        // Skip Wasteland (ID 509) & Forest darkens (ID 512) region objects so they don't create solid collision walls
        // Also skip ID 444 (horizontal box blocking the bridge)
        if (obj.id === 509 || obj.id === 512 || obj.id === 444 || (obj.name && (obj.name.toLowerCase() === "wasteland" || obj.name.toLowerCase() === "forest-darkens"))) {
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
      "OLD-WIFE": "sick-wife",
      "SICK-WIFE": "sick-wife",
      "OLD-DAUGHTER": "young-daughter",
      "SCHOOL-GIRL": "school-girl",
      "YOUNG-KID": "young-kid",
      "npc-RANDOM-GUY": "random-guy",
      "npc-RANDOM-WOMAN": "random-woman",
      "npc-DEBT-COLLECTOR": "debt-collector",
      "npc-SICK-WFE": "sick-wife",
      "man-mowing": "man-mowing",
      "man-mowing-2": "man-mowing-2",
      "man-searching": "man-searching",
      "man-talking": "man-talking",
      "mang-tomas": "mang-tomas",
      "mang-tomas-final": "mang-tomas",
      "sick-wife": "sick-wife",
      "woman-picking-flowers": "woman-picking-flowers",
      "woman-searching": "woman-searching",
      "woman-thinking": "woman-thinking",
      "woman-with-broom": "woman-with-broom",
    };

    const newNpcFrameCounts = {
      "man-mowing": 3,
      "man-mowing-2": 3,
      "man-searching": 4,
      "man-talking": 4,
      "mang-tomas": 16,
      "sick-wife": 8,
      "woman-picking-flowers": 3,
      "woman-searching": 3,
      "woman-thinking": 4,
      "woman-with-broom": 3,
      "boy-jumping-front": 4,
      "boy-waving-front": 4,
      "girl-jumping-front": 4,
      "girl-waving-front": 4,
      "villager-woman": 4,
    };

    // Get CHARS_SPAWNS layer from map
    const charsSpawnLayer = map.getObjectLayer("CHARS_SPAWNS");
    
    if (charsSpawnLayer && charsSpawnLayer.objects) {
      charsSpawnLayer.objects.forEach(obj => {
        // Skip polygon objects, non-point objects, or non-NPC markers
        if (obj.polygon || !obj.point || obj.name === "vino-start" || obj.name === "luma-final-spawn" || obj.name === "FOREST-LUMA") {
          return;
        }

        const charName = obj.name;
        // Skip these characters since they are spawned manually or moved to another scene
        if (charName === "sick-wife" || charName === "young-daughter" || charName === "daughter" || charName === "mang-tomas" || charName === "npc-debt-collector" || charName === "npc-young-daughter" || charName === "npc-daughter" || charName === "OLD-DAUGHTER") {
          return;
        }
        const cleanedName = charName.replace(/-\d+$/, '');
        let spriteKey = characterNameMap[charName] || characterNameMap[cleanedName] || cleanedName;
        
        // Fallback if specific key like man-mowing-2 isn't preloaded
        if (!this.textures.exists(`npc-${spriteKey}`) && this.textures.exists(`npc-${cleanedName}`)) {
          spriteKey = cleanedName;
        }

        if (this.textures.exists(`npc-${spriteKey}`)) {
          const pos = this.getNearestLandCoordinate(obj.x, obj.y, map);
          const npc = this.npcs.create(pos.x, pos.y, `npc-${spriteKey}`);
          npc.setDepth(pos.y);

          const isNewCharacter = newNpcFrameCounts[spriteKey] !== undefined;

          if (isNewCharacter) {
            // Scale 0.8 so 40x43 sprites match standard 32x42 character sizes
            npc.setScale(0.8);
            if (npc.body) {
              npc.body.setSize(npc.width * 0.7, npc.height * 0.4);
              npc.body.setOffset(npc.width * 0.15, npc.height * 0.5);
            }

            const frameCount = newNpcFrameCounts[spriteKey];
            const animKey = `npc-anim-${spriteKey}`;
            if (!this.anims.exists(animKey)) {
              const tex = this.textures.get(`npc-${spriteKey}`);
              const actualFrames = tex ? tex.frameTotal - 1 : frameCount;
              let startFrame = 0;
              let endFrame = Math.min(frameCount - 1, actualFrames - 1);

              if (spriteKey === "sick-wife") {
                startFrame = Math.max(0, actualFrames - 2);
                endFrame = Math.max(0, actualFrames - 1);
              }
              
              this.anims.create({
                key: animKey,
                frames: this.anims.generateFrameNumbers(`npc-${spriteKey}`, { start: startFrame, end: endFrame }),
                frameRate: 4,
                repeat: -1
              });
            }
            npc.play(animKey);
          } else {
            if (npc.body) {
              npc.body.setSize(npc.width * 0.8, npc.height * 0.5);
              npc.body.setOffset(npc.width * 0.15, npc.height * 0.5);
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
            npc.setFrame(0);
          }
        } else {
          console.warn(`Unknown character name in CHARS_SPAWNS: ${charName}`);
        }
      });
    }

    // Manually spawn Daughter at new location (2118, 1180)
    const daughterNpc = this.npcs.create(2118, 1180, "npc-daughter");
    daughterNpc.setDepth(1180);
    daughterNpc.setScale(0.8);
    daughterNpc.body.setSize(daughterNpc.width * 0.7, daughterNpc.height * 0.4);
    daughterNpc.body.setOffset(daughterNpc.width * 0.15, daughterNpc.height * 0.5);
    daughterNpc.setFrame(0);
    daughterNpc.textureKey = "npc-daughter"; // Add a custom property so collision code can identify her key

    // Manually spawn Mang Tomas at new location (2127, 3749)
    const mangTomasNpc = this.npcs.create(2127, 3749, "npc-mang-tomas");
    mangTomasNpc.setDepth(3749);
    mangTomasNpc.setScale(0.8);
    mangTomasNpc.body.setSize(mangTomasNpc.width * 0.7, mangTomasNpc.height * 0.4);
    mangTomasNpc.body.setOffset(mangTomasNpc.width * 0.15, mangTomasNpc.height * 0.5);
    mangTomasNpc.setImmovable(true);
    mangTomasNpc.setFrame(0);
    mangTomasNpc.textureKey = "npc-mang-tomas"; // Add a custom property so collision code can identify his key

    // Manually spawn Old Fisherman and Young Fisherman since CHARS_SPAWNS was wiped in Tiled
    const oldFisherman = this.npcs.create(625, 518, "npc-old-fisherman");
    oldFisherman.setDepth(518);
    oldFisherman.setScale(0.8);
    if (oldFisherman.body) {
      oldFisherman.body.setSize(oldFisherman.width * 0.7, oldFisherman.height * 0.4);
      oldFisherman.body.setOffset(oldFisherman.width * 0.15, oldFisherman.height * 0.5);
      oldFisherman.setImmovable(true);
    }
    oldFisherman.textureKey = "npc-old-fisherman";
    oldFisherman.setFrame(0);

    const youngFisherman = this.npcs.create(3281, 2082, "npc-young-fisherman");
    youngFisherman.setDepth(2082);
    youngFisherman.setScale(0.8);
    if (youngFisherman.body) {
      youngFisherman.body.setSize(youngFisherman.width * 0.7, youngFisherman.height * 0.4);
      youngFisherman.body.setOffset(youngFisherman.width * 0.15, youngFisherman.height * 0.5);
      youngFisherman.setImmovable(true);
    }
    youngFisherman.textureKey = "npc-young-fisherman";
    youngFisherman.setFrame(0);

    this.physics.add.collider(this.player.sprite, this.npcs);
    
    // Create progression blocker towards the Northern Path
    // Disable storyBlocker for testing so the player can cross the bridge
    // this.storyBlocker = this.physics.add.staticImage(3615, 2061, null).setSize(200, 50).setVisible(false);
    // this.physics.add.collider(this.player.sprite, this.storyBlocker);
    
    this.storyStage = 1;
    if (cache && cache.inventory) {
      if (cache.inventory.includes("daughters-drawing")) {
        this.storyStage = 5;
      } else if (cache.inventory.includes("rosary")) {
        this.storyStage = 4;
      } else if (cache.inventory.includes("weather-warning-flag")) {
        this.storyStage = 3;
      } else if (cache.inventory.includes("fish-basket")) {
        this.storyStage = 2;
      }
    }
    
    this.currentFragment = null;
    this.currentArtifactKey = null;
    this.investigationComplete = cache && cache.investigation_complete ? cache.investigation_complete : [];
    this.investigationPhase = !this.investigationComplete.includes(this.storyStage);
    this.clueNpcsGroup = this.add.group();
    this.map = map;
    this.spawnInvestigationNpcs();

    // Sync database position if available (skip if it's a new game to prevent snapping to old saved coordinates)
    // Sync database position and reconstruct progress based on inventory
    if (!this.isNewGame && cache && cache.player_id) {
      loadGameState(cache.player_id)
        .then(serverState => {
          if (serverState && serverState.current_area === "Grave 1" && (serverState.position_x !== cache.position_x || serverState.position_y !== cache.position_y)) {
            // Verify server coordinates are on land and not water
            const safeServer = this.getNearestLandCoordinate(serverState.position_x, serverState.position_y, map);
            if (Math.hypot(safeServer.x - serverState.position_x, safeServer.y - serverState.position_y) < 20) {
              console.log("Supabase coordinates differ from cache. Snapping player to match server...");
              this.player.sprite.setPosition(safeServer.x, safeServer.y);
              const freshCache = getCache();
              if (freshCache) {
                setCache({
                  ...freshCache,
                  position_x: safeServer.x,
                  position_y: safeServer.y,
                  current_world: serverState.current_world || freshCache.current_world,
                  current_area: serverState.current_area || freshCache.current_area
                });
              }
            }
          }
          return loadPlayerInventory(cache.player_id);
        })
        .then(items => {
          if (items && Array.isArray(items)) {
            const keys = items.map(item => item.item_key);
            console.log("Loaded inventory items:", keys);
            
            // Sync loaded items into local cache so they persist across sessions for blocker checks
            const freshCache = getCache();
            if (freshCache) {
              freshCache.inventory = keys;
              setCache(freshCache);
            }
            
            if (keys.includes("weather-warning-flag") && keys.includes("fish-basket") && keys.includes("rosary") && keys.includes("daughters-drawing")) {
              if (this.storyBlocker) {
                this.storyBlocker.destroy();
                this.storyBlocker = null;
              }
            }
            
            this.updateLumaGuidance();
          }
        })
        .catch(err => {
          console.warn("Background loading and validation failed:", err.message);
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
      const tex = this.textures.get("rain");
      const maxFrame = tex ? tex.frameTotal - 2 : 23; 
      this.anims.create({
        key: "rain-fall",
        frames: this.anims.generateFrameNumbers("rain", { start: 0, end: Math.max(0, maxFrame) }),
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

    if (!wastelandObj) {
      wastelandObj = {
        x: 1568,
        y: 3840,
        polygon: [
          { "x": 0, "y": 0 },
          { "x": 0, "y": -1568 },
          { "x": 96, "y": -1568 },
          { "x": 96, "y": -1536 },
          { "x": 160, "y": -1536 },
          { "x": 160, "y": -1504 },
          { "x": 384, "y": -1504 },
          { "x": 384, "y": -1472 },
          { "x": 480, "y": -1472 },
          { "x": 480, "y": -1440 },
          { "x": 512, "y": -1440 },
          { "x": 512, "y": -1408 },
          { "x": 608, "y": -1408 },
          { "x": 608, "y": -1376 },
          { "x": 736, "y": -1376 },
          { "x": 736, "y": -1344 },
          { "x": 832, "y": -1344 },
          { "x": 832, "y": -1312 },
          { "x": 928, "y": -1312 },
          { "x": 928, "y": -1280 },
          { "x": 1024, "y": -1280 },
          { "x": 1024, "y": -1248 },
          { "x": 1088, "y": -1248 },
          { "x": 1088, "y": -1216 },
          { "x": 1152, "y": -1216 },
          { "x": 1152, "y": -1184 },
          { "x": 1248, "y": -1184 },
          { "x": 1248, "y": -1152 },
          { "x": 1344, "y": -1152 },
          { "x": 1344, "y": -1120 },
          { "x": 1440, "y": -1120 },
          { "x": 1440, "y": -1088 },
          { "x": 1504, "y": -1088 },
          { "x": 1504, "y": -1056 },
          { "x": 1600, "y": -1056 },
          { "x": 1600, "y": -1024 },
          { "x": 1728, "y": -1024 },
          { "x": 1728, "y": -1056 },
          { "x": 1824, "y": -1056 },
          { "x": 1824, "y": -1088 },
          { "x": 1920, "y": -1088 },
          { "x": 1920, "y": -1120 },
          { "x": 2016, "y": -1120 },
          { "x": 2016, "y": -1152 },
          { "x": 2112, "y": -1152 },
          { "x": 2112, "y": -1184 },
          { "x": 2208, "y": -1184 },
          { "x": 2208, "y": -1216 },
          { "x": 2304, "y": -1216 },
          { "x": 2304, "y": -1248 },
          { "x": 2368, "y": -1248 },
          { "x": 2368, "y": -1280 },
          { "x": 2464, "y": -1280 },
          { "x": 2464, "y": -1312 },
          { "x": 2560, "y": -1312 },
          { "x": 2560, "y": -1344 },
          { "x": 2656, "y": -1344 },
          { "x": 2656, "y": -1376 },
          { "x": 2720, "y": -1376 },
          { "x": 2720, "y": -1344 },
          { "x": 2752, "y": -1344 },
          { "x": 2752, "y": -1312 },
          { "x": 2816, "y": -1312 },
          { "x": 2816, "y": -1280 },
          { "x": 2848, "y": -1280 },
          { "x": 2848, "y": -1216 },
          { "x": 2848, "y": -1248 },
          { "x": 2912, "y": -1248 },
          { "x": 2912, "y": 0 }
        ]
      };
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

    // --- DYNAMIC FOREST DARKENING & RAIN / LIGHTNING SYSTEM FROM TILED MAP (ID 512 / "forest-darkens") ---
    let forestObj = null;
    if (map.objects) {
      map.objects.forEach(layer => {
        if (layer.objects) {
          const found = layer.objects.find(o => o.id === 512 || (o.name && o.name.toLowerCase() === "forest-darkens"));
          if (found) forestObj = found;
        }
      });
    }

    if (!forestObj) {
      const objLayers = map.getObjectLayerNames ? map.getObjectLayerNames() : [];
      for (const name of objLayers) {
        const layer = map.getObjectLayer(name);
        if (layer && layer.objects) {
          const found = layer.objects.find(o => o.id === 512 || (o.name && o.name.toLowerCase() === "forest-darkens"));
          if (found) {
            forestObj = found;
            break;
          }
        }
      }
    }

    if (!forestObj) {
      forestObj = {
        x: 0,
        y: 3680,
        polygon: [
          { "x": 0, "y": 0 },
          { "x": 64, "y": 0 },
          { "x": 64, "y": -32 },
          { "x": 96, "y": -32 },
          { "x": 96, "y": -64 },
          { "x": 192, "y": -64 },
          { "x": 192, "y": -96 },
          { "x": 256, "y": -96 },
          { "x": 256, "y": -128 },
          { "x": 352, "y": -128 },
          { "x": 352, "y": -168 },
          { "x": 368, "y": -168 },
          { "x": 376, "y": -176 },
          { "x": 376, "y": -192 },
          { "x": 448, "y": -192 },
          { "x": 448, "y": -224 },
          { "x": 512, "y": -224 },
          { "x": 512, "y": -256 },
          { "x": 576, "y": -256 },
          { "x": 576, "y": -288 },
          { "x": 640, "y": -288 },
          { "x": 640, "y": -320 },
          { "x": 704, "y": -320 },
          { "x": 704, "y": -352 },
          { "x": 736, "y": -352 },
          { "x": 736, "y": -384 },
          { "x": 768, "y": -384 },
          { "x": 768, "y": -416 },
          { "x": 800, "y": -416 },
          { "x": 800, "y": -448 },
          { "x": 832, "y": -448 },
          { "x": 832, "y": -480 },
          { "x": 864, "y": -480 },
          { "x": 864, "y": -512 },
          { "x": 896, "y": -512 },
          { "x": 896, "y": -576 },
          { "x": 928, "y": -576 },
          { "x": 928, "y": -608 },
          { "x": 960, "y": -608 },
          { "x": 960, "y": -672 },
          { "x": 992, "y": -672 },
          { "x": 992, "y": -704 },
          { "x": 1024, "y": -704 },
          { "x": 1024, "y": -736 },
          { "x": 1056, "y": -736 },
          { "x": 1056, "y": -768 },
          { "x": 1088, "y": -768 },
          { "x": 1088, "y": -832 },
          { "x": 1120, "y": -832 },
          { "x": 1120, "y": -864 },
          { "x": 1152, "y": -864 },
          { "x": 1152, "y": -896 },
          { "x": 1184, "y": -896 },
          { "x": 1184, "y": -928 },
          { "x": 1216, "y": -896 },
          { "x": 1216, "y": -992 },
          { "x": 1248, "y": -992 },
          { "x": 1248, "y": -1024 },
          { "x": 1280, "y": -1024 },
          { "x": 1280, "y": -1056 },
          { "x": 1312, "y": -1056 },
          { "x": 1312, "y": -1344 },
          { "x": 1280, "y": -1344 },
          { "x": 1280, "y": -1568 },
          { "x": 1248, "y": -1568 },
          { "x": 1248, "y": -1664 },
          { "x": 1216, "y": -1664 },
          { "x": 1216, "y": -1728 },
          { "x": 1184, "y": -1728 },
          { "x": 1184, "y": -1792 },
          { "x": 1152, "y": -1792 },
          { "x": 1152, "y": -1920 },
          { "x": 1151.909, "y": -1938.909 },
          { "x": 1100, "y": -1940.5 },
          { "x": 1090, "y": -1946.75 },
          { "x": 1095.272, "y": -1960.818 },
          { "x": 1100.909, "y": -1967.363 },
          { "x": 1100.909, "y": -1980.181 },
          { "x": 1091.875, "y": -1984.5 },
          { "x": 1093, "y": -2004.909 },
          { "x": 1101.454, "y": -2012.545 },
          { "x": 1108.545, "y": -2004 },
          { "x": 1152.545, "y": -2004.363 },
          { "x": 1152, "y": -2016 },
          { "x": 1120, "y": -2016 },
          { "x": 1120, "y": -2080 },
          { "x": 1024, "y": -2080 },
          { "x": 1024, "y": -2176 },
          { "x": 928, "y": -2176 },
          { "x": 928, "y": -2240 },
          { "x": 864, "y": -2240 },
          { "x": 832, "y": -2272 },
          { "x": 768, "y": -2272 },
          { "x": 768, "y": -2304 },
          { "x": 704, "y": -2304 },
          { "x": 672, "y": -2304 },
          { "x": 672, "y": -2336 },
          { "x": 576, "y": -2336 },
          { "x": 480, "y": -2336 },
          { "x": 448, "y": -2368 },
          { "x": 416, "y": -2368 },
          { "x": 416, "y": -2400 },
          { "x": 352, "y": -2400 },
          { "x": 352, "y": -2432 },
          { "x": 320, "y": -2432 },
          { "x": 320, "y": -2464 },
          { "x": 256, "y": -2464 },
          { "x": 256, "y": -2496 },
          { "x": 192, "y": -2496 },
          { "x": 192, "y": -2528 },
          { "x": 96, "y": -2528 },
          { "x": 96, "y": -2560 },
          { "x": 0, "y": -2560 }
        ]
      };
    }

    if (forestObj && forestObj.polygon && forestObj.polygon.length > 0) {
      const originX = forestObj.x;
      const originY = forestObj.y;
      const forestPolygonPoints = forestObj.polygon.map(p => ({
        x: originX + p.x,
        y: originY + p.y
      }));

      const xs = forestPolygonPoints.map(p => p.x);
      const ys = forestPolygonPoints.map(p => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const bboxW = maxX - minX;
      const bboxH = maxY - minY;

      const forestMaskGraphics = this.make.graphics();
      forestMaskGraphics.fillStyle(0xffffff);
      forestMaskGraphics.beginPath();
      forestMaskGraphics.moveTo(forestPolygonPoints[0].x, forestPolygonPoints[0].y);
      for (let i = 1; i < forestPolygonPoints.length; i++) {
        forestMaskGraphics.lineTo(forestPolygonPoints[i].x, forestPolygonPoints[i].y);
      }
      forestMaskGraphics.closePath();
      forestMaskGraphics.fillPath();
      const forestMask = forestMaskGraphics.createGeometryMask();

      this.forestRainTileSprite = this.add.tileSprite(minX, minY, bboxW, bboxH, "rain-tile");
      this.forestRainTileSprite.setOrigin(0, 0);
      this.forestRainTileSprite.setAlpha(0.65);
      this.forestRainTileSprite.setDepth(9999);
      this.forestRainTileSprite.setMask(forestMask);

      const forestPolyGeom = new Phaser.Geom.Polygon(forestPolygonPoints);
      this.forestPolyGeom = forestPolyGeom;
      this.forestRainSpritesGroup = this.add.group();

      for (let rx = minX + 32; rx < maxX; rx += 96) {
        for (let ry = minY + 32; ry < maxY; ry += 96) {
          if (Phaser.Geom.Polygon.Contains(forestPolyGeom, rx, ry)) {
            const s = this.add.sprite(rx, ry, "rain");
            s.setOrigin(0.5, 0.5);
            s.setAlpha(0.7);
            s.setDepth(9999);
            s.play("rain-fall");
            s.setMask(forestMask);
            this.forestRainSpritesGroup.add(s);
          }
        }
      }
    }

    // Scary Forest Dark Overlay (ID 512)
    const { width: scrW, height: scrH } = this.scale;
    this.forestDarkOverlay = this.add.graphics();
    this.forestDarkOverlay.fillStyle(0x04020a, 1);
    this.forestDarkOverlay.fillRect(0, 0, scrW, scrH);
    this.forestDarkOverlay.setScrollFactor(0);
    this.forestDarkOverlay.setDepth(997);
    this.forestDarkOverlay.setAlpha(0);
    this.minimapCamera.ignore(this.forestDarkOverlay);

    // Periodic Thunder Lightning & Camera Shake Effects for Wasteland (ID 509) and Forest (ID 512)
    this.time.addEvent({
      delay: Phaser.Math.Between(7000, 14000),
      loop: true,
      callback: () => {
        if (this.player && this.player.sprite) {
          const inWasteland = this.wastelandPolyGeom && Phaser.Geom.Polygon.Contains(
            this.wastelandPolyGeom,
            this.player.sprite.x,
            this.player.sprite.y
          );
          const inForest = this.forestPolyGeom && Phaser.Geom.Polygon.Contains(
            this.forestPolyGeom,
            this.player.sprite.x,
            this.player.sprite.y
          );
          if (inWasteland || inForest) {
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

    this.investigationCircle = this.add.graphics();
    this.investigationCircle.setDepth(999);
    this.investigationCircle.setVisible(false);
    this.cameras.main.ignore(this.investigationCircle);
    this.tweens.add({
      targets: this.investigationCircle,
      alpha: 0.3,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

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

    // Objective Compass Arrow
    this.objectiveArrow = this.add.graphics();
    this.objectiveArrow.setDepth(15);
    this.objectiveArrow.lineStyle(2, 0x6ee7b7, 1);
    this.objectiveArrow.fillStyle(0x6ee7b7, 0.8);
    // Draw a clear chevron/dart pointing right
    this.objectiveArrow.beginPath();
    this.objectiveArrow.moveTo(12, 0); // Tip
    this.objectiveArrow.lineTo(-8, 8); // Bottom wing
    this.objectiveArrow.lineTo(-4, 0); // Inner indent
    this.objectiveArrow.lineTo(-8, -8); // Top wing
    this.objectiveArrow.closePath();
    this.objectiveArrow.fillPath();
    this.objectiveArrow.strokePath();

    // Autosave timer every 5 seconds
    this.time.addEvent({
      delay: 5000,
      callback: this.saveProgress,
      callbackScope: this,
      loop: true
    });

    // Start-up dialogue for Grave 1 (The Last Fisherman)
    const startupCache = getCache();
    let shouldPlayIntro = false;
    if (startupCache) {
      if (!startupCache.played_grave1_intro) {
        startupCache.played_grave1_intro = true;
        setCache(startupCache);
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
      this.playLumaIntroCutscene();
    } else {
      this.dialogueActive = false;
      this.lumaGuidanceBox.show();
      this.updateLumaGuidance();
    }

    // Advance dialogue with key down events
    const handleInteract = () => {
      if (this.scene.isPaused()) return;
      if (this.dialogueActive && this.dialogue && typeof this.dialogue.onComplete === 'function') {
        this.dialogue.onComplete();
        return;
      }
      if (!this.dialogueActive && this.currentFragment && Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, this.currentFragment.x, this.currentFragment.y) < 60) {
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
        } else if (this.storyStage === 5) {
          riddleData = { riddles: [] };
          artifactKey = "final-artifact";
          dialogueText = "Correct! The final memory is unlocked.";
          sceneKey = "final-boss-fisherman";
          bgKey = "bg-final-conclusion";
        }

        const riddlesToPass = (riddleData && riddleData.riddles) ? riddleData.riddles : riddleData;
        this.startFragmentChallenge(riddlesToPass, () => {
          console.log("[Grave1] onCorrect fired for artifactKey:", artifactKey);
          if (this.currentFragment) {
            this.currentFragment.destroy();
            this.currentFragment = null;
          }
          this.updateLumaGuidance();

          try {
            const cache = getCache();
            const inventoryId = cache ? (cache.inventory_id || cache.player_id) : "local_unknown";
            if (artifactKey) {
              addInventoryItem(inventoryId, artifactKey, "memory_fragment");
            }
          } catch (e) {
            console.warn("Failed to add inventory item:", e);
          }

          try {
            this.saveProgress();
          } catch (e) {
            console.warn("Failed to save progress:", e);
          }

          if (this.storyStage === 5) {
            this.showFinalEndingModal();
            return;
          }

          this.showArtifactClaimModal(artifactKey, () => {
            // Remove the blocker if we have all 4
            const localCache = getCache();
            if (localCache && localCache.inventory) {
                const keys = localCache.inventory;
                if (keys.includes("weather-warning-flag") && keys.includes("fish-basket") && keys.includes("rosary") && keys.includes("daughters-drawing")) {
                    if (this.storyBlocker) {
                        this.storyBlocker.destroy();
                        this.storyBlocker = null;
                    }
                }
            }

            // Read the completed dialogue
            let completedData = this.cache.json.get(`completed-${artifactKey}`);
            if (completedData) {
                const interactions = completedData.interactions;
                const randomInteraction = interactions[Math.floor(Math.random() * interactions.length)];
                const steps = randomInteraction.dialogues.map(text => ({ speaker: randomInteraction.speaker, text: text }));
                
                this.startDialogueSequence(steps, () => {
                    this.storyStage++;
                    this.investigationPhase = !this.investigationComplete.includes(this.storyStage);
                    this.spawnInvestigationNpcs();
                    this.updateLumaGuidance();
                    // Do nothing here, let the player walk to Mang Tomas
                });
            } else {
                this.storyStage++;
                this.investigationPhase = !this.investigationComplete.includes(this.storyStage);
                this.spawnInvestigationNpcs();
                this.updateLumaGuidance();
                // Do nothing here, let the player walk to Mang Tomas
            }
          });
        }, () => {
          this.startDialogueSequence([{ speaker: "Vino", text: "That answer doesn't seem right... I should try again." }]);
        }, bgKey, sceneKey);
      } else if (!this.dialogueActive && this.nearHouseDoor) {
        this.enterFamilyHouse();
      } else if (!this.dialogueActive && this.nearNpc) {
        const npc = this.closestNpc;

        // --- CLUE NPC LOGIC ---
        if (npc.clueData) {
          const clue = npc.clueData;
          if (this.investigationPhase && this.storyStage === npc.phaseId) {
            const dialogueSteps = [{ speaker: clue.speaker, text: clue.dialogue }];
            
            this.startDialogueSequence(dialogueSteps, () => {
              if (clue.isCorrect) {
                this.investigationPhase = false;
                if (this.investigationComplete) {
                  this.investigationComplete.push(this.storyStage);
                  const currentCache = getCache() || {};
                  currentCache.investigation_complete = this.investigationComplete;
                  setCache(currentCache);
                }
                this.startDialogueSequence([{ speaker: "Luma", text: "Now we know where to look. Let's go!" }], () => {
                   this.updateLumaGuidance();
                });
              }
            });
          } else {
            this.startDialogueSequence([{ speaker: clue.speaker, text: clue.defaultDialogue || "..." }]);
          }
          return;
        }
        // --- END CLUE NPC LOGIC ---

        const npcKey = npc.texture.key;

        // Stop spinning and face the player (Vino)
        npc.anims.stop();
        npc.setFlipX(false);

        const playerX = this.player?.sprite ? this.player.sprite.x : (this.player?.x || 0);
        const playerY = this.player?.sprite ? this.player.sprite.y : (this.player?.y || 0);
        const dx = playerX - npc.x;
        const dy = playerY - npc.y;

        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) {
            npc.setFrame(2); // Face right towards Vino
          } else {
            npc.setFrame(1); // Face left towards Vino
          }
        } else {
          if (dy > 0) {
            npc.setFrame(0); // Face down towards Vino
          } else {
            npc.setFrame(3); // Face up towards Vino
          }
        }

        // Make Vino face the NPC as well
        if (this.player && this.player.sprite) {
          const vinoDx = npc.x - playerX;
          const vinoDy = npc.y - playerY;
          if (this.player.sprite.body) {
            this.player.sprite.body.setVelocity(0);
          }
          if (Math.abs(vinoDx) > Math.abs(vinoDy)) {
            if (vinoDx > 0) {
              if (this.anims.exists("vino-moving-right")) this.player.sprite.play("vino-moving-right", true);
            } else {
              if (this.anims.exists("vino-moving-left")) this.player.sprite.play("vino-moving-left", true);
            }
          } else {
            if (vinoDy > 0) {
              if (this.anims.exists("vino-moving-down")) this.player.sprite.play("vino-moving-down", true);
            } else {
              if (this.anims.exists("vino-moving-up")) this.player.sprite.play("vino-moving-up", true);
            }
          }
          if (this.player.sprite.anims) {
            this.player.sprite.anims.stop();
          }
        }

        if (this.storyStage === 5 && npcKey === "npc-mang-tomas" && !this.investigationPhase) {
             this.startDialogueSequence([
               { speaker: "Mang Tomas", text: "I... I am losing the pieces of my story..." },
               { speaker: "Mang Tomas", text: "My memories... my very soul... they are becoming fragmented." },
               { speaker: "Mang Tomas", text: "Please... you must help me remember before the fog takes me completely." }
             ], () => {
               this.spawnFragment(this.closestNpc, "Mang Tomas", "The final memory awaits. Will you listen?");
             });
             return;
        } else if (this.storyStage === 5 && npcKey !== "npc-mang-tomas") {
             const compText = this.getRandomVariant("random-guy-completed", "The sea is calm now. We remember Mang Tomas.");
             this.startDialogueSequence([{ speaker: "Villager", text: compText }]);
             return;
        }

        if (this.storyStage === 1 && npcKey === "npc-old-fisherman" && !this.investigationPhase) {
             const clueText = this.getRandomVariant("old-fisherman-clue", "Always respect the sea, my friend. It gives, but it also takes.");
             this.spawnFragment(this.closestNpc, "Old Fisherman", clueText);
        } else if (this.storyStage === 2 && npcKey === "npc-young-fisherman" && !this.investigationPhase) {
             const clueText = this.getRandomVariant("young-fisherman-clue", "Everyone remembers the storm... I only remember seeing something red waving near the shore.");
             this.spawnFragment(this.closestNpc, "Young Fisherman", clueText);
        } else if (this.storyStage === 3 && (npcKey === "npc-old-wife" || npcKey === "npc-sick-wife") && !this.investigationPhase) {
             const clueText = this.getRandomVariant("sick-wife-clue", this.getRandomVariant("old-wife-clue", "Before every voyage... Tomas never forgot something precious."));
             this.spawnFragment(this.closestNpc, "Sick Wife", clueText);
        } else if (this.storyStage === 4 && (npcKey === "npc-young-daughter" || npcKey === "npc-daughter") && !this.investigationPhase) {
             const clueText = this.getRandomVariant("young-daughter-clue", "I made Papa a drawing... but I don't remember where I left it.");
             this.spawnFragment(this.closestNpc, "Daughter", clueText);
        } else {
             let speaker = "Villager";
             let cacheKey = "random-guy-before";

             if (npcKey === "npc-old-fisherman") { speaker = "Old Fisherman"; cacheKey = "old-fisherman-initial"; }
             else if (npcKey === "npc-young-fisherman") { speaker = "Young Fisherman"; cacheKey = "young-fisherman-initial"; }
             else if (npcKey === "npc-old-wife" || npcKey === "npc-sick-wife") { speaker = "Sick Wife"; cacheKey = "sick-wife-initial"; }
             else if (npcKey === "npc-young-daughter" || npcKey === "npc-daughter") { speaker = "Daughter"; cacheKey = "young-daughter-initial"; }
             else if (npcKey === "npc-mang-tomas") { speaker = "Mang Tomas"; cacheKey = "mang-tomas-initial"; }
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
      this.currentFragment = this.physics.add.sprite(fragmentPos.x, fragmentPos.y, "fragment-idle");
      this.currentFragment.setScale(32/64);
      this.currentFragment.setDepth(1);
      this.currentFragment.play("fragment-idle-anim");
      
      // Update Luma Guidance for the spawned fragment
      this.updateLumaGuidance();

      this.startDialogueSequence([
        { speaker: "Vino", text: "A glowing memory fragment has materialized nearby! Let me inspect it." }
      ]);
    });
  }

  startFinalRiddleSequence() {
    this.inFinalRiddle = true;
    this.updateLumaGuidance();
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
    this.grave1Completed = true;
    if (this.lumaGuidanceBox) {
      this.lumaGuidanceBox.show();
    }
    this.updateLumaGuidance();
    
    // Stop player movement
    this.dialogueActive = true;
    if (this.player && this.player.sprite && this.player.sprite.body) {
      this.player.sprite.body.setVelocity(0);
      if (this.player.sprite.anims.isPlaying) {
        this.player.sprite.anims.stop();
      }
    }

    const endingDialogue = [
      { speaker: "Mang Tomas", text: "You have remembered me... not as a hero, but as a man who loved his family and the sea." },
      { speaker: "Luma", text: "His soul can finally rest. The echoes are at peace." },
      { speaker: "Vino", text: "I will never forget you, Mang Tomas. Your story will live on." },
      { speaker: "Luma", text: "And so will ours, Vino. Every memory we carry forward is a gift to the future." },
      { speaker: "Luma", text: "Farewell, Vino. Until the next forgotten soul calls out..." }
    ];

    this.startDialogueSequence(endingDialogue, async () => {
      // Update cache
      const cache = getCache() || {};
      setCache({ 
        ...cache, 
        grave_1_completed: true, 
        current_area: "Campo Lunan",
        position_x: 1276,
        position_y: 993
      });
      await this.saveProgress(true);

      // Launch credits overlay
      import("../ui/CreditsScreen.js").then(({ CreditsScreen }) => {
        const credits = new CreditsScreen({
          audioManager: this.audioManager,
          onFinished: () => {
            // Transition back to Campo Lunan automatically
            import("../ui/portalLoadingScreen.js").then(({ PortalLoadingScreen }) => {
              const loadingScreen = new PortalLoadingScreen({
                title: "CAMPO LUNAN",
                subtitle: "Returning to the Village",
                hint: "Mang Tomas' soul is at peace."
              });

              setTimeout(() => {
                import("../systems/TransitionSystem.js").then(({ TransitionSystem }) => {
                  TransitionSystem.fadeToScene(this, "CampoLunanScene", { loadingScreen });
                });
              }, 1800);
            });
          }
        });
        credits.start();
      });
    });
  }

  playLumaIntroCutscene() {
    this.dialogueActive = true;
    if (this.player?.sprite?.body) {
      this.player.sprite.body.setVelocity(0, 0); // Lock player
      if (this.player.sprite.anims) {
        this.player.sprite.anims.stop();
      }
    }

    if (!this.dialogue) {
      this.dialogue = new DialogueBox(this);
    }
    this.dialogue.hide();

    let spawnX = this.player.sprite.x;
    let spawnY = this.player.sprite.y;

    try {
      const lumaLand = this.getNearestLandCoordinate(spawnX + 36, spawnY - 30, this.map);

      // Create Luma sprite (initially hidden/invisible) near Vino (matches Campo Lunan positioning)
      this.lumaSprite = this.physics.add.sprite(lumaLand.x, lumaLand.y, "luma-idle");
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
    } catch (err) {
      console.warn("Failed to create Luma intro sprite:", err);
      this.dialogueActive = false;
      if (this.lumaGuidanceBox) {
        this.lumaGuidanceBox.show();
        this.updateLumaGuidance();
      }
      return;
    }

    // Add purple glowing effect to Luma (similar to Campo Lunan)
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

    // Camera shake & sound effect
    this.cameras.main.shake(350, 0.004);
    if (this.audioManager) {
      if (typeof this.audioManager.playLumaSwishSfx === "function") {
        this.audioManager.playLumaSwishSfx();
      } else if (typeof this.audioManager.playLumaSwish === "function") {
        this.audioManager.playLumaSwish();
      }
    }

    // Create crystal-spark particle effect gathering around Luma's entrance
    if (!this.textures.exists("crystal-spark")) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 4, 4);
      g.generateTexture("crystal-spark", 4, 4);
      g.destroy();
    }

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
      blendMode: "SCREEN"
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

        const forestIntroDialogues = [
          { speaker: "Vino", text: "Luma... You're here." },
          { speaker: "Luma", text: "Our first journey begins here." },
          { speaker: "Vino", text: "This place feels... empty." },
          { speaker: "Luma", text: "Memories fade from their edges first. We mustn't let them disappear." },
          { speaker: "Luma", text: "Head north-west. An old fisherman waits at the North Eastern Pier." },
          { speaker: "Vino", text: "Got it. I'll find him." },
          { speaker: "Luma", text: "Listen more than you speak, Vino... Every memory has something to teach." },
          { speaker: "Luma", text: "...And Vino." },
          { speaker: "Vino", text: "Yeah?" },
          { speaker: "Luma", text: "When you listen to their memories... don't search only for answers." },
          { speaker: "Luma", text: "Search for the person they once were." },
          { speaker: "Vino", text: "...I'll remember that." }
        ];

        this.startDialogueSequence(forestIntroDialogues, () => {
          this.dialogueActive = false;

          if (this.audioManager) {
            if (typeof this.audioManager.playLumaSwishSfx === "function") {
              this.audioManager.playLumaSwishSfx();
            } else if (typeof this.audioManager.playLumaSwish === "function") {
              this.audioManager.playLumaSwish();
            }
          }

          if (this.lumaSprite) {
            this.tweens.add({
              targets: this.lumaSprite,
              alpha: 0,
              duration: 1600,
              onComplete: () => {
                if (this.lumaSprite) {
                  this.lumaSprite.destroy();
                  this.lumaSprite = null;
                }
              }
            });
          }

          if (this.lumaGuidanceBox) {
            this.lumaGuidanceBox.show();
            this.updateLumaGuidance();
          }
        });
      }
    });
  }

  spawnInvestigationNpcs() {
    if (!this.clueNpcsGroup) return;
    this.clueNpcsGroup.clear(true, true);

    Object.entries(investigationPhases).forEach(([phaseId, phaseData]) => {
      const center = phaseData.areaCenter;

      phaseData.clueNpcs.forEach(clue => {
      const spawnX = center.x + (clue.offsetX || 0);
      const spawnY = center.y + (clue.offsetY || 0);

      const npc = this.physics.add.sprite(spawnX, spawnY, `npc-${clue.key}`);
      npc.setDepth(spawnY);
      npc.setScale(0.8);
      npc.setImmovable(true);
      
      if (npc.body) {
        npc.body.setSize(npc.width * 0.7, npc.height * 0.4);
        npc.body.setOffset(npc.width * 0.15, npc.height * 0.5);
      }
      
      this.clueNpcsGroup.add(npc);
      
      if (this.anims.exists(`npc-anim-${clue.key}`)) {
        npc.play(`npc-anim-${clue.key}`);
      } else {
        const animKey = `npc-anim-clue-${clue.key}`;
        if (!this.anims.exists(animKey)) {
          this.anims.create({
            key: animKey,
            frames: this.anims.generateFrameNumbers(`npc-${clue.key}`),
            frameRate: 4,
            repeat: -1
          });
        }
        npc.play(animKey);
      }
      
      npc.clueData = clue;
      npc.phaseId = parseInt(phaseId);
    });
    });
  }

  updateLumaGuidance() {
    if (!this.lumaGuidanceBox) return;

    let title = "LUMA'S GUIDANCE";
    let objective = "";
    let hint = "";

    if (this.grave1Completed) {
      // Objective 16 (Grave 1 Completed Reflection)
      title = "LUMA'S FAREWELL";
      objective = "Objective Complete";
      hint = "Mang Tomas' story has been<br/>remembered once more.<br/><br/>The sea may forget footprints,<br/>but it never forgets the lives<br/>that sailed upon it.";
    } else if (this.investigationPhase && investigationPhases[this.storyStage]) {
      const phaseData = investigationPhases[this.storyStage];
      title = "LUMA'S GUIDANCE";
      objective = phaseData.objective;
      hint = phaseData.hint;
    } else if (this.storyStage === 5 && this.currentFragment && this.currentFragment.active) {
      // Objective 15.5 (Save Mang Tomas' Soul)
      title = "LUMA'S REFLECTION";
      objective = "Save Mang Tomas' Soul";
      hint = "Restore his final fragmented memory.";
    } else if (this.inFinalRiddle) {
      // Objective 15 (Final Riddle Active)
      title = "LUMA'S REFLECTION";
      objective = "Answer Mang Tomas'<br/>final questions.";
      hint = "Do not answer with what you<br/>remember.<br/><br/>Answer with what you have<br/>learned.";
    } else if (this.storyStage === 5) {
      // Objective 14 (Reflect on story after 4th artifact)
      title = "LUMA'S REFLECTION";
      objective = "Find Mang Tomas.";
      hint = "He can be found in the lighthouse<br/>of the abandoned village.";
    } else if (this.currentArtifactKey === "daughters-drawing") {
      // Objective 13 (Drawing restored on floor)
      title = "LUMA'S OBSERVATION";
      objective = "Examine the Drawing.";
      hint = "The final piece has returned.<br/>What remains is not a memory...<br/>but its meaning.";
    } else if (this.storyStage === 4 && this.currentFragment && this.currentFragment.active) {
      // Objective 12 (Drawing crystal active)
      title = "LUMA'S OBSERVATION";
      objective = "Restore the Memory Crystal.";
      hint = "Love leaves echoes that<br/>time cannot erase.";
    } else if (this.storyStage === 4) {
      // Objective 11 (Find Daughter)
      title = "LUMA'S OBSERVATION";
      objective = "Find Mang Tomas'<br/>daughter.";
      hint = "She can be found in the<br/>play ground.";
    } else if (this.currentArtifactKey === "rosary") {
      // Objective 10 (Rosary restored on floor)
      title = "LUMA'S OBSERVATION";
      objective = "Examine the Rosary.";
      hint = "Hope often lives in the<br/>smallest things we carry.";
    } else if (this.storyStage === 3 && this.currentFragment && this.currentFragment.active) {
      // Objective 9 (Rosary crystal active)
      title = "LUMA'S OBSERVATION";
      objective = "Restore the Memory Crystal.";
      hint = "Some memories are carried<br/>through faith.";
    } else if (this.storyStage === 3) {
      // Objective 8 (Speak with Mang Tomas' wife)
      title = "LUMA'S OBSERVATION";
      objective = "Speak with Mang Tomas'<br/>wife.";
      hint = "She is in the family home.<br/>Go find her.";
    } else if (this.currentArtifactKey === "weather-warning-flag") {
      // Objective 7 (Warning Flag restored on floor)
      title = "LUMA'S OBSERVATION";
      objective = "Examine the Warning Flag.";
      hint = "The sea gives life...<br/>but asks for respect.";
    } else if (this.storyStage === 2 && this.currentFragment && this.currentFragment.active) {
      // Objective 6 (Warning Flag crystal active)
      title = "LUMA'S GUIDANCE";
      objective = "Restore the Memory Crystal.";
      hint = "Not every warning comes<br/>from fear. Some come from<br/>love.";
    } else if (this.storyStage === 2) {
      // Objective 5 (Find Young Fisherman)
      title = "LUMA'S GUIDANCE";
      objective = "Find the Young Fisherman.";
      hint = "Tthe sea raised its warning. Head South-East";
    } else if (this.currentArtifactKey === "fish-basket") {
      // Objective 4 (Fish Basket restored on floor)
      title = "LUMA'S GUIDANCE";
      objective = "Examine the Fish Basket.";
      hint = "Ordinary objects often carry<br/>extraordinary memories.";
    } else if (this.storyStage === 1 && this.currentFragment && this.currentFragment.active) {
      // Objective 3 (Fish Basket crystal active)
      title = "LUMA'S GUIDANCE";
      objective = "Restore the Memory Crystal.";
      hint = "Fragments resist being remembered. Face the echoes and recover<br/>what has been lost.";
    } else if (this.arrivedAtPier || this.talkedToOldFisherman) {
      // Objective 2 (Arrived at Fishing Dock)
      title = "LUMA'S GUIDANCE";
      objective = "Speak with the Old Fisherman.";
      hint = "The sea remembers those who<br/>respect it. Every story begins<br/>with someone willing to tell it.";
    } else {
      // Objective 1 (Entering the Memory)
      title = "LUMA'S GUIDANCE";
      objective = "Reach the North Eastern Pier.";
      hint = "An old fisherman waits at the<br/>Fishing Dock. Listen before<br/>you search.";
    }

    this.lumaGuidanceBox.update(objective, hint, title);
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

  async saveProgress(forceBackendSave = false) {
    if (window.isExplorationMode) return;
    const cache = getCache();
    if (!cache || !cache.player_id || cache.is_exploration_mode || cache.player_id === "explorer" || !this.player?.sprite) return;

    const state = {
      current_world: "Lunan",
      current_area: "Grave 1",
      position_x: Math.round(this.player.sprite.x),
      position_y: Math.round(this.player.sprite.y),
      explored_chunks: Array.from(this.exploredChunks || []),
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

  update() {
    if (this.rainTileSprite) {
      this.rainTileSprite.tilePositionY += 12;
      this.rainTileSprite.tilePositionX -= 3;
    }
    if (this.forestRainTileSprite) {
      this.forestRainTileSprite.tilePositionY += 12;
      this.forestRainTileSprite.tilePositionX -= 3;
    }

    if (this.player && this.player.sprite) {
      // Dynamic depth sorting: Vino's depth updates dynamically according to Y position so he walks in front of lower objects & behind taller objects
      this.player.sprite.setDepth(this.player.sprite.y);

      const inWasteland = this.wastelandPolyGeom && Phaser.Geom.Polygon.Contains(
        this.wastelandPolyGeom,
        this.player.sprite.x,
        this.player.sprite.y
      );
      const inForest = this.forestPolyGeom && Phaser.Geom.Polygon.Contains(
        this.forestPolyGeom,
        this.player.sprite.x,
        this.player.sprite.y
      );

      // Rain and Thunder Audio SFX and Music switching when player is inside the Wasteland (ID 509) or Forest (ID 512)
      if (inWasteland || inForest) {
        this.audioManager?.playRainThunder();
        
        if (inForest) {
          if (this.audioManager?.currentTrackKey !== "forest-2") {
            this.audioManager?.playTrack("forest-2");
          }
        } else if (inWasteland) {
          if (this.audioManager?.currentTrackKey !== "forgotten-town") {
            this.audioManager?.playTrack("forgotten-town");
          }
        }
      } else {
        this.audioManager?.stopRainThunder();
        
        if (this.audioManager?.currentTrackKey !== "village-v1") {
          this.audioManager?.playTrack("village-v1");
        }
      }

      // Smooth Darkening Transition for Scary Forest Effect (ID 512)
      if (this.forestDarkOverlay) {
        const targetAlpha = inForest ? 0.72 : 0;
        this.forestDarkOverlay.alpha = Phaser.Math.Linear(this.forestDarkOverlay.alpha, targetAlpha, 0.05);
      }

      const chunkX = Math.floor(this.player.sprite.x / 320);
      const chunkY = Math.floor(this.player.sprite.y / 320);
      this.exploredChunks.add(`${chunkX},${chunkY}`);

      // Check proximity to Old Fisherman for Objective 2 (Arrived at Eastern Pier)
      if (this.storyStage === 1 && !this.arrivedAtPier && !this.currentFragment && this.npcs) {
        const fisherman = this.npcs.getChildren().find(n => n.texture && n.texture.key === "npc-old-fisherman");
        if (fisherman) {
          const dist = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, fisherman.x, fisherman.y);
          if (dist < 200) {
            this.arrivedAtPier = true;
            this.updateLumaGuidance();
          }
        }
      }
    }

    if (this.minimapCamera && this.minimapCamera.visible) {
      if (this.minimapPlayerDot && this.player && this.player.sprite) {
        this.minimapPlayerDot.clear();
        this.minimapPlayerDot.fillStyle(0x2dd4bf, 1);
        this.minimapPlayerDot.fillCircle(this.player.sprite.x, this.player.sprite.y, 18);
        this.mapOverlay?.updateLocation(this.player.sprite.x, this.player.sprite.y);
      }

      if (this.investigationPhase && investigationPhases[this.storyStage]) {
        const phaseData = investigationPhases[this.storyStage];
        const center = phaseData.areaCenter;
        this.investigationCircle.setVisible(true);
        this.investigationCircle.clear();
        this.investigationCircle.fillStyle(0xffff00, 1);
        this.investigationCircle.fillCircle(center.x, center.y, phaseData.areaRadius);
      } else if (this.investigationCircle) {
        this.investigationCircle.setVisible(false);
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

    if (this.clueNpcsGroup) {
      this.clueNpcsGroup.getChildren().forEach(npc => {
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
    this.nearHouseDoor = nearHouseDoor;

    if (nearFragment) {
      this.hud.setStatus("PRESS [E] OR [SPACE] TO SOLVE RIDDLE");
      if (this.interactionPrompt && this.currentFragment) {
        this.interactionPrompt.show(this.currentFragment, "E", "SOLVE RIDDLE");
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
    
    // Update Objective Compass Arrow
    if (this.objectiveArrow && this.player && this.player.sprite && this.storyStage >= 1 && this.storyStage <= 5) {
      let targetX = null;
      let targetY = null;
      let hideArrow = false;
      
      if (this.currentFragment && this.currentFragment.active) {
        targetX = this.currentFragment.x;
        targetY = this.currentFragment.y;
      } else if (this.investigationPhase && investigationPhases[this.storyStage]) {
        const phaseData = investigationPhases[this.storyStage];
        targetX = phaseData.areaCenter.x;
        targetY = phaseData.areaCenter.y;
        
        const dist = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, targetX, targetY);
        if (dist <= phaseData.areaRadius) {
          hideArrow = true;
        }
      } else {
        if (this.storyStage === 1) {
          const npc = this.npcs?.getChildren().find(n => n.textureKey === "npc-old-fisherman" || n.texture?.key === "npc-old-fisherman");
          if (npc) { targetX = npc.x; targetY = npc.y; }
        } else if (this.storyStage === 2) {
          const npc = this.npcs?.getChildren().find(n => n.textureKey === "npc-young-fisherman" || n.texture?.key === "npc-young-fisherman");
          if (npc) { targetX = npc.x; targetY = npc.y; }
        } else if (this.storyStage === 3) {
          targetX = 3044; // Family Home door X
          targetY = 320;  // Family Home door Y
        } else if (this.storyStage === 4) {
          const npc = this.npcs?.getChildren().find(n => n.textureKey === "npc-daughter" || n.texture?.key === "npc-daughter" || n.textureKey === "npc-young-daughter");
          if (npc) { targetX = npc.x; targetY = npc.y; }
        } else if (this.storyStage === 5) {
          const npc = this.npcs?.getChildren().find(n => n.textureKey === "npc-mang-tomas" || n.texture?.key === "npc-mang-tomas");
          if (npc) { targetX = npc.x; targetY = npc.y; }
        }
      }
      
      if (targetX !== null && targetY !== null && !hideArrow) {
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
    } else if (this.objectiveArrow) {
      this.objectiveArrow.setVisible(false);
    }
  }

  getNearestLandCoordinate(startX, startY, map) {
    let tileX = Math.floor(startX / 32);
    let tileY = Math.floor(startY / 32);

    if (tileX >= 0 && tileX < map.width && tileY >= 0 && tileY < map.height) {
      const waterTile = map.getTileAt(tileX, tileY, true, "water");
      if (!waterTile || waterTile.index === -1) {
        return { x: startX, y: startY };
      }
    }

    for (let r = 1; r < 10; r++) {
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
  showArtifactClaimModal(artifactKey, onContinue) {
    console.log("[Grave1] showArtifactClaimModal called with artifactKey:", artifactKey);
    this.dialogueActive = true;
    
    try {
      if (this.audioManager && typeof this.audioManager.playLumaSwishSfx === "function") {
        this.audioManager.playLumaSwishSfx();
      }
    } catch (e) {
      console.warn("Audio playLumaSwishSfx error:", e);
    }

    displayArtifactClaimModal(
      artifactKey,
      () => {
        this.dialogueActive = false;
        if (onContinue) onContinue();
      },
      this.audioManager
    );
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
      if (this.audioManager) this.audioManager.stopMusic();
      if (this.lumaGuidanceBox) {
        this.lumaGuidanceBox.hide();
      }
      if (this.interactionPrompt) {
        this.interactionPrompt.hide();
      }
      if (this.hud) {
        this.hud.setPauseVisible(false);
      }
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
              if (this.lumaGuidanceBox) {
                this.lumaGuidanceBox.show();
              }
              if (this.interactionPrompt) {
                this.interactionPrompt.hide();
              }
              if (this.hud) {
                this.hud.setPauseVisible(true);
              }
              if (this.transitionFadeBlack) {
                this.transitionFadeBlack.destroy();
                this.transitionFadeBlack = null;
              }
              this.scene.stop(activeScene);
              this.scene.resume();
              if (this.physics && typeof this.physics.resume === 'function') {
                this.physics.resume();
              }
              // Intentionally removed hardcoded playTrack
          },
          onComplete: () => {
              this.dialogueActive = false;
              if (this.currentFragment) {
                  this.currentFragment.destroy();
                  this.currentFragment = null;
              }
              if (this.lumaGuidanceBox) {
                this.lumaGuidanceBox.show();
              }
              if (this.interactionPrompt) {
                this.interactionPrompt.hide();
              }
              if (this.hud) {
                this.hud.setPauseVisible(true);
              }
              if (this.transitionFadeBlack) {
                this.transitionFadeBlack.destroy();
                this.transitionFadeBlack = null;
              }
              this.scene.stop(activeScene);
              this.scene.resume();
              if (this.physics && typeof this.physics.resume === 'function') {
                this.physics.resume();
              }
              // Intentionally removed hardcoded playTrack
              setTimeout(() => {
                try {
                  onCorrect();
                } catch (err) {
                  console.error("Error in onCorrect:", err);
                  this.dialogueActive = false;
                  this.storyStage++;
                  this.updateLumaGuidance();
                  if (this.storyStage === 5) {
                    this.startFinalRiddleSequence();
                  }
                }
              }, 150);
          },
          onDeath: async () => {
              this.dialogueActive = false;
              if (this.lumaGuidanceBox) {
                this.lumaGuidanceBox.show();
              }
              if (this.interactionPrompt) {
                this.interactionPrompt.hide();
              }
              if (this.hud) {
                this.hud.setPauseVisible(true);
              }
              if (this.transitionFadeBlack) {
                this.transitionFadeBlack.destroy();
                this.transitionFadeBlack = null;
              }
              if (this.physics && typeof this.physics.resume === 'function') {
                this.physics.resume();
              }
              this.scene.stop(activeScene);
              this.scene.resume();
              // Intentionally removed hardcoded playTrack
              
              const cache = getCache();
              if (cache && cache.player_id) {
                  await resetPlayerRiddles(cache.player_id);
              }
              setEssence(5); // reset essence
          }
      });
    });
  }

        // showFinalArtifactButton removed

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
        current_area: "Grave 1",
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
