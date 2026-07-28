import Phaser from "phaser";
import { getEssence, setEssence } from "../save.js";
import { AudioManager } from "../utils/audioManager.js";
import { AUDIO_SETTINGS } from "../utils/audioSettings.js";

export class FragmentRosary extends Phaser.Scene {
  constructor() {
    super("fragment-rosary");
  }

  init(data) {
    const rawData = data ? (data.riddleData || data.riddleList) : null;
    if (rawData) {
      if (Array.isArray(rawData)) {
        this.riddleList = rawData;
      } else if (rawData.riddles && Array.isArray(rawData.riddles)) {
        this.riddleList = rawData.riddles;
      } else if (rawData.question) {
        const defaults = this.getDefaultRiddles();
        this.riddleList = [rawData, ...defaults.filter(r => r.question !== rawData.question)];
      } else {
        this.riddleList = this.getDefaultRiddles();
      }
    } else {
      this.riddleList = this.getDefaultRiddles();
    }

    this.remainingRiddles = Phaser.Utils.Array.Shuffle([...this.riddleList]);
    this.currentRiddle = null;

    this.soulName = data.soulName || "The Fisherman";
    this.dodgeLines = data.dodgeLines || [
      "Faith alone will not save you here...",
      "The beads will not protect the forgetful.",
      "Pray harder. Remember deeper."
    ];
    this.onCompleteCallback = data.onComplete;
    this.onDeathCallback = data.onDeath;
    this.bgKey = (data && (data.bgKey || data.bgImage)) || "bg-rosary-scene";

    this.crystalHP = 6;
    this.maxCrystalHP = 6;
    this.soulHP = 5;
    this.retryAttempt = 0;
    this.hasSeenPhase2NewPattern = false;
    this.state = "INIT";
  }

  preload() {
    if (!this.textures.exists("bg-rosary-scene")) {
      this.load.image("bg-rosary-scene", "src/assets/grave1-elements/bullet-scenes/rosary.png");
    }
    if (!this.textures.exists("fragment-main")) {
      this.load.spritesheet("fragment-main", "src/assets/grave1-elements/fragment-main.png", {
        frameWidth: 32,
        frameHeight: 32
      });
    }
    if (!this.cache.audio.has("rosary-boss")) {
      this.load.audio("rosary-boss", new URL("../assets/sounds/music/rosary_BOSS.mp3", import.meta.url).href);
    }
  }

  getDefaultRiddles() {
    return [
      {
        question: "Before facing the waves, many hold me while whispering a prayer. What am I?",
        choices: ["A) Rosary", "B) Compass", "C) Anchor", "D) Fishing Hook"],
        answer: "A) Rosary"
      },
      {
        question: "I am not a weapon, yet I bring courage through faith. What am I?",
        choices: ["A) Rosary", "B) Knife", "C) Lantern", "D) Fishing Net"],
        answer: "A) Rosary"
      },
      {
        question: "Families hold me close when asking for protection. What am I?",
        choices: ["A) Rosary", "B) Basket", "C) Paddle", "D) Shell"],
        answer: "A) Rosary"
      },
      {
        question: "Small beads tied together, carried with hope into uncertain days. What am I?",
        choices: ["A) Rosary", "B) Necklace", "C) Bracelet", "D) Fishing Rope"],
        answer: "A) Rosary"
      },
      {
        question: "He whispered to me every dawn before casting the first net. I gave no answer, but he always felt heard. What am I?",
        choices: ["A) His rosary", "B) His boat", "C) The sea", "D) His knife"],
        answer: "A) His rosary"
      }
    ];
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;

    // Safely stop background music tracks before playing rosary-boss track
    this.sound.sounds.forEach(s => {
      if (s.key !== "rosary-boss" && s.isPlaying && s.loop) {
        s.stop();
      }
    });
    this.audioManager = new AudioManager(this, "rosary-boss");

    // 1. Full-Screen Opaque Backdrop
    const bg = this.add.rectangle(centerX, height / 2, width, height, 0x050508, 1.0);
    bg.setInteractive();

    // Main background — the Rosary
    this.bg = this.add.image(this.scale.width / 2, this.scale.height / 2, "bg-rosary-scene");
    this.bg.setDisplaySize(this.scale.width, this.scale.height);
    this.bg.setAlpha(0.6);

    // 2. Play Area Container (The Box)
    this.boxCenterX = centerX;
    this.boxWidth = 480;
    this.boxCenterY = 270;
    this.boxHeight = 10;

    this.HEIGHT_DIALOGUE = 130;
    this.HEIGHT_RIDDLE = 130;
    this.HEIGHT_DODGE = 260;

    this.boxGraphics = this.add.graphics();

    // Group / Container setups
    this.bullets = [];
    this.bulletTrails = [];
    this.lasers = [];
    this.activeLasers = [];
    this.activeWarnings = [];
    this.patternTimers = [];

    // New rosary-specific state
    this.rosaryPendulums = [];
    this.divineCross = null;
    this.prayerBeams = [];
    this.playerSlowed = false;
    this.slowTimer = 0;

    // Keyboard controls
    this.soulRadius = 4;
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,S,A,D");

    // Global pause listeners
    this.input.keyboard.on('keydown-P', this.handlePause, this);
    this.input.keyboard.on('keydown-ESC', this.handlePause, this);

    // 3. UI Construction
    this.createCrystalHPUI(centerX);
    this.createSoulHPUI(centerX);
    this.createRiddleUI(centerX);

    // Initial Box Render
    this.updateArenaBounds();
    this.drawBox();

    // 4. Start Flow
    this.startIntroSequence();

    this.events.once("shutdown", () => {
      this.cleanupProjectiles();
      if (this.bulletGraphics) {
        this.bulletGraphics.destroy();
        this.bulletGraphics = null;
      }
      this.tweens.killAll();
    });
  }

  updateArenaBounds() {
    this.arena = {
      x: this.boxCenterX - this.boxWidth / 2 + 8,
      y: this.boxCenterY - this.boxHeight / 2 + 8,
      w: this.boxWidth - 16,
      h: this.boxHeight - 16
    };
  }

  drawBox() {
    this.boxGraphics.clear();
    const halfW = this.boxWidth / 2;
    const halfH = this.boxHeight / 2;
    const left = this.boxCenterX - halfW;
    const top = this.boxCenterY - halfH;

    const isRiddle = (this.state === "RIDDLE" || this.state === "INIT" || this.state === "DIALOGUE");
    const fillColor = isRiddle ? 0x1f1712 : 0x050508;

    // Outer fill
    this.boxGraphics.fillStyle(fillColor, 0.95);
    this.boxGraphics.fillRect(left, top, this.boxWidth, this.boxHeight);

    // Ornate Metallic Outer Border
    this.boxGraphics.lineStyle(4, 0x3c2a1e, 1);
    this.boxGraphics.strokeRect(left, top, this.boxWidth, this.boxHeight);

    // Bronze inner outline
    this.boxGraphics.lineStyle(2, 0x8c6a49, 1);
    this.boxGraphics.strokeRect(left + 5, top + 5, this.boxWidth - 10, this.boxHeight - 10);

    // Light parchment inner stroke
    this.boxGraphics.lineStyle(1, 0xbfa482, 0.6);
    this.boxGraphics.strokeRect(left + 8, top + 8, this.boxWidth - 16, this.boxHeight - 16);

    // Corner rivets
    const rivets = [
      { x: left + 6, y: top + 6 },
      { x: left + this.boxWidth - 6, y: top + 6 },
      { x: left + 6, y: top + this.boxHeight - 6 },
      { x: left + this.boxWidth - 6, y: top + this.boxHeight - 6 }
    ];
    rivets.forEach(r => {
      this.boxGraphics.fillStyle(0x2a1a0e, 1);
      this.boxGraphics.fillCircle(r.x, r.y, 4);
      this.boxGraphics.fillStyle(0xd8b878, 1);
      this.boxGraphics.fillCircle(r.x - 1, r.y - 1, 2);
    });
  }

