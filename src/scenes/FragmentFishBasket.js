import Phaser from "phaser";
import { getEssence, setEssence } from "../save.js";
import { AudioManager } from "../utils/audioManager.js";
import { AUDIO_SETTINGS } from "../utils/audioSettings.js";

export class FragmentFishBasket extends Phaser.Scene {
  constructor() {
    super("fragment-fish-basket");
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

    this.soulName = data.soulName || "The Old Fisherman";
    this.dodgeLines = data.dodgeLines || [
      "The tides will not wait for you...",
      "Respect the deep ocean currents.",
      "Hold fast against the storm!"
    ];
    this.onCompleteCallback = data.onComplete;
    this.onDeathCallback = data.onDeath;
    this.bgKey = (data && (data.bgKey || data.bgImage)) || "bg-fish-basket";

    this.crystalHP = 6;
    this.maxCrystalHP = 6;
    this.soulHP = 5;
    this.retryAttempt = 0;
    this.hasSeenPhase2NewPattern = false;
    this.state = "INIT";
  }

  preload() {
    if (!this.textures.exists("bg-fish-basket")) {
      this.load.image("bg-fish-basket", "src/assets/grave1-elements/bullet-scenes/fish-basket.png");
    }
    if (!this.textures.exists("fragment-main")) {
      this.load.spritesheet("fragment-main", "src/assets/fragment-main.png", {
        frameWidth: 16,
        frameHeight: 16,
      });
    }
  }

