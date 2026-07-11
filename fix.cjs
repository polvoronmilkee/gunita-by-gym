const fs = require('fs');
let content = fs.readFileSync('src/scenes/Grave1.js', 'utf8');

// Fix daughter texture
content = content.replace('{ key: "young-daughter", file: "young-daughter.png", fw: 32, fh: 42 }', '{ key: "young-daughter", file: "old-daughter.png", fw: 32, fh: 42 }');

// Fix zoom
content = content.replace('this.cameras.main.setZoom(1);', 'this.cameras.main.setZoom(4);');

// Fix load fragment as spritesheet (if not already)
if (content.includes('this.load.image("fragment-main"')) {
    content = content.replace('this.load.image("fragment-main", "src/assets/grave1-elements/fragment-main.png");', 
`    this.load.spritesheet("fragment-main", "src/assets/grave1-elements/fragment-main.png", {
      frameWidth: 32,
      frameHeight: 32
    });`);
}

// Add fragment-anim (if not already)
if (!content.includes('this.anims.exists("fragment-anim")')) {
    content = content.replace('// Retrieve position from cache', 
`    if (!this.anims.exists("fragment-anim")) {
      this.anims.create({
        key: "fragment-anim",
        frames: this.anims.generateFrameNumbers("fragment-main"),
        frameRate: 6,
        repeat: -1
      });
    }

    // Retrieve position from cache`);
}

// Preloads
if (!content.includes('weather-warning-flag.json')) {
    const preloadInject = `    this.load.json('riddle-weather-warning-flag', 'src/assets/data/dialogues/fragments-riddles/weather-warning-flag.json');
    this.load.json('riddle-rosary', 'src/assets/data/dialogues/fragments-riddles/rosary.json');
    this.load.json('riddle-daughters-drawing', 'src/assets/data/dialogues/fragments-riddles/daughters-drawing.json');
    this.load.json('completed-weather-warning-flag', 'src/assets/data/dialogues/fragments-completed/weather-warning-flag.json');
    this.load.json('completed-rosary', 'src/assets/data/dialogues/fragments-completed/rosary.json');
    this.load.json('completed-daughters-drawing', 'src/assets/data/dialogues/fragments-completed/daughters-drawing.json');
    this.load.image('weather-warning-flag', 'src/assets/grave1-elements/fragments-uncovered/weather-flag-warning.png');
    this.load.image('rosary', 'src/assets/grave1-elements/fragments-uncovered/rosary.png');
    this.load.image('daughters-drawing', 'src/assets/grave1-elements/fragments-uncovered/daughters-drawing.png');
`;
    content = content.replace('    this.load.json("completed-fish-basket", "src/assets/data/dialogues/fragments-completed/fish-basket.json");', 
    '    this.load.json("completed-fish-basket", "src/assets/data/dialogues/fragments-completed/fish-basket.json");\n' + preloadInject);
}

// Variables
content = content.replace(/this\.fragmentSpawned = false;\s*this\.randomGuyFragmentCollected = false;\s*this\.oldFishermanInteracted = false;\s*this\.riddleSolved = false;/, 
`    this.storyStage = 1;
    this.currentFragment = null;
    this.currentArtifactKey = null;
    this.currentArtifact = null;
    this.map = map;`);

// Handle Interact
const oldInteractStart = content.indexOf('const handleInteract = () => {');
const oldInteractEnd = content.indexOf('this.input.keyboard.on("keydown-E", handleInteract);');

if (oldInteractStart !== -1 && oldInteractEnd !== -1) {
    const newInteract = `const handleInteract = () => {
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
        let completedData = this.cache.json.get(\`completed-\${this.currentArtifactKey}\`);
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
    
    `;
    content = content.substring(0, oldInteractStart) + newInteract + content.substring(oldInteractEnd);
}

const updateStart = content.indexOf('let nearFragment = false;');
const updateEnd = content.indexOf('    this.player.update(this.cursors);');

if (updateStart !== -1 && updateEnd !== -1) {
    const newUpdate = `let nearFragment = false;
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

    `;
    content = content.substring(0, updateStart) + newUpdate + content.substring(updateEnd);
}

if (!content.includes('spawnFragment(npc, speaker, text)')) {
    const methodsStart = content.indexOf('generateAIDialogues() {');
    const spawnFragmentMethod = `spawnFragment(npc, speaker, text) {
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

  `;
    content = content.substring(0, methodsStart) + spawnFragmentMethod + content.substring(methodsStart);
}

fs.writeFileSync('src/scenes/Grave1.js', content);