  flashBoxColor(colorHex) {
    const halfW = this.boxWidth / 2;
    const halfH = this.boxHeight / 2;
    const left = this.boxCenterX - halfW;
    const top = this.boxCenterY - halfH;

    this.boxGraphics.clear();
    this.boxGraphics.fillStyle(0x1f1712, 0.95);
    this.boxGraphics.fillRect(left, top, this.boxWidth, this.boxHeight);
    this.boxGraphics.lineStyle(4, colorHex, 1);
    this.boxGraphics.strokeRect(left, top, this.boxWidth, this.boxHeight);
    this.boxGraphics.lineStyle(2, colorHex, 1);
    this.boxGraphics.strokeRect(left + 5, top + 5, this.boxWidth - 10, this.boxHeight - 10);

    this.time.delayedCall(400, () => {
      this.drawBox();
    });
  }

  tweenBoxHeight(targetHeight, onComplete) {
    this.tweens.add({
      targets: this,
      boxHeight: targetHeight,
      duration: 350,
      ease: "Sine.easeInOut",
      onUpdate: () => {
        this.updateArenaBounds();
        this.drawBox();
      },
      onComplete: () => {
        this.updateArenaBounds();
        this.drawBox();
        if (onComplete) onComplete();
      }
    });
  }

  // --- TOP AREA: CRYSTAL HP ---
  createCrystalHPUI(centerX) {
    this.add.text(centerX, 25, `[${this.soulName.toUpperCase()}]`, {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "12px",
      color: "#f7c948"
    }).setOrigin(0.5);

    // 6 Crystal HP Icons
    this.crystalIcons = [];
    for (let i = 0; i < 6; i++) {
      const icon = this.add.sprite(centerX - 75 + i * 30, 50, "fragment-main");
      icon.setScale(1.2);
      this.crystalIcons.push(icon);
    }
    this.updateCrystalHPUI();

    // Floating Crystal Enemy Sprite above the box
    this.crystalEnemy = this.add.sprite(centerX, 110, "fragment-main");
    this.crystalEnemy.setScale(1.8);

    if (!this.anims.exists("fragment-anim") && this.textures.exists("fragment-main")) {
      this.anims.create({
        key: "fragment-anim",
        frames: this.anims.generateFrameNumbers("fragment-main"),
        frameRate: 6,
        repeat: -1,
      });
    }

    if (this.anims.exists("fragment-anim")) {
      this.crystalEnemy.play("fragment-anim");
    }

    this.crystalIdleTween = this.tweens.add({
      targets: this.crystalEnemy,
      y: "-=4",
      yoyo: true,
      repeat: -1,
      duration: 1000
    });

    this.crystalAngryTween = this.tweens.add({
      targets: this.crystalEnemy,
      x: "+=3",
      yoyo: true,
      repeat: -1,
      duration: 50,
      paused: true
    });

    // Dialogue Text inside the box
    this.dialogueText = this.add.text(centerX - this.boxWidth / 2 + 25, this.boxCenterY - 35, "", {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "10px",
      lineSpacing: 8,
      color: "#ffffff",
      align: "left",
      wordWrap: { width: this.boxWidth - 50 }
    }).setOrigin(0, 0);
  }

  updateCrystalHPUI() {
    for (let i = 0; i < 6; i++) {
      if (i < this.crystalHP) {
        this.crystalIcons[i].setTint(0xf7c948); // Golden intact
        this.crystalIcons[i].setAlpha(1.0);
      } else {
        this.crystalIcons[i].setTint(0x333333); // Dark grey shattered
        this.crystalIcons[i].setAlpha(0.4);
      }
    }
  }

  shatterCrystalParticle(targetX, targetY) {
    for (let i = 0; i < 16; i++) {
      const p = this.add.rectangle(targetX, targetY, 4, 4, 0xf7c948);
      const angle = (i / 16) * Math.PI * 2;
      const speed = Phaser.Math.Between(60, 160);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      this.tweens.add({
        targets: p,
        x: targetX + vx,
        y: targetY + vy,
        alpha: 0,
        scale: 0.2,
        duration: 450,
        onComplete: () => p.destroy()
      });
    }
  }

  // --- SOUL HP BAR (PLAYER SIDE) ---
  createSoulHPUI(centerX) {
    const vinoHpX = centerX - 225;
    const vinoHpY = 445;
    const heartSpacing = 28;
    const heartOffsetFromText = 50;

    this.add.text(vinoHpX, vinoHpY, "VINO", {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "12px",
      color: "#b57fee"
    }).setOrigin(0.5);

    this.soulIcons = [];
    this.soulTweens = [];

    for (let i = 0; i < 5; i++) {
      const soul = this.add.text(vinoHpX + heartOffsetFromText + i * heartSpacing, vinoHpY, "♥", {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#b57fee"
      }).setOrigin(0.5);

      const tw = this.tweens.add({
        targets: soul,
        scale: 1.15,
        yoyo: true,
        repeat: -1,
        duration: 600
      });

      this.soulIcons.push(soul);
      this.soulTweens.push(tw);
    }
    this.updateSoulHPUI();
  }

  updateSoulHPUI() {
    for (let i = 0; i < 5; i++) {
      if (i < this.soulHP) {
        this.soulIcons[i].setColor("#b57fee");
        if (this.soulTweens[i]) {
          if (this.soulTweens[i].resume) this.soulTweens[i].resume();
          else if (this.soulTweens[i].play) this.soulTweens[i].play();
        }
      } else {
        this.soulIcons[i].setColor("#333333");
        if (this.soulTweens[i]) {
          this.soulTweens[i].pause();
          this.soulIcons[i].setScale(1.0);
        }
      }
    }
  }

  // --- RIDDLE QUESTION & BUTTONS ---
  createRiddleUI(centerX) {
    this.questionText = this.add.text(centerX - this.boxWidth / 2 + 25, this.boxCenterY - 35, "", {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "10px",
      lineSpacing: 8,
      color: "#ffffff",
      align: "left",
      wordWrap: { width: this.boxWidth - 50 }
    }).setOrigin(0, 0);

    this.buttons = [];
    const btnYStart = 495;
    const positions = [
      { x: centerX - 130, y: btnYStart },
      { x: centerX + 130, y: btnYStart },
      { x: centerX - 130, y: btnYStart + 45 },
      { x: centerX + 130, y: btnYStart + 45 }
    ];

    for (let index = 0; index < 4; index++) {
      const pos = positions[index];

      const btnBg = this.add.rectangle(pos.x, pos.y, 250, 38, 0x25282e).setInteractive({ cursor: "pointer" });
      btnBg.setStrokeStyle(2, 0x8c6a49);

      const btnText = this.add.text(pos.x, pos.y, "", {
        fontFamily: "'Press Start 2P', monospace",
        fontSize: "8px",
        color: "#f7e8c3"
      }).setOrigin(0.5);

      btnBg.on("pointerover", () => {
        if (this.state !== "RIDDLE") return;
        btnBg.setFillStyle(0x9c6c28);
        btnText.setColor("#ffffff");
        btnBg.setStrokeStyle(2, 0xf7e8c3);
      });

      btnBg.on("pointerout", () => {
        if (this.state !== "RIDDLE") return;
        btnBg.setFillStyle(0x25282e);
        btnText.setColor("#f7e8c3");
        btnBg.setStrokeStyle(2, 0x8c6a49);
      });

      btnBg.on("pointerdown", () => {
        if (this.state !== "RIDDLE") return;
        this.handleAnswer(this.buttons[index].text.text, this.currentRiddle.answer);
      });

      this.buttons.push({ bg: btnBg, text: btnText });
    }

    // Timer Bar
    const centerXTimer = centerX;
    const timerY = 410;
    this.timerBarBg = this.add.rectangle(centerXTimer, timerY, 480, 10, 0x000000);
    this.timerBarBg.setStrokeStyle(2, 0xffffff);

    this.timerBarFill = this.add.rectangle(centerXTimer - 240, timerY, 480, 10, 0xf7c948).setOrigin(0, 0.5);
  }