  getDefaultRiddles() {
    return [
      {
        question: "Before I return to the shore, what holds my hard-earned catch from the depths? What am I?",
        choices: ["A) Fish Basket", "B) Anchor", "C) Fishing Hook", "D) Compass"],
        answer: "A) Fish Basket"
      },
      {
        question: "Woven from bamboo and rattan, I carry the sea's bounty on my back. What am I?",
        choices: ["A) Fish Basket", "B) Sail", "C) Fishing Net", "D) Wooden Paddle"],
        answer: "A) Fish Basket"
      },
      {
        question: "Through storms and calm tides, I am filled with silvery scales. What am I?",
        choices: ["A) Fish Basket", "B) Lantern", "C) Wooden Chest", "D) Shell"],
        answer: "A) Fish Basket"
      },
      {
        question: "I let the ocean water drain out, but keep the nourishment within. What am I?",
        choices: ["A) Fish Basket", "B) Bucket", "C) Glass Bottle", "D) Fishing Rod"],
        answer: "A) Fish Basket"
      },
      {
        question: "When the old fisherman rested his weary arms, he placed me beside the dock. What am I?",
        choices: ["A) His fish basket", "B) His boat", "C) His boots", "D) His knife"],
        answer: "A) His fish basket"
      }
    ];
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;

    this.sound.sounds.forEach(s => {
      if (s.key !== "fish-basket-boss" && s.isPlaying && s.loop) {
        s.stop();
      }
    });
    this.audioManager = new AudioManager(this, "fish-basket-boss");

    const bg = this.add.rectangle(centerX, height / 2, width, height, 0x050508, 1.0);
    bg.setInteractive();

    this.bg = this.add.image(this.scale.width / 2, this.scale.height / 2, this.bgKey);
    this.bg.setDisplaySize(this.scale.width, this.scale.height);
    this.bg.setAlpha(0.6);

    this.boxCenterX = centerX;
    this.boxWidth = 480;
    this.boxCenterY = 270;
    this.boxHeight = 10;

    this.HEIGHT_DIALOGUE = 130;
    this.HEIGHT_RIDDLE = 130;
    this.HEIGHT_DODGE = 260;

    this.boxGraphics = this.add.graphics();

    this.bullets = [];
    this.bulletTrails = [];
    this.lasers = [];
    this.activeLasers = [];
    this.activeWarnings = [];
    this.patternTimers = [];

    // Custom fish basket pattern objects
    this.jellyfishes = [];
    this.urchins = [];
    this.anchors = [];
    this.nets = [];
    this.tidalWaves = [];

    this.soulRadius = 4;
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,S,A,D");

    // Global pause listeners
    this.input.keyboard.on('keydown-P', this.handlePause, this);
    this.input.keyboard.on('keydown-ESC', this.handlePause, this);

    this.createCrystalHPUI(centerX);
    this.createSoulHPUI(centerX);
    this.createRiddleUI(centerX);

    this.updateArenaBounds();
    this.drawBox();

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
      color: "#43b5e8"
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
        this.crystalIcons[i].setTint(0x43b5e8); // Golden intact
        this.crystalIcons[i].setAlpha(1.0);
      } else {
        this.crystalIcons[i].setTint(0x333333); // Dark grey shattered
        this.crystalIcons[i].setAlpha(0.4);
      }
    }
  }

  shatterCrystalParticle(targetX, targetY) {
    for (let i = 0; i < 16; i++) {
      const p = this.add.rectangle(targetX, targetY, 4, 4, 0x43b5e8);
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
        const targetAnswer = this.currentRiddle ? this.currentRiddle.answer : "";
        this.handleAnswer(btnText.text, targetAnswer);
      });

      this.buttons.push({ bg: btnBg, text: btnText });
    }

    // Timer Bar
    const centerXTimer = centerX;
    const timerY = 410;
    this.timerBarBg = this.add.rectangle(centerXTimer, timerY, 480, 10, 0x000000);
    this.timerBarBg.setStrokeStyle(2, 0xffffff);

    this.timerBarFill = this.add.rectangle(centerXTimer - 240, timerY, 480, 10, 0x43b5e8).setOrigin(0, 0.5);
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

      const introLine = `"${this.soulName} blocks your path with the scent of the deep sea."`;
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

    this.cleanupProjectiles();
    if (this.soul) {
      this.soul.clear();
      this.soul.destroy();
      this.soul = null;
    }

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
      if (this.buttons[i]) {
        this.buttons[i].text.setText(choiceText);
        this.buttons[i].bg.setFillStyle(0x25282e);
        this.buttons[i].text.setColor("#f7e8c3");
        this.buttons[i].bg.setStrokeStyle(2, 0x8c6a49);
      }
    });

    this.setChoiceButtonsState("HIDDEN");
    this.setRiddleUIElementsVisible(false);

    this.typewriterText(this.questionText, this.currentRiddle.question, 16, () => {
      this.state = "RIDDLE";
      const durations = [18000, 14000, 10000, 8000];
      this.phaseTimer = durations[Math.min(this.retryAttempt, 3)];
      this.maxPhaseTimer = this.phaseTimer;

      this.timerBarFill.width = 480;
      this.timerBarFill.setFillStyle(0x43b5e8);
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
        clickedBtn.bg.setFillStyle(0x43b5e8);
        clickedBtn.text.setColor("#000000");
        clickedBtn.bg.setStrokeStyle(3, 0x43b5e8);
      }
      this.flashBoxColor(0x43b5e8);
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
    if (shatteredIcon) {
      this.shatterCrystalParticle(shatteredIcon.x, shatteredIcon.y);
    }

    this.crystalHP = Math.max(0, this.crystalHP - 1);
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
      "The salt water clears from your vision...",
      "A weathered basket takes shape.",
      "The ocean current subsides.",
      "The old fisherman nods in silence."
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

    this.crystalEnemy.setTint(0xff4444);
    this.crystalIdleTween.pause();
    this.crystalAngryTween.resume();

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

  startPatternsForPhase() {
    this.patternTimers = [];
    this.isDesperation = false;
    const phase = this.getCurrentPhase();

    if (phase === 1) {
      // Base 1, 2, 3: Jellyfish Float, Sea Urchin Burst, Anchor Bomb
      const pool = [1, 2, 3];
      this.executePattern(Phaser.Utils.Array.GetRandom(pool));
    } else if (phase === 2) {
      let choice;
      if (!this.hasSeenPhase2NewPattern) {
        choice = Phaser.Utils.Array.GetRandom([4, 5]);
        this.hasSeenPhase2NewPattern = true;
      } else {
        choice = Phaser.Utils.Array.GetRandom([1, 2, 3, 4, 5]);
      }
      this.executePattern(choice);
    } else if (phase === 3) {
      this.isDesperation = true;
      this.phaseTimer = 14000;
      this.maxPhaseTimer = 14000;
      this.crystalEnemy.setTint(0xff1111);

      // Desperation: Maelstrom Pull is active alongside 1 of the other patterns
      this.executePattern(Phaser.Utils.Array.GetRandom([1, 2, 3, 4, 5]));
    }
  }

  executePattern(patternId) {
    const desp = this.isDesperation;
    const duration = desp ? 14000 : 10000;

    // ==========================================
    // ATTACK PATTERN TIMERS & INTERVAL ADJUSTMENTS
    // Edit the interval (ms) to make attacks spawn faster/slower
    // ==========================================
    if (patternId === 1) {
      // --- PATTERN 1: Jellyfish Float ---
      // Floating vertical jellyfish with trailing tentacles
      const interval = desp ? 1800 : 2200; // Time (ms) between waves
      for (let t = 0; t < duration; t += interval) {
        this.patternTimers.push(this.time.delayedCall(t, () => this.fireJellyfishWave()));
      }
    } else if (patternId === 2) {
      // --- PATTERN 2: Sea Urchin Burst ---
      // Spiky urchin spawns -> contracts -> bursts 360-degree thorns -> bounce & home
      const interval = desp ? 2000 : 2600; // Time (ms) between urchin spawns
      for (let t = 0; t < duration; t += interval) {
        this.patternTimers.push(this.time.delayedCall(t, () => this.spawnSeaUrchin()));
      }
    } else if (patternId === 3) {
      // --- PATTERN 3: Anchor Bomb ---
      // Heavy anchor drops with target telegraph -> hits floor -> 360-degree shockwave
      const interval = desp ? 2400 : 3200; // Time (ms) between anchor drops
      for (let t = 0; t < duration; t += interval) {
        this.patternTimers.push(this.time.delayedCall(t, () => this.dropAnchorBomb()));
      }
    } else if (patternId === 4) {
      // --- PATTERN 4: Bouncing Fishing Net Balls ---
      // Woven twine balls bounce around -> unbind into sticky hazard net patches
      const interval = desp ? 2400 : 3200; // Time (ms) between net ball bursts
      for (let t = 0; t < duration; t += interval) {
        this.patternTimers.push(this.time.delayedCall(t, () => this.dropFishingNet()));
      }
    } else if (patternId === 5) {
      // --- PATTERN 5: Tidal Wave Crash ---
      // Horizontal wave moving Left-to-Right with a tight vertical gap to dodge through
    const interval = desp ? 1500 : 2200; // Time (ms) between tidal waves
      for (let t = 0; t < duration; t += interval) {
        this.patternTimers.push(this.time.delayedCall(t, () => this.crashTidalWave()));
      }
    }
  }

  // ===================================================
  // ATTACK PATTERN SPAWN LOGIC & PARAMETERS (EDIT SPEED/COUNT HERE)
  // ===================================================

  // --- ATTACK 1: JELLYFISH WAVE ---
  fireJellyfishWave() {
    const desp = this.isDesperation;
    const count = desp ? 8 : 6;        // Number of jellyfish columns
    const gaps = desp ? 1 : 2;         // How many safe column gaps to leave
    const cols = 10;                   // Total vertical columns across arena
    const colW = this.arena.w / cols;

    let safeCols = [];
    let attempts = 0;
    while (safeCols.length < gaps && attempts < 50) {
      attempts++;
      const r = Phaser.Math.Between(1, cols - 2);
      if (!safeCols.includes(r) && !safeCols.includes(r - 1) && !safeCols.includes(r + 1)) {
        safeCols.push(r);
      }
    }

    for (let i = 0; i < cols; i++) {
      if (safeCols.includes(i)) continue;
      const jx = this.arena.x + colW * (i + 0.5);
      const jy = this.arena.y + this.arena.h + 20;
      const speed = desp ? -55 : -45;  // Float speed (negative = upward)

      this.jellyfishes.push({
        active: true,
        x: jx,
        y: jy,
        baseX: jx,
        vy: speed,
        phase: Math.random() * Math.PI * 2,
        tentacleCount: desp ? 3 : 2    // Length/number of tentacle segments
      });
    }
  }

  // --- ATTACK 2: SEA URCHIN BURST ---
  spawnSeaUrchin() {
    const desp = this.isDesperation;
    const count = desp ? 2 : 1;        // How many urchins spawn at once

    for (let c = 0; c < count; c++) {
      const ux = Phaser.Math.Between(this.arena.x + 40, this.arena.x + this.arena.w - 40);
      const uy = Phaser.Math.Between(this.arena.y + 40, this.arena.y + this.arena.h - 40);

      const urchin = {
        active: true,
        x: ux,
        y: uy,
        timer: 1.5,                    // Seconds before bursting into thorns
        spines: desp ? 6 : 6,          // Number of radial thorn projectiles in 360 ring
        fired: false
      };
      this.urchins.push(urchin);
    }
  }

  // --- ATTACK 3: ANCHOR BOMB ---
  dropAnchorBomb() {
    const desp = this.isDesperation;
    const targetX = this.soul ? this.soul.x : this.arena.x + this.arena.w / 2;

    this.anchors.push({
      active: true,
      x: Phaser.Math.Clamp(targetX, this.arena.x + 30, this.arena.x + this.arena.w - 30),
      y: this.arena.y - 25,
      vy: desp ? 220 : 175,            // Fall speed of the anchor
      targetY: this.arena.y + this.arena.h - 15,
      detonated: false,
      shockwaveCount: desp ? 28 : 25,  // Number of bullets in floor shockwave ring
      bounces: 0
    });
  }

  // --- ATTACK 4: BOUNCING NET BALLS ---
  dropFishingNet() {
    const desp = this.isDesperation;
    const count = desp ? 6 : 4;        // Number of bouncing net balls

    for (let c = 0; c < count; c++) {
      const nx = Phaser.Math.Between(this.arena.x + 40, this.arena.x + this.arena.w - 40);
      const ny = this.arena.y - 20;
      const ang = Phaser.Math.Between(30, 150) * (Math.PI / 180);
      const speed = desp ? 160 : 145; // Movement speed of net balls
      
      this.nets.push({
        active: true,
        x: nx,
        y: ny,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        state: "BALL",
        patchTimer: 0,                // Duration lingering on wall as hazard patch
        radius: 10                    // Radius of net ball
      });
    }
  }

  // --- ATTACK 5: TIDAL WAVE CRASH ---
  crashTidalWave() {
    const desp = this.isDesperation;
    const gapHeight = desp ? 3 : 4;   // Height of the safe gap (in rows)
    const rows = 18;                   // Total vertical rows across arena
    const startGap = Phaser.Math.Between(1, rows - 1 - gapHeight);
    let safeRows = [];
    for (let i = 0; i < gapHeight; i++) safeRows.push(startGap + i);

    this.tidalWaves.push({
      active: true,
      x: this.arena.x - 20,
      vx: desp ? 130 : 95,             // Left-to-right wave speed
      safeRows: safeRows,
      rows: rows
    });
  }

  spawnBullet(x, y, vx, vy, radius = 4, color = 0x2dd4bf, bounces = 0) {
    this.bullets.push({
      active: true,
      x, y, vx, vy, radius, color, bounces
    });
  }

  cleanupProjectiles() {
    if (this.patternTimers && this.patternTimers.length > 0) {
      this.patternTimers.forEach(t => { if (t && typeof t.remove === "function") t.remove(); });
      this.patternTimers = [];
    }
    this.bullets = [];
    this.jellyfishes = [];
    this.urchins = [];
    this.anchors = [];
    this.nets = [];
    this.tidalWaves = [];
    if (this.bulletGraphics) this.bulletGraphics.clear();
  }

  update(time, delta) {
    if (this.state === "RIDDLE") {
      this.phaseTimer -= delta;
      this.timerBarFill.width = 480 * Math.max(0, this.phaseTimer / this.maxPhaseTimer);
      this.timerBarFill.setFillStyle(0x43b5e8);

      if (this.phaseTimer <= 0) {
        this.startTryAgainDialogue();
      }
    } else if (this.state === "DODGE") {
      this.phaseTimer -= delta;

      if (this.phaseTimer <= 0) {
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

      if (!this.soul) return;
      let speed = 200 * (delta / 1000);

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

      // --- Desperation: Maelstrom Pull ---
      if (this.isDesperation) {
        const cx = this.arena.x + this.arena.w / 2;
        const cy = this.arena.y + this.arena.h / 2;
        const angleToCenter = Math.atan2(cy - this.soul.y, cx - this.soul.x);
        const pullSpeed = 35 * (delta / 1000);
        vx += Math.cos(angleToCenter) * pullSpeed;
        vy += Math.sin(angleToCenter) * pullSpeed;
      }

      this.soul.x += vx;
      this.soul.y += vy;

      const innerPad = this.soulRadius + 6;
      this.soul.x = Phaser.Math.Clamp(this.soul.x, this.arena.x + innerPad, this.arena.x + this.arena.w - innerPad);
      this.soul.y = Phaser.Math.Clamp(this.soul.y, this.arena.y + innerPad, this.arena.y + this.arena.h - innerPad);
      this.drawSoul();

      if (!this.bulletGraphics) this.bulletGraphics = this.add.graphics();
      this.bulletGraphics.clear();

      const timeSec = time / 1000;
      const dtSec = delta / 1000;

      // 1. Draw & Update Desperation Maelstrom Vortex
      if (this.isDesperation) {
        const cx = this.arena.x + this.arena.w / 2;
        const cy = this.arena.y + this.arena.h / 2;
        const maxR = Math.max(this.arena.w, this.arena.h) / 2;
        this.bulletGraphics.fillStyle(0x0e7490, 0.1 + Math.sin(timeSec * 3) * 0.04);
        this.bulletGraphics.fillCircle(cx, cy, maxR);
        this.bulletGraphics.lineStyle(1, 0x43b5e8, 0.2);
        this.bulletGraphics.strokeCircle(cx, cy, maxR);

        for (let arm = 0; arm < 5; arm++) {
          for (let step = 1; step <= 30; step++) {
            const r = 10 + step * (maxR / 30);
            if (r > maxR) continue;
            const ang = arm * (Math.PI * 2 / 5) + timeSec * 1.5 + step * 0.15;
            const dotX = cx + r * Math.cos(ang);
            const dotY = cy + r * Math.sin(ang);
            if (dotX >= this.arena.x && dotX <= this.arena.x + this.arena.w &&
                dotY >= this.arena.y && dotY <= this.arena.y + this.arena.h) {
              this.bulletGraphics.fillStyle(0xccfbf1, 0.25);
              this.bulletGraphics.fillCircle(dotX, dotY, 1.5 + (step / 10));
            }
          }
        }
      }

      // ==========================================================
      // ATTACK PATTERN UPDATE & DRAWING LOOPS (EDIT VISUALS/HITBOXES)
      // ==========================================================

      // --- ATTACK 1: JELLYFISH WAVE UPDATE & DRAW ---
      for (let i = this.jellyfishes.length - 1; i >= 0; i--) {
        const jf = this.jellyfishes[i];
        if (!jf || !jf.active) continue;

        jf.y += jf.vy * dtSec;
        jf.x = jf.baseX + Math.sin(timeSec * 2 + jf.phase) * 12; // 12 = horizontal sway width

        if (jf.y < this.arena.y - 40) {
          jf.active = false;
          this.jellyfishes.splice(i, 1);
          continue;
        }

        // Render dome
        this.bulletGraphics.fillStyle(0x43b5e8, 0.7);
        this.bulletGraphics.fillCircle(jf.x, jf.y, 10);
        this.bulletGraphics.lineStyle(1, 0xccfbf1, 0.3);
        this.bulletGraphics.strokeCircle(jf.x, jf.y, 12);
        this.bulletGraphics.fillStyle(0xffffff, 0.6);
        this.bulletGraphics.fillCircle(jf.x, jf.y - 2, 3);

        // Tentacles & collision
        let hit = false;
        if (Phaser.Math.Distance.Between(this.soul.x, this.soul.y, jf.x, jf.y) < 10 + this.soulRadius) hit = true;

        for (let t = 1; t <= jf.tentacleCount; t++) {
          const tx1 = jf.x - 4 + Math.sin(timeSec * 4 + t) * 3;
          const ty1 = jf.y + t * 12;
          const tx2 = jf.x + 4 - Math.sin(timeSec * 4 + t) * 3;
          const ty2 = jf.y + t * 12;

          this.bulletGraphics.lineStyle(1, 0x43b5e8, 0.4);
          this.bulletGraphics.beginPath();
          this.bulletGraphics.moveTo(jf.x - 4, jf.y + 8);
          this.bulletGraphics.lineTo(tx1, ty1);
          this.bulletGraphics.moveTo(jf.x + 4, jf.y + 8);
          this.bulletGraphics.lineTo(tx2, ty2);
          this.bulletGraphics.strokePath();

          this.bulletGraphics.fillStyle(0xccfbf1, 0.8);
          this.bulletGraphics.fillCircle(tx1, ty1, 3);
          this.bulletGraphics.fillCircle(tx2, ty2, 3);

          if (Phaser.Math.Distance.Between(this.soul.x, this.soul.y, tx1, ty1) < 3 + this.soulRadius ||
              Phaser.Math.Distance.Between(this.soul.x, this.soul.y, tx2, ty2) < 3 + this.soulRadius) {
            hit = true;
          }
        }

        if (hit) { this.triggerPlayerHit(); return; }
      }

      // --- ATTACK 2: SEA URCHIN BURST UPDATE & DRAW ---
      for (let i = this.urchins.length - 1; i >= 0; i--) {
        const u = this.urchins[i];
        if (!u || !u.active) continue;

        u.timer -= dtSec;
        const pulseR = 14 + Math.sin(timeSec * 6) * 3; // Pulsing animation radius

        this.bulletGraphics.fillStyle(0x022c22, 1.0);
        this.bulletGraphics.fillCircle(u.x, u.y, 14);
        this.bulletGraphics.fillStyle(0x065f46, 0.8);
        this.bulletGraphics.fillCircle(u.x, u.y, 10);

        for (let sp = 0; sp < u.spines; sp++) {
          const ang = sp * (Math.PI * 2 / u.spines) + timeSec * 2;
          const innerR = 10;
          const outerR = 14 + pulseR * (u.timer < 0.5 ? 0.3 : 1.0);
          
          const tipX = u.x + Math.cos(ang) * outerR;
          const tipY = u.y + Math.sin(ang) * outerR;
          const leftX = u.x + Math.cos(ang + 0.3) * innerR;
          const leftY = u.y + Math.sin(ang + 0.3) * innerR;
          const rightX = u.x + Math.cos(ang - 0.3) * innerR;
          const rightY = u.y + Math.sin(ang - 0.3) * innerR;

          this.bulletGraphics.fillStyle(0x059669, 0.9);
          this.bulletGraphics.fillTriangle(tipX, tipY, leftX, leftY, rightX, rightY);
        }

        if (Phaser.Math.Distance.Between(this.soul.x, this.soul.y, u.x, u.y) < 16 + this.soulRadius) {
          this.triggerPlayerHit();
          return;
        }

        if (u.timer <= 0 && !u.fired) {
          u.fired = true;
          u.active = false;
          this.sound.play("sfx-dash", { volume: 0.4 });
          for (let sp = 0; sp < u.spines; sp++) {
            const ang = sp * (Math.PI * 2 / u.spines);
            this.bullets.push({
              active: true,
              x: u.x,
              y: u.y,
              vx: Math.cos(ang) * 90,   // Initial burst speed (straight line, no homing yet)
              vy: Math.sin(ang) * 90,
              radius: 6,                 // Bullet radius
              color: 0xa855f7,            // Purple color
              bounces: 1,                 // Bounces exactly once off the arena wall
              bounceHome: true,           // Homing activates AFTER the 1st bounce
              isArrow: true,              // Arrowhead/thorn visual
              homing: false,              // False until bounce occurs
              lifespan: 3.5               // Expires after 3.5 seconds
            });
          }
          this.urchins.splice(i, 1);
        }
      }

      // --- ATTACK 3: ANCHOR BOMB UPDATE & DRAW ---
      for (let i = this.anchors.length - 1; i >= 0; i--) {
        const a = this.anchors[i];
        if (!a || !a.active) continue;

        a.y += a.vy * dtSec;

        // Telegraph circle on floor
        const progress = Math.min(1, (a.y - (this.arena.y - 25)) / (a.targetY - (this.arena.y - 25)));
        const teleR = 5 + progress * 25;
        this.bulletGraphics.lineStyle(2, 0xff4444, 0.4 + progress * 0.4);
        this.bulletGraphics.strokeCircle(a.x, a.targetY, teleR);

        // Draw Anchor
        this.bulletGraphics.lineStyle(2, 0x43b5e8, 1);
        this.bulletGraphics.strokeCircle(a.x, a.y - 12, 5);
        this.bulletGraphics.fillStyle(0x43b5e8, 1);
        this.bulletGraphics.fillRect(a.x - 2, a.y - 7, 4, 20);
        this.bulletGraphics.fillRect(a.x - 10, a.y + 8, 20, 4);

        this.bulletGraphics.beginPath();
        this.bulletGraphics.arc(a.x - 8, a.y + 12, 5, Math.PI, Math.PI * 0.5, true);
        this.bulletGraphics.strokePath();
        this.bulletGraphics.beginPath();
        this.bulletGraphics.arc(a.x + 8, a.y + 12, 5, Math.PI * 0.5, 0, true);
        this.bulletGraphics.strokePath();

        if (Phaser.Math.Distance.Between(this.soul.x, this.soul.y, a.x, a.y) < 14 + this.soulRadius) {
          this.triggerPlayerHit();
          return;
        }

        if (a.y >= a.targetY) {
          a.active = false;
          this.cameras.main.shake(150, 0.008);
          this.sound.play("sfx-dash", { volume: 0.5 });
          const totalBullets = a.shockwaveCount;
          const gapSize = 4;
          const gapStart = Phaser.Math.Between(0, totalBullets - gapSize);
          for (let sp = 0; sp < totalBullets; sp++) {
            if (sp >= gapStart && sp < gapStart + gapSize) continue;
            const ang = sp * (Math.PI * 2 / totalBullets);
            this.spawnBullet(a.x, a.targetY, Math.cos(ang) * 135, Math.sin(ang) * 135, 5, 0x2dd4bf, 0);
          }
          this.anchors.splice(i, 1);
        }
      }      // --- ATTACK 4: BOUNCING NET BALLS UPDATE & DRAW ---
      for (let i = this.nets.length - 1; i >= 0; i--) {
        const net = this.nets[i];
        if (!net || !net.active) continue;

        if (net.state === "BALL") {
          net.x += net.vx * dtSec;
          net.y += net.vy * dtSec;
          
          let hitWall = false;
          if (net.x - net.radius < this.arena.x) { net.x = this.arena.x + net.radius; net.vx *= -1; hitWall = true; }
          else if (net.x + net.radius > this.arena.x + this.arena.w) { net.x = this.arena.x + this.arena.w - net.radius; net.vx *= -1; hitWall = true; }
          
          if (net.y - net.radius < this.arena.y) { net.y = this.arena.y + net.radius; net.vy *= -1; hitWall = true; }
          else if (net.y + net.radius > this.arena.y + this.arena.h) { net.y = this.arena.y + this.arena.h - net.radius; net.vy *= -1; hitWall = true; }

          if (hitWall) {
            net.state = "PATCH";
            net.patchTimer = 1.5;
          }

          this.bulletGraphics.fillStyle(0x78716c, 1.0);
          this.bulletGraphics.fillCircle(net.x, net.y, net.radius);
          this.bulletGraphics.lineStyle(2, 0xa8a29e, 0.8);
          this.bulletGraphics.beginPath();
          this.bulletGraphics.moveTo(net.x - 8, net.y - 8); this.bulletGraphics.lineTo(net.x + 8, net.y + 8);
          this.bulletGraphics.moveTo(net.x + 8, net.y - 8); this.bulletGraphics.lineTo(net.x - 8, net.y + 8);
          this.bulletGraphics.moveTo(net.x, net.y - 10); this.bulletGraphics.lineTo(net.x, net.y + 10);
          this.bulletGraphics.moveTo(net.x - 10, net.y); this.bulletGraphics.lineTo(net.x + 10, net.y);
          this.bulletGraphics.strokePath();

          if (Phaser.Math.Distance.Between(this.soul.x, this.soul.y, net.x, net.y) < net.radius + this.soulRadius) {
            this.triggerPlayerHit();
            return;
          }

        } else if (net.state === "PATCH") {
          net.patchTimer -= dtSec;
          if (net.patchTimer <= 0) {
            net.state = "BALL";
          }

          const patchR = 28;
          this.bulletGraphics.fillStyle(0x57534e, 0.4);
          this.bulletGraphics.fillCircle(net.x, net.y, patchR);
          this.bulletGraphics.lineStyle(1, 0xa8a29e, 0.6);
          
          this.bulletGraphics.beginPath();
          for (let p = -20; p <= 20; p += 8) {
            this.bulletGraphics.moveTo(net.x + p, net.y - patchR * 0.8);
            this.bulletGraphics.lineTo(net.x + p, net.y + patchR * 0.8);
            this.bulletGraphics.moveTo(net.x - patchR * 0.8, net.y + p);
            this.bulletGraphics.lineTo(net.x + patchR * 0.8, net.y + p);
          }
          this.bulletGraphics.strokePath();

          if (Phaser.Math.Distance.Between(this.soul.x, this.soul.y, net.x, net.y) < patchR + this.soulRadius) {
            this.triggerPlayerHit();
            return;
          }
        }
      }

      // --- ATTACK 5: TIDAL WAVE CRASH UPDATE & DRAW ---
      for (let i = this.tidalWaves.length - 1; i >= 0; i--) {
        const tw = this.tidalWaves[i];
        if (!tw || !tw.active) continue;

        tw.x += tw.vx * dtSec;
        if (tw.x > this.arena.x + this.arena.w + 30) {
          tw.active = false;
          this.tidalWaves.splice(i, 1);
          continue;
        }

        const rowH = this.arena.h / tw.rows;
        this.bulletGraphics.lineStyle(2, 0xccfbf1, 0.4);

        for (let r = 0; r < tw.rows; r++) {
          if (tw.safeRows.includes(r)) continue;
          const wy = this.arena.y + rowH * (r + 0.5);
          const wx = tw.x + Math.sin(r * 0.8 + timeSec * 4) * 8;

          this.bulletGraphics.fillStyle(0x2dd4bf, 0.9);
          this.bulletGraphics.fillCircle(wx, wy, 7);
          this.bulletGraphics.fillStyle(0xffffff, 0.5);
          this.bulletGraphics.fillCircle(wx - 2, wy - 3, 2);

          if (Phaser.Math.Distance.Between(this.soul.x, this.soul.y, wx, wy) < 7 + this.soulRadius) {
            this.triggerPlayerHit();
            return;
          }
        }
      }

      // 8. Update & Draw Standard & Homing Arrow Bullets
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i];
        if (!b || !b.active) continue;

        if (b.lifespan !== undefined) {
          b.lifespan -= dtSec;
          if (b.lifespan <= 0) {
            b.active = false;
            this.bullets.splice(i, 1);
            continue;
          }
        }

        if (b.homing && this.soul) {
          const targetAngle = Math.atan2(this.soul.y - b.y, this.soul.x - b.x);
          const currentAngle = Math.atan2(b.vy, b.vx);
          let diff = Phaser.Math.Angle.Wrap(targetAngle - currentAngle);
          const turnRate = b.turnRate || 0.05; // Turn rate (higher = sharper curve)
          const newAngle = currentAngle + diff * turnRate;
          const speed = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(newAngle) * speed;
          b.vy = Math.sin(newAngle) * speed;
        }

        b.x += b.vx * dtSec;
        b.y += b.vy * dtSec;

        let bounced = false;
        if (b.x - b.radius < this.arena.x) {
          b.x = this.arena.x + b.radius;
          b.vx *= -1;
          bounced = true;
        } else if (b.x + b.radius > this.arena.x + this.arena.w) {
          b.x = this.arena.x + this.arena.w - b.radius;
          b.vx *= -1;
          bounced = true;
        }

        if (b.y - b.radius < this.arena.y) {
          b.y = this.arena.y + b.radius;
          b.vy *= -1;
          bounced = true;
        } else if (b.y + b.radius > this.arena.y + this.arena.h) {
          b.y = this.arena.y + this.arena.h - b.radius;
          b.vy *= -1;
          bounced = true;
        }

        if (bounced) {
          if (b.bounces > 0) {
            b.bounces--;
            if (b.bounceHome && !b.homing) {
              b.homing = true;
              const speedMultiplier = b.speedMult || 1.25; // Post-bounce speed boost
              const speed = Math.hypot(b.vx, b.vy) * speedMultiplier;
              const ang = Math.atan2(b.vy, b.vx);
              b.vx = Math.cos(ang) * speed;
              b.vy = Math.sin(ang) * speed;
            }
          } else {
            b.active = false;
            this.bullets.splice(i, 1);
            continue;
          }
        }

        if (b.isArrow) {
          const ang = Math.atan2(b.vy, b.vx);
          const len = 12;
          const wid = 5;
          const tipX = b.x + Math.cos(ang) * len;
          const tipY = b.y + Math.sin(ang) * len;
          const leftX = b.x + Math.cos(ang + Math.PI * 0.8) * wid;
          const leftY = b.y + Math.sin(ang + Math.PI * 0.8) * wid;
          const rightX = b.x + Math.cos(ang - Math.PI * 0.8) * wid;
          const rightY = b.y + Math.sin(ang - Math.PI * 0.8) * wid;

          this.bulletGraphics.fillStyle(0x2dd4bf, 1.0);
          this.bulletGraphics.fillTriangle(tipX, tipY, leftX, leftY, rightX, rightY);
          this.bulletGraphics.fillStyle(0xa855f7, 1.0);
          this.bulletGraphics.fillCircle(tipX, tipY, 3);
        } else {
          this.bulletGraphics.fillStyle(b.color || 0x2dd4bf, 0.9);
          this.bulletGraphics.fillCircle(b.x, b.y, b.radius);
          this.bulletGraphics.fillStyle(0xffffff, 0.7);
          this.bulletGraphics.fillCircle(b.x, b.y, b.radius * 0.4);
        }

        if (Phaser.Math.Distance.Between(this.soul.x, this.soul.y, b.x, b.y) < b.radius + this.soulRadius) {
          this.triggerPlayerHit();
          return;
        }
      }
    }
  }

  triggerPlayerHit() {
    this.cleanupProjectiles();
    this.state = "HIT_PAUSE";

    if (this.soul) {
      this.soul.clear();
      this.soul.destroy();
      this.soul = null;
    }

    this.soulHP = Math.max(0, this.soulHP - 1);
    this.updateSoulHPUI();

    const flash = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0xff0000, 0.5);

    this.time.delayedCall(180, () => {
      flash.destroy();

      if (this.soulHP <= 0) {
        this.handlePlayerDeath();
      } else {
        if (!this.retryAttempt) this.retryAttempt = 1;
        else this.retryAttempt++;
        this.dialogueText.setVisible(false);
        if (this.questionText) this.questionText.setVisible(false);
        this.tweenBoxHeight(this.HEIGHT_RIDDLE, () => {
          this.startRiddlePhase();
        });
      }
    });
  }

  handlePause() {
    if (this.state === "DEAD" || this.state === "DEAD_SCREEN" || this.state === "VICTORY") return;
    this.scene.pause();
    this.scene.launch("PauseScene", { parentScene: this });
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
      btnBg.setStrokeStyle(3, 0x43b5e8);
      respawnBtn.setColor("#43b5e8");
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

  victorySequence() {
    this.cleanupProjectiles();
    this.state = "VICTORY";
    if (this.soul) {
      this.soul.clear();
      this.soul.destroy();
      this.soul = null;
    }

    this.crystalIdleTween.pause();
    this.crystalAngryTween.pause();
    this.crystalEnemy.setTint(0xffffff);

    this.tweens.add({
      targets: this.crystalEnemy,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 1000,
      ease: "Back.easeIn",
      onComplete: () => {
        this.dialogueText.setText("The storm calms. A weathered Fish Basket remains.").setVisible(true);
        this.time.delayedCall(2500, () => {
          this.dialogueText.setVisible(false);
          if (this.onCompleteCallback) this.onCompleteCallback();
        });
      }
    });
  }
}