  // --- TYPEWRITER TEXT ---
  typewriterText(textObject, text, speed = 20, onComplete = null) {
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = null;
    }
    textObject.setText("");
    let index = 0;

    this.typewriterTimer = this.time.addEvent({
      delay: speed,
      callback: () => {
        if (!textObject || !textObject.active) return;
        textObject.setText(text.substring(0, index + 1));
        index++;
        if (index >= text.length) {
          if (this.typewriterTimer) this.typewriterTimer.destroy();
          this.typewriterTimer = null;
          if (onComplete) onComplete();
        }
      },
      loop: true
    });
  }

  typewriterDialogue(text, onComplete) {
    this.typewriterText(this.dialogueText, text, 22, onComplete);
  }

  clearTextAndTimers() {
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = null;
    }
    this.dialogueText.setVisible(false);
    this.dialogueText.setText("");
    this.questionText.setVisible(false);
    this.questionText.setText("");
  }

  waitForAdvance(callback) {
    let advanced = false;
    const trigger = () => {
      if (advanced) return;
      advanced = true;
      this.input.off("pointerdown", trigger);
      if (this.spaceKey) this.spaceKey.off("down", trigger);
      callback();
    };

    this.input.once("pointerdown", trigger);
    if (!this.spaceKey) {
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }
    this.spaceKey.once("down", trigger);
  }

  // --- BATTLE FLOW STATES ---
  startIntroSequence() {
    this.state = "INTRO";
    this.crystalEnemy.setTint(0xffffff);
    this.crystalIdleTween.resume();
    this.crystalAngryTween.pause();

    this.clearTextAndTimers();
    this.setChoiceButtonsState("HIDDEN");
    this.setRiddleUIElementsVisible(false);

    this.tweenBoxHeight(this.HEIGHT_DIALOGUE, () => {
      this.dialogueText.setOrigin(0, 0);
      this.dialogueText.setPosition(this.boxCenterX - this.boxWidth / 2 + 25, this.boxCenterY - 35);
      this.dialogueText.setAlign("left");
      this.dialogueText.setVisible(true);

      const introLine = "Faith is the thread that binds memory\nto the soul... Prove yours holds true.";
      this.typewriterDialogue(introLine, () => {
        this.waitForAdvance(() => {
          this.transitionToDodge();
        });
      });
    });
  }

  transitionToRiddle() {
    this.state = "TWEEN_TO_RIDDLE";
    this.clearTextAndTimers();
    this.setChoiceButtonsState("HIDDEN");
    this.setRiddleUIElementsVisible(false);

    this.tweenBoxHeight(10, () => {
      this.tweenBoxHeight(this.HEIGHT_RIDDLE, () => {
        this.setRiddleUIElementsVisible(true);
        this.startRiddlePhase();
      });
    });
  }

  setRiddleUIElementsVisible(visible) {
    this.timerBarBg.setVisible(visible);
    this.timerBarFill.setVisible(visible);
  }

  setChoiceButtonsState(state) {
    this.buttons.forEach(btn => {
      if (state === "HIDDEN") {
        btn.bg.setVisible(false);
        btn.text.setVisible(false);
        btn.bg.disableInteractive();
      } else if (state === "ACTIVE") {
        btn.bg.setVisible(true);
        btn.text.setVisible(true);
        btn.bg.setAlpha(1);
        btn.text.setAlpha(1);
        btn.bg.setInteractive({ cursor: "pointer" });
      } else if (state === "GREYED") {
        btn.bg.setVisible(true);
        btn.text.setVisible(true);
        btn.bg.setAlpha(0.3);
        btn.text.setAlpha(0.3);
        btn.bg.disableInteractive();
      }
    });
  }

  startRiddlePhase() {
    this.state = "RIDDLE_TYPEWRITER";
    this.crystalEnemy.clearTint();
    this.crystalIdleTween.resume();
    this.crystalAngryTween.pause();

    // Clean up dodge artifacts
    this.cleanupProjectiles();
    if (this.soul) {
      this.soul.clear();
      this.soul.destroy();
      this.soul = null;
    }

    // Select a random riddle from the remaining pool for the current phase
    const currentPhase = this.getCurrentPhase();
    const difficultyMap = { 1: "easy", 2: "medium", 3: "hard" };
    const targetDifficulty = difficultyMap[currentPhase] || "easy";

    let pool = this.riddleList.filter(r => r.difficulty === targetDifficulty);
    if (pool.length === 0) pool = this.riddleList; // fallback

    if (!this.remainingRiddles) this.remainingRiddles = [];
    if (!this.recentRiddles) this.recentRiddles = [];
    
    // Filter out recently asked riddles from available pool
    let available = pool.filter(r => this.remainingRiddles.includes(r) && !this.recentRiddles.includes(r));
    
    if (available.length === 0) {
      // If all are recent or exhausted, just refill the pool (and reset remaining for this difficulty)
      this.remainingRiddles = this.remainingRiddles.concat(pool);
      available = pool.filter(r => !this.recentRiddles.includes(r));
      if (available.length === 0) available = [...pool]; // absolute fallback
    }
    
    this.currentRiddle = Phaser.Utils.Array.GetRandom(available);

    // Track recently asked riddle
    this.recentRiddles.push(this.currentRiddle);
    if (this.recentRiddles.length > 3) {
      this.recentRiddles.shift();
    }

    this.questionText.setOrigin(0, 0);
    this.questionText.setPosition(this.boxCenterX - this.boxWidth / 2 + 25, this.boxCenterY - 35);
    this.questionText.setAlign("left");
    this.questionText.setVisible(true);
    this.dialogueText.setVisible(false);

    let choices = this.currentRiddle.choices || ["A", "B", "C", "D"];
    // Shuffle the choices so the correct answer is on a random button
    choices = Phaser.Utils.Array.Shuffle([...choices]);

    choices.forEach((choiceText, i) => {
      this.buttons[i].text.setText(choiceText);
      this.buttons[i].bg.setFillStyle(0x000000);
      this.buttons[i].text.setColor("#ffffff");
      this.buttons[i].bg.setStrokeStyle(3, 0xffffff);
    });

    this.setChoiceButtonsState("HIDDEN");
    this.setRiddleUIElementsVisible(false);

    this.typewriterText(this.questionText, this.currentRiddle.question, 16, () => {
      this.state = "RIDDLE";
      const durations = [18000, 14000, 10000, 8000];
      this.phaseTimer = durations[Math.min(this.retryAttempt, 3)];
      this.maxPhaseTimer = this.phaseTimer;

      this.timerBarFill.width = 480;
      this.timerBarFill.setFillStyle(0xf7c948);
      this.setChoiceButtonsState("ACTIVE");
      this.setRiddleUIElementsVisible(true);
    });
  }

  handleAnswer(selected, correctAnswer) {
    if (this.state !== "RIDDLE") return;
    this.state = "ANSWER_FEEDBACK";

    const clickedBtn = this.buttons.find(btn => btn.text.text === selected);

    if (selected === correctAnswer) {
      if (clickedBtn) {
        clickedBtn.bg.setFillStyle(0xf7c948);
        clickedBtn.text.setColor("#000000");
        clickedBtn.bg.setStrokeStyle(3, 0xf7c948);
      }
      this.flashBoxColor(0xf7c948);
      this.time.delayedCall(450, () => {
        this.handleCorrectAnswer();
      });
    } else {
      if (clickedBtn) {
        clickedBtn.bg.setFillStyle(0xff4444);
        clickedBtn.text.setColor("#ffffff");
        clickedBtn.bg.setStrokeStyle(3, 0xff0000);
      }
      this.flashBoxColor(0xff4444);
      this.time.delayedCall(600, () => {
        this.startTryAgainDialogue();
      });
    }
  }

  handleCorrectAnswer() {
    this.state = "CORRECT";

    const shatteredIcon = this.crystalIcons[this.crystalHP - 1];
    this.shatterCrystalParticle(shatteredIcon.x, shatteredIcon.y);

    this.crystalHP--;
    this.updateCrystalHPUI();

    if (this.currentRiddle && this.remainingRiddles) {
      const idx = this.remainingRiddles.indexOf(this.currentRiddle);
      if (idx > -1) this.remainingRiddles.splice(idx, 1);
    }

    if (this.crystalHP <= 0) {
      this.time.delayedCall(1500, () => {
        if (this.onCompleteCallback) this.onCompleteCallback();
      });
      return;
    }

    const reactionLines = [
      "The beads remember your touch...",
      "Each prayer answered strengthens the thread.",
      "Faith echoes through the silence.",
      "The rosary hums with recognition."
    ];

    const line = reactionLines[6 - this.crystalHP - 1] || "Memory restored...";
    this.retryAttempt = 0;

    this.cleanupProjectiles();

    this.clearTextAndTimers();
    this.setChoiceButtonsState("HIDDEN");
    this.setRiddleUIElementsVisible(false);

    this.tweenBoxHeight(10, () => {
      this.tweenBoxHeight(this.HEIGHT_DIALOGUE, () => {
        this.dialogueText.setOrigin(0, 0);
        this.dialogueText.setPosition(this.boxCenterX - this.boxWidth / 2 + 25, this.boxCenterY - 35);
        this.dialogueText.setAlign("left");
        this.dialogueText.setVisible(true);

        this.typewriterDialogue(line, () => {
          this.waitForAdvance(() => {
            this.transitionToDodge();
          });
        });
      });
    });
  }

  startTryAgainDialogue() {
    this.state = "TRY_AGAIN_DIALOGUE";
    this.cleanupProjectiles();
    if (this.soul) {
      this.soul.clear();
      this.soul.destroy();
      this.soul = null;
    }

    this.clearTextAndTimers();
    this.setChoiceButtonsState("HIDDEN");
    this.setRiddleUIElementsVisible(false);

    const randomLine = Phaser.Utils.Array.GetRandom(this.dodgeLines);

    this.tweenBoxHeight(10, () => {
      this.tweenBoxHeight(this.HEIGHT_DIALOGUE, () => {
        this.dialogueText.setOrigin(0, 0);
        this.dialogueText.setPosition(this.boxCenterX - this.boxWidth / 2 + 25, this.boxCenterY - 35);
        this.dialogueText.setAlign("left");
        this.dialogueText.setVisible(true);

        this.typewriterDialogue(randomLine, () => {
          this.waitForAdvance(() => {
            this.transitionToDodge();
          });
        });
      });
    });
  }

  transitionToDodge() {
    this.state = "TWEEN_TO_DODGE";
    this.cleanupProjectiles();
    if (this.soul) {
      this.soul.clear();
      this.soul.destroy();
      this.soul = null;
    }

    this.clearTextAndTimers();
    this.setChoiceButtonsState("HIDDEN");

    this.tweenBoxHeight(10, () => {
      this.tweenBoxHeight(this.HEIGHT_DODGE, () => {
        this.prepareDodgePhase();
      });
    });
  }

  prepareDodgePhase() {
    this.cleanupProjectiles();
    this.state = "DODGE_WAIT";
    this.setChoiceButtonsState("GREYED");
    this.dialogueText.setVisible(false);

    // Angry crystal
    this.crystalEnemy.setTint(0xff4444);
    this.crystalIdleTween.pause();
    this.crystalAngryTween.resume();

    // Spawn Vino Soul inside arena
    if (this.soul) {
      this.soul.clear();
      this.soul.destroy();
    }
    this.soul = this.add.graphics();
    this.soul.x = this.arena.x + this.arena.w / 2;
    this.soul.y = this.arena.y + this.arena.h / 2 + 30;
    this.drawSoul();

    this.phaseTimer = 10000;
    this.maxPhaseTimer = 10000;

    // Reset rosary-specific state
    this.rosaryPendulums = [];
    this.divineCross = null;
    this.prayerBeams = [];
    this.playerSlowed = false;
    this.slowTimer = 0;

    // Buffer Delay: 300ms pause before projectiles start
    this.time.delayedCall(300, () => {
      if (this.state === "DODGE_WAIT") {
        this.startDodgePhase();
      }
    });
  }

  getCurrentPhase() {
    if (this.crystalHP >= 4) return 1;
    if (this.crystalHP >= 2) return 2;
    return 3;
  }

  startDodgePhase() {
    this.cleanupProjectiles();
    this.state = "DODGE";
    this.startPatternsForPhase();
  }

  drawSoul() {
    if (!this.soul) return;
    this.soul.clear();
    this.soul.fillStyle(0xb57fee, 1);
    this.soul.lineStyle(1, 0xffffff, 0.8);
    this.soul.fillCircle(0, 2, this.soulRadius);
    this.soul.strokeCircle(0, 2, this.soulRadius);
    this.soul.fillTriangle(-4, 2, 4, 2, 0, -8);
    this.soul.strokeTriangle(-4, 2, 4, 2, 0, -8);
  }

  // --- DYNAMIC 3-PHASE PATTERN DISPATCHER ---
  startPatternsForPhase() {
    this.patternTimers = [];
    this.isDesperation = false;

    const phase = this.getCurrentPhase();

    if (phase === 1) {
      const pool1 = [1, 2, 5];
      const choice = Phaser.Utils.Array.GetRandom(pool1);
      this.executePattern(choice);
    } else if (phase === 2) {
      let choice;
      if (!this.hasSeenPhase2NewPattern) {
        const newPool = [3, 4];
        choice = Phaser.Utils.Array.GetRandom(newPool);
        this.hasSeenPhase2NewPattern = true;
      } else {
        const pool2 = [1, 2, 3, 4, 5];
        choice = Phaser.Utils.Array.GetRandom(pool2);
      }
      this.executePattern(choice);
    } else if (phase === 3) {
      // Desperation State (HP 1)!
      this.isDesperation = true;
      this.phaseTimer = 14000;
      this.maxPhaseTimer = 14000;

      // Visual Cue: Crystal pulses deep red
      this.crystalEnemy.setTint(0xff1111);

      // The Divine Cross is ALWAYS present in every attack phase during Desperation,
      // slowing the player down while one of the other 4 patterns runs alongside it!
      this.fireDivineCross(this.phaseTimer);

      const otherPatterns = [1, 3, 4, 5];
      const choice = Phaser.Utils.Array.GetRandom(otherPatterns);
      this.executePattern(choice);
    }
  }

  executePattern(patternId) {
    const desp = this.isDesperation;
    const duration = desp ? 14000 : 10000;

    if (patternId === 1) { // Rosary Pendulum
      this.fireRosaryPendulum(duration);
    } else if (patternId === 2) { // Divine Cross
      this.fireDivineCross(duration);
    } else if (patternId === 3) { // Candle Rain
      const baseSpeed = desp ? 95 : 75;
      let speedInc = 0;
      for (let t = 0; t < duration; t += 1800) {
        const speed = baseSpeed + speedInc;
        this.patternTimers.push(this.time.delayedCall(t, () => this.fireCandleRain(speed)));
        speedInc += 8;
      }
    } else if (patternId === 4) { // Incense Spiral
      this.fireIncenseSpiral(duration);
    } else if (patternId === 5) { // Bouncing Rosary Ring
      for (let t = 0; t < duration; t += 3600) {
        this.patternTimers.push(this.time.delayedCall(t, () => this.fireBouncingRosaryRing()));
      }
    }
  }

  // =================================================================
  // PATTERN 1: ROSARY PENDULUM — Swinging chain of prayer beads
  // =================================================================
  fireRosaryPendulum(duration) {
    if (this.state !== "DODGE") return;
    const { x, y, w, h } = this.arena;
    const desp = this.isDesperation;

    const swingSpeed = 1.8;
    const maxAngle = Math.PI / 2; // Full 180 deg sweep (-90 to +90 deg)

    const createPendulum = (isOpposite) => {
      const start = isOpposite ? -Math.PI / 2 : Math.PI / 2;
      const end = isOpposite ? Math.PI / 2 : -Math.PI / 2;
      return {
        anchorX: x + w / 2,
        anchorY: y,
        numBeads: 8,
        segmentLength: (h - 20) / 8,
        beadRadius: 10,
        hitboxRadius: 7,
        missingBeadIndex: Phaser.Math.Between(2, 4),
        swingState: "HOLD",
        holdDelay: 0.8,
        isInitialHold: true, // Prevents swapping angles on the very first drop
        swingProgress: 0,
        swingDuration: 1600, // 1.6 seconds to swing from side to side
        startAngle: start,
        endAngle: end,
        angleHistory: [], // Stores recent angles for smooth motion blur trail
        active: true
      };
    };

    this.rosaryPendulums.push(createPendulum(false));

    if (desp) {
      this.rosaryPendulums.push(createPendulum(true));
    }
  }

  // =================================================================
  // PATTERN 2: DIVINE CROSS — Glowing cross that pulses & shoots beads
  // =================================================================
  fireDivineCross(duration) {
    if (this.state !== "DODGE") return;
    const { x, y, w, h } = this.arena;
    const desp = this.isDesperation;

    const crossX = x + w / 2;
    const crossY = y + h / 2;

    this.divineCross = {
      x: this.crystalEnemy.x,
      y: this.crystalEnemy.y,
      targetX: crossX,
      targetY: crossY,
      size: 30,
      active: false,
      dropping: true,
      pulseTimer: 0,
      pulseInterval: desp ? 1500 : 2000,
      shootTimer: 0,
      shootInterval: desp ? 600 : 800,
      pulseRings: []
    };

    // Animate the cross dropping from crystal to center
    this.tweens.add({
      targets: this.divineCross,
      x: crossX,
      y: crossY,
      duration: 800,
      ease: "Bounce.easeOut",
      onComplete: () => {
        if (this.divineCross) {
          this.divineCross.active = true;
          this.divineCross.dropping = false;
          this.cameras.main.shake(80, 0.003);
        }
      }
    });
  }

  // =================================================================
  // PATTERN 3: CANDLE RAIN — Flame projectiles drifting down with sway
  // =================================================================
  fireCandleRain(baseSpeed) {
    if (this.state !== "DODGE") return;
    const { x, w } = this.arena;
    const spawnY = this.boxCenterY - 130; // Stable top coordinate (140)
    const desp = this.isDesperation;

    const count = 12;
    const step = w / (count + 1);
    const gapCount = desp ? 2 : 3;

    // Pick random gap positions (columns)
    const skipIndices = [];
    let attempts = 0;
    while (skipIndices.length < gapCount && attempts < 50) {
      attempts++;
      const r = Phaser.Math.Between(1, count);
      if (!skipIndices.includes(r)) skipIndices.push(r);
    }

    for (let i = 1; i <= count; i++) {
      if (skipIndices.includes(i)) continue;
      const baseX = x + step * i;
      this.bullets.push({
        x: baseX,
        y: spawnY,
        vx: 0,
        vy: baseSpeed,
        radius: 4,
        color: 0xf7c948,
        isCandleFlame: true,
        swayPhase: Math.random() * Math.PI * 2
      });
    }
  }

  // =================================================================
  // PATTERN 4: INCENSE SPIRAL — Rotating arms spawning inward bullets
  // =================================================================
  fireIncenseSpiral(duration) {
    if (this.state !== "DODGE") return;
    const { x, y, w, h } = this.arena;
    const desp = this.isDesperation;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const maxRadius = Math.min(w, h) / 2 - 10;

    const half = duration / 2;

    const spawnCycle = (startTime, cycleDuration) => {
      const numArms = desp ? 3 : 2;
      const armSpacing = (Math.PI * 2) / numArms;
      const rotSpeed = 1.5;
      const spawnInterval = 250;
      let baseAngle = Math.random() * Math.PI * 2;

      for (let t = 0; t < cycleDuration; t += spawnInterval) {
        this.patternTimers.push(this.time.delayedCall(startTime + t, () => {
          if (this.state !== "DODGE") return;
          const elapsed = t / 1000;
          const angle = baseAngle + elapsed * rotSpeed;

          for (let arm = 0; arm < numArms; arm++) {
            const a = angle + arm * armSpacing;
            const spawnX = cx + maxRadius * Math.cos(a);
            const spawnY = cy + maxRadius * Math.sin(a);
            const speed = 75;
            const dirX = (cx - spawnX) / maxRadius;
            const dirY = (cy - spawnY) / maxRadius;

            this.bullets.push({
              x: spawnX,
              y: spawnY,
              vx: dirX * speed,
              vy: dirY * speed,
              radius: 5,
              color: arm % 2 === 0 ? 0xf5a0c0 : 0x7c3aed,
              life: 10000
            });
          }
        }));
      }
    };

    spawnCycle(0, half);
    spawnCycle(half + 500, half - 500);
  }

  fireBouncingRosaryRing() {
    if (this.state !== "DODGE" || !this.soul) return;
    const desp = this.isDesperation;
    const cx = this.crystalEnemy.x;
    const cy = this.crystalEnemy.y;

    const targetX = this.soul.x;
    const targetY = this.soul.y;
    const angle = Phaser.Math.Angle.Between(cx, cy, targetX, targetY);
    const slowSpeed = 80;

    this.bullets.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * slowSpeed,
      vy: Math.sin(angle) * slowSpeed,
      radius: 12, // 1 Big Ball
      color: 0xf7c948,
      life: 1400,
      onExplode: (ex, ey) => {
        if (this.state !== "DODGE") return;

        // Sound/shake visual effect on detonation
        this.cameras.main.shake(100, 0.005);

        // Scatter into individual bouncing beads
        const scatterCount = desp ? 8 : 6;
        for (let s = 0; s < scatterCount; s++) {
          const sAngle = (s / scatterCount) * Math.PI * 2 + (Math.PI / 6);
          const bounceSpeed = desp ? 145 : 130;
          this.bullets.push({
            x: ex,
            y: ey,
            vx: Math.cos(sAngle) * bounceSpeed,
            vy: Math.sin(sAngle) * bounceSpeed,
            radius: 5,
            color: 0xe8a317,
            bounces: 2
          });
        }
      }
    });
  }

  // =================================================================
  // HELPER: Point-to-line segment distance for beam collision
  // =================================================================
  pointToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = lenSq !== 0 ? dot / lenSq : -1;
    param = Math.max(0, Math.min(1, param));
    const xx = x1 + param * C;
    const yy = y1 + param * D;
    return Math.hypot(px - xx, py - yy);
  }

  // =================================================================
  // CLEANUP PROJECTILES
  // =================================================================
  cleanupProjectiles() {
    // Pattern timers
    if (this.patternTimers && this.patternTimers.length > 0) {
      this.patternTimers.forEach(t => {
        if (t) {
          if (typeof t.remove === "function") t.remove();
          else if (typeof t.destroy === "function") t.destroy();
        }
      });
      this.patternTimers = [];
    }
    // Warnings
    if (this.activeWarnings && this.activeWarnings.length > 0) {
      this.activeWarnings.forEach(w => {
        if (w && w.active) {
          this.tweens.killTweensOf(w);
          w.destroy();
        }
      });
      this.activeWarnings = [];
    }
    // Active lasers
    if (this.activeLasers && this.activeLasers.length > 0) {
      this.activeLasers.forEach(l => {
        if (l && l.active) {
          this.tweens.killTweensOf(l);
          l.destroy();
        }
      });
      this.activeLasers = [];
    }
    // Lasers
    if (this.lasers && this.lasers.length > 0) {
      this.lasers.forEach(l => {
        if (l && l.graphics && l.graphics.active) {
          this.tweens.killTweensOf(l.graphics);
          l.graphics.destroy();
        }
      });
      this.lasers = [];
    }
    // Bullets
    if (this.bullets) {
      this.bullets.forEach(b => {
        if (b.graphics && b.graphics.active) b.graphics.destroy();
      });
      this.bullets = [];
    }
    // Bullet graphics
    if (this.bulletGraphics) {
      this.bulletGraphics.clear();
    }
    // Rosary pendulums
    this.rosaryPendulums = [];
    // Divine cross
    this.divineCross = null;
    // Prayer beams
    if (this.prayerBeams) {
      this.prayerBeams = [];
    }
    // Player slow
    this.playerSlowed = false;
    this.slowTimer = 0;
  }

  // =================================================================
  // UPDATE LOOP & COLLISIONS
  // =================================================================
  update(time, delta) {
    if (this.state === "RIDDLE") {
      this.phaseTimer -= delta;
      this.timerBarFill.width = 480 * Math.max(0, this.phaseTimer / this.maxPhaseTimer);
      this.timerBarFill.setFillStyle(0xf7c948);

      if (this.phaseTimer <= 0) {
        this.startTryAgainDialogue();
      }
    } else if (this.state === "DODGE") {
      this.phaseTimer -= delta;

      if (this.phaseTimer <= 0) {
        // Dodge survived! Return to riddle
        this.cleanupProjectiles();
        if (this.soul) {
          this.soul.clear();
          this.soul.destroy();
          this.soul = null;
        }
        this.retryAttempt++;
        this.dialogueText.setVisible(false);
        this.questionText.setVisible(false);
        this.tweenBoxHeight(10, () => {
          this.tweenBoxHeight(this.HEIGHT_RIDDLE, () => {
            this.startRiddlePhase();
          });
        });
        return;
      }

      // --- Player Slow Timer ---
      if (this.playerSlowed) {
        this.slowTimer -= delta;
        if (this.slowTimer <= 0) {
          this.playerSlowed = false;
          this.slowTimer = 0;
        }
      }

      // --- Soul Movement ---
      if (!this.soul) return;
      let speed = 200 * (delta / 1000);
      if (this.playerSlowed) speed *= 0.70; // 30% slow reduction

      let vx = 0;
      let vy = 0;

      if (this.cursors.left.isDown || this.keys.A.isDown) vx = -speed;
      else if (this.cursors.right.isDown || this.keys.D.isDown) vx = speed;

      if (this.cursors.up.isDown || this.keys.W.isDown) vy = -speed;
      else if (this.cursors.down.isDown || this.keys.S.isDown) vy = speed;

      if (vx !== 0 && vy !== 0) {
        vx *= 0.7071;
        vy *= 0.7071;
      }

      this.soul.x += vx;
      this.soul.y += vy;

      const innerPad = this.soulRadius + 6;
      this.soul.x = Phaser.Math.Clamp(this.soul.x, this.arena.x + innerPad, this.arena.x + this.arena.w - innerPad);
      this.soul.y = Phaser.Math.Clamp(this.soul.y, this.arena.y + innerPad, this.arena.y + this.arena.h - innerPad);

      // Redraw soul (tint gold when slowed)
      if (this.playerSlowed) {
        this.soul.clear();
        this.soul.fillStyle(0xf7c948, 0.8);
        this.soul.lineStyle(1, 0xffffff, 0.8);
        this.soul.fillCircle(0, 2, this.soulRadius);
        this.soul.strokeCircle(0, 2, this.soulRadius);
        this.soul.fillTriangle(-4, 2, 4, 2, 0, -8);
        this.soul.strokeTriangle(-4, 2, 4, 2, 0, -8);
      } else {
        this.drawSoul();
      }

      // --- Bullet Graphics Setup ---
      if (!this.bulletGraphics) {
        this.bulletGraphics = this.add.graphics();
      }
      this.bulletGraphics.clear();

      // =============================================
      // ROSARY PENDULUMS — Draw & Collide
      // =============================================
      if (this.rosaryPendulums && this.rosaryPendulums.length > 0) {
        for (let pi = 0; pi < this.rosaryPendulums.length; pi++) {
          const p = this.rosaryPendulums[pi];
          if (!p.active) continue;

          if (p.swingState === "HOLD") {
            p.holdDelay -= delta / 1000;
            if (p.holdDelay <= 0) {
              p.swingState = "SWING";
              p.swingProgress = 0;

              if (p.isInitialHold) {
                p.isInitialHold = false;
              } else {
                // Swap start and end angles for return swing
                const temp = p.startAngle;
                p.startAngle = p.endAngle;
                p.endAngle = temp;

                // Randomly change the missing bead index for the next swing!
                p.missingBeadIndex = Phaser.Math.Between(2, 4);
              }
            }
          } else if (p.swingState === "SWING") {
            p.swingProgress += (delta / 1000) / (p.swingDuration / 1000);
            if (p.swingProgress >= 1.0) {
              p.swingProgress = 1.0;
              p.swingState = "HOLD";
              p.holdDelay = 1.3; // More delay (1.3s) before swinging back
            }
          }

          const isHolding = p.swingState === "HOLD";
          // Smooth sine ease-in-out for realistic pendulum acceleration/deceleration
          const t = p.swingProgress;
          const easeT = (1 - Math.cos(t * Math.PI)) / 2;
          const swingAngle = p.startAngle + (p.endAngle - p.startAngle) * easeT;

          // Track angles for smooth motion blur trail
          if (!isHolding) {
            p.angleHistory.push(swingAngle);
            if (p.angleHistory.length > 4) {
              p.angleHistory.shift();
            }
          } else {
            if (p.angleHistory.length > 0) {
              p.angleHistory.shift();
            }
          }

          // Step 1: Draw continuous unbroken wire path from anchor to tip
          const wireAlpha = isHolding ? 0.8 : 0.4;
          this.bulletGraphics.lineStyle(2, 0xf7c948, wireAlpha);
          this.bulletGraphics.beginPath();
          this.bulletGraphics.moveTo(p.anchorX, p.anchorY);

          for (let i = 0; i < p.numBeads; i++) {
            const dist = (i + 1) * p.segmentLength;
            const wx = p.anchorX + dist * Math.sin(swingAngle);
            const wy = p.anchorY + dist * Math.cos(swingAngle);
            this.bulletGraphics.lineTo(wx, wy);
          }
          this.bulletGraphics.strokePath();

          // Step 1.5: Draw smooth motion blur trail for beads
          for (let th = 0; th < p.angleHistory.length; th++) {
            const hAngle = p.angleHistory[th];
            const trailAlpha = (th + 1) / (p.angleHistory.length + 1) * 0.12;
            this.bulletGraphics.fillStyle(0xf7c948, trailAlpha);

            for (let i = 0; i < p.numBeads; i++) {
              if (i === p.missingBeadIndex || i === p.missingBeadIndex + 1) continue;
              const dist = (i + 1) * p.segmentLength;
              const bx = p.anchorX + dist * Math.sin(hAngle);
              const by = p.anchorY + dist * Math.cos(hAngle);

              if (i === p.numBeads - 1) {
                const cs = 5;
                this.bulletGraphics.fillRect(bx - 1, by - cs, 2, cs * 2);
                this.bulletGraphics.fillRect(bx - cs, by - 1, cs * 2, 2);
              } else {
                this.bulletGraphics.fillCircle(bx, by, p.beadRadius - 1);
              }
            }
          }

          // Step 2: Draw beads, safe gap marker, and crucifix pendant
          for (let i = 0; i < p.numBeads; i++) {
            const dist = (i + 1) * p.segmentLength;
            const bx = p.anchorX + dist * Math.sin(swingAngle);
            const by = p.anchorY + dist * Math.cos(swingAngle);

            if (i === p.missingBeadIndex || i === p.missingBeadIndex + 1) {
              // Draw hollow safe gap indicator ring ( )
              const gapAlpha = isHolding ? 0.9 : 0.6;
              this.bulletGraphics.lineStyle(2, 0xffffff, gapAlpha);
              this.bulletGraphics.strokeCircle(bx, by, p.beadRadius + 2);
              continue;
            }

            if (i === p.numBeads - 1) {
              // Draw glowing crucifix cross pendant at tip (✝)
              const cs = 7;
              this.bulletGraphics.fillStyle(0xf7c948, 1);
              this.bulletGraphics.fillRect(bx - 2, by - cs, 4, cs * 2);
              this.bulletGraphics.fillRect(bx - cs, by - 2, cs * 2, 4);
              this.bulletGraphics.fillStyle(0xffffff, 0.9);
              this.bulletGraphics.fillCircle(bx, by, 3);
            } else {
              // Draw main large golden bead
              this.bulletGraphics.fillStyle(0xf7c948, 0.2);
              this.bulletGraphics.fillCircle(bx, by, p.beadRadius + 4);

              this.bulletGraphics.fillStyle(0xf7c948, 0.95);
              this.bulletGraphics.fillCircle(bx, by, p.beadRadius);

              this.bulletGraphics.fillStyle(0xffffff, 0.85);
              this.bulletGraphics.fillCircle(bx, by, p.beadRadius * 0.4);
            }

            // Collision check with fair hitbox radius (active after hold delay)
            if (this.soul && !isHolding) {
              const d = Phaser.Math.Distance.Between(this.soul.x, this.soul.y, bx, by);
              if (d < this.soulRadius + (p.hitboxRadius || 7)) {
                this.triggerHit();
                return;
              }
            }
          }
        }
      }

      // =============================================
      // DIVINE CROSS — Draw, Pulse, Shoot & Collide
      // =============================================
      if (this.divineCross) {
        const cross = this.divineCross;

        // Draw cross shape
        const s = cross.size;
        // Golden glow aura
        this.bulletGraphics.fillStyle(0xf7c948, 0.1);
        this.bulletGraphics.fillCircle(cross.x, cross.y, s + 15);

        // Vertical arm
        this.bulletGraphics.lineStyle(4, 0xf7c948, 0.9);
        this.bulletGraphics.beginPath();
        this.bulletGraphics.moveTo(cross.x, cross.y - s);
        this.bulletGraphics.lineTo(cross.x, cross.y + s);
        this.bulletGraphics.strokePath();

        // Horizontal arm
        this.bulletGraphics.beginPath();
        this.bulletGraphics.moveTo(cross.x - s, cross.y);
        this.bulletGraphics.lineTo(cross.x + s, cross.y);
        this.bulletGraphics.strokePath();

        // White center
        this.bulletGraphics.fillStyle(0xffffff, 0.85);
        this.bulletGraphics.fillCircle(cross.x, cross.y, 4);

        if (cross.active) {
          // Pulse timer
          cross.pulseTimer += delta;
          if (cross.pulseTimer >= cross.pulseInterval) {
            cross.pulseTimer = 0;
            // Add visual pulse ring
            cross.pulseRings.push({ radius: 10, alpha: 0.9 });
            // Slow pulse affects the entire arena
            if (this.soul) {
              this.playerSlowed = true;
              this.slowTimer = 1200;
            }
            // Flash box border gold briefly to indicate area-wide slow pulse
            this.flashBoxColor(0xf7c948);
          }

          // Draw expanding pulse rings (expanding across whole arena)
          for (let ri = cross.pulseRings.length - 1; ri >= 0; ri--) {
            const ring = cross.pulseRings[ri];
            ring.radius += 280 * (delta / 1000);
            ring.alpha -= 0.7 * (delta / 1000);
            if (ring.alpha <= 0 || ring.radius > 400) {
              cross.pulseRings.splice(ri, 1);
            } else {
              this.bulletGraphics.lineStyle(3, 0xf7c948, ring.alpha);
              this.bulletGraphics.strokeCircle(cross.x, cross.y, ring.radius);
            }
          }

          // Shoot accelerating holy orbs at player (only when not in desperation mode)
          if (!this.isDesperation) {
            cross.shootTimer += delta;
            if (cross.shootTimer >= cross.shootInterval && this.soul) {
              cross.shootTimer = 0;
              const angle = Phaser.Math.Angle.Between(cross.x, cross.y, this.soul.x, this.soul.y);
              const initialSpeed = 20;
              this.bullets.push({
                x: cross.x,
                y: cross.y,
                vx: Math.cos(angle) * initialSpeed,
                vy: Math.sin(angle) * initialSpeed,
                speed: initialSpeed,
                accel: 175,
                radius: 8,
                color: 0xf7c948,
                isAccelerating: true
              });
            }
          }

          // Cross body collision
          if (this.soul) {
            const dist = Phaser.Math.Distance.Between(this.soul.x, this.soul.y, cross.x, cross.y);
            if (dist < 8) {
              this.triggerHit();
              return;
            }
            // Arm collision (check if soul is near the cross arms)
            if (Math.abs(this.soul.x - cross.x) < 4 && this.soul.y > cross.y - s && this.soul.y < cross.y + s) {
              this.triggerHit();
              return;
            }
            if (Math.abs(this.soul.y - cross.y) < 4 && this.soul.x > cross.x - s && this.soul.x < cross.x + s) {
              this.triggerHit();
              return;
            }
          }
        }
      }

      // =============================================
      // BULLET PHYSICS & COLLISION
      // =============================================
      if (!this.bulletTrails) this.bulletTrails = [];

      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i];

        // Life check
        if (b.life !== undefined) {
          b.life -= delta;
          if (b.life <= 0) {
            this.bullets.splice(i, 1);
            if (b.onExplode) b.onExplode(b.x, b.y);
            continue;
          }
        }

        // Candle flame sway
        if (b.isCandleFlame) {
          b.swayPhase = (b.swayPhase || 0) + 3 * (delta / 1000);
          b.x += Math.sin(b.swayPhase) * 0.8;
        }

        // Acceleration behavior for Divine Cross Holy Orbs
        if (b.isAccelerating) {
          b.speed += (b.accel || 140) * (delta / 1000);
          const currentDir = Math.atan2(b.vy, b.vx);
          b.vx = Math.cos(currentDir) * b.speed;
          b.vy = Math.sin(currentDir) * b.speed;
        }

        // Homing behavior
        if (b.isHoming && this.soul) {
          const angle = Phaser.Math.Angle.Between(b.x, b.y, this.soul.x, this.soul.y);
          if (b.homingTurnSpeed) {
            const currentAngle = Math.atan2(b.vy, b.vx);
            const newAngle = Phaser.Math.Angle.RotateTo(currentAngle, angle, b.homingTurnSpeed * (delta / 1000));
            b.vx = Math.cos(newAngle) * b.speed;
            b.vy = Math.sin(newAngle) * b.speed;
          } else if (b.homingSpeed) {
            const targetVx = Math.cos(angle) * b.homingSpeed;
            const targetVy = Math.sin(angle) * b.homingSpeed;
            b.vx += (targetVx - b.vx) * 0.04;
            b.vy += (targetVy - b.vy) * 0.04;
          }
        }

        b.x += b.vx * (delta / 1000);
        b.y += b.vy * (delta / 1000);

        // Store trail
        if (!b.trail) b.trail = [];
        b.trailTimer = (b.trailTimer || 0) + delta;
        if (b.trailTimer > 40) {
          b.trail.push({ x: b.x, y: b.y, alpha: 0.5 });
          if (b.trail.length > 3) b.trail.shift();
          b.trailTimer = 0;
        }

        const color = b.color || 0xf7c948;

        // Draw trail afterimages
        for (let t = 0; t < b.trail.length; t++) {
          const tr = b.trail[t];
          const trailAlpha = (t + 1) / (b.trail.length + 1) * 0.35;
          const trailSize = b.radius * (0.4 + (t / b.trail.length) * 0.4);
          this.bulletGraphics.fillStyle(color, trailAlpha);
          this.bulletGraphics.fillCircle(tr.x, tr.y, trailSize);
        }

        // Outer glow aura
        this.bulletGraphics.fillStyle(color, 0.2);
        this.bulletGraphics.fillCircle(b.x, b.y, b.radius + 4);

        // Main orb body
        this.bulletGraphics.fillStyle(color, 0.9);
        this.bulletGraphics.fillCircle(b.x, b.y, b.radius);

        // White hot core
        this.bulletGraphics.fillStyle(0xffffff, 0.85);
        this.bulletGraphics.fillCircle(b.x, b.y, b.radius * 0.45);

        // Collision
        if (this.soul) {
          const dist = Phaser.Math.Distance.Between(this.soul.x, this.soul.y, b.x, b.y);
          if (dist < this.soulRadius + b.radius) {
            this.triggerHit();
            return;
          }
        }

        // Bouncing behavior off arena borders
        if (b.bounces && b.bounces > 0) {
          if (b.x < this.arena.x || b.x > this.arena.x + this.arena.w) {
            b.vx *= -1;
            b.x = Phaser.Math.Clamp(b.x, this.arena.x + 2, this.arena.x + this.arena.w - 2);
            b.bounces--;
          }
          if (b.y < this.arena.y || b.y > this.arena.y + this.arena.h) {
            b.vy *= -1;
            b.y = Phaser.Math.Clamp(b.y, this.arena.y + 2, this.arena.y + this.arena.h - 2);
            b.bounces--;
          }
        } else if (b.x < this.boxCenterX - this.boxWidth / 2 - 30 || b.x > this.boxCenterX + this.boxWidth / 2 + 30 ||
                   b.y > this.boxCenterY + 160) {
          this.bullets.splice(i, 1);
        }
      }

      // =============================================
      // PRAYER BEAMS — Draw & Collide
      // =============================================
      if (this.prayerBeams && this.prayerBeams.length > 0) {
        for (let i = this.prayerBeams.length - 1; i >= 0; i--) {
          const beam = this.prayerBeams[i];
          beam.life -= delta;
          if (beam.life <= 0) {
            this.prayerBeams.splice(i, 1);
            continue;
          }

          const alpha = Math.min(1, beam.life / 200);

          // Draw glow
          this.bulletGraphics.lineStyle(8, 0xf7c948, alpha * 0.2);
          this.bulletGraphics.beginPath();
          this.bulletGraphics.moveTo(beam.x1, beam.y1);
          this.bulletGraphics.lineTo(beam.x2, beam.y2);
          this.bulletGraphics.strokePath();

          // Draw core beam
          this.bulletGraphics.lineStyle(3, 0xffffff, alpha * 0.9);
          this.bulletGraphics.beginPath();
          this.bulletGraphics.moveTo(beam.x1, beam.y1);
          this.bulletGraphics.lineTo(beam.x2, beam.y2);
          this.bulletGraphics.strokePath();

          // Collision
          if (this.soul) {
            const dist = this.pointToLineDistance(this.soul.x, this.soul.y, beam.x1, beam.y1, beam.x2, beam.y2);
            if (dist < this.soulRadius + 3) {
              this.triggerHit();
              return;
            }
          }
        }
      }

      // =============================================
      // ACTIVE LASER COLLISION
      // =============================================
      if (this.activeLasers) {
        this.activeLasers.forEach(laser => {
          if (!laser || !laser.active) return;
          if (laser.width > laser.height) {
            if (Math.abs(this.soul.y - laser.y) < 6) this.triggerHit();
          } else {
            if (Math.abs(this.soul.x - laser.x) < 6) this.triggerHit();
          }
        });
      }

      // =============================================
      // LASER PHYSICS & COLLISION
      // =============================================
      for (let i = this.lasers.length - 1; i >= 0; i--) {
        const l = this.lasers[i];
        l.life -= delta;

        if (l.x !== undefined && l.y !== undefined && l.w !== undefined && l.h !== undefined) {
          const testX = Math.max(l.x, Math.min(this.soul.x, l.x + l.w));
          const testY = Math.max(l.y, Math.min(this.soul.y, l.y + l.h));

          const dist = Phaser.Math.Distance.Between(this.soul.x, this.soul.y, testX, testY);
          if (dist < this.soulRadius) {
            this.triggerHit();
            return;
          }
        }

        if (l.life <= 0) {
          if (l.graphics) l.graphics.destroy();
          this.lasers.splice(i, 1);
        } else if (l.graphics) {
          l.graphics.alpha = Math.min(1, l.life / 200);
        }
      }
    }
  }

  triggerHit() {
    this.cleanupProjectiles();
    this.state = "HIT_PAUSE";

    this.soulHP--;
    this.updateSoulHPUI();

    const flash = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0xff0000, 0.5);

    this.time.delayedCall(180, () => {
      flash.destroy();

      if (this.soulHP <= 0) {
        this.handlePlayerDeath();
      } else {
        this.retryAttempt++;
        this.dialogueText.setVisible(false);
        this.questionText.setVisible(false);
        this.tweenBoxHeight(this.HEIGHT_RIDDLE, () => {
          this.startRiddlePhase();
        });
      }
    });
  }

  handlePlayerDeath() {
    this.cleanupProjectiles();
    this.state = "DEAD_SCREEN";
    if (this.soul) {
      this.soul.clear();
      this.soul.destroy();
      this.soul = null;
    }

    this.dialogueText.setVisible(false);
    this.questionText.setVisible(false);

    // Fade to dark
    const blackBg = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 1.0);
    blackBg.setInteractive(); // consume clicks

    const deathText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 80, "The Echoes have consumed you", {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "28px",
      color: "#ff0000"
    }).setOrigin(0.5).setShadow(0, 0, '#ff4444', 10, true, true);

    this.tweens.add({
      targets: deathText,
      alpha: { from: 1, to: 0.5 },
      scale: { from: 1, to: 1.05 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const btnW = 220;
    const btnH = 50;
    const btnX = this.scale.width / 2;
    const btnY = this.scale.height / 2 + 40;

    const btnBg = this.add.rectangle(btnX, btnY, btnW, btnH, 0x111111).setStrokeStyle(3, 0xffffff);
    btnBg.setInteractive({ useHandCursor: true });

    const respawnBtn = this.add.text(btnX, btnY, "RESPAWN", {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "18px",
      color: "#ffffff"
    }).setOrigin(0.5);

    btnBg.on("pointerover", () => {
      btnBg.setFillStyle(0x333333);
      btnBg.setStrokeStyle(3, 0xf7c948);
      respawnBtn.setColor("#f7c948");
    });
    btnBg.on("pointerout", () => {
      btnBg.setFillStyle(0x111111);
      btnBg.setStrokeStyle(3, 0xffffff);
      respawnBtn.setColor("#ffffff");
    });
    btnBg.on("pointerdown", () => {
      if (this.onDeathCallback) {
        this.onDeathCallback();
      } else {
        this.scene.restart();
      }
    });
  }

  handlePause() {
    if (this.state === "DEAD" || this.state === "DEAD_SCREEN" || this.state === "VICTORY") return;
    this.scene.pause();
    this.scene.launch("PauseScene", { parentScene: this });
  }
}



