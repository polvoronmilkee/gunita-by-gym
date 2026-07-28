import Phaser from "phaser";
import { getEssence, setEssence } from "../save.js";
import { AudioManager } from "../utils/audioManager.js";
import { AUDIO_SETTINGS } from "../utils/audioSettings.js";

export class FragmentDaughtersDrawing extends Phaser.Scene {
  constructor() {
    super("fragment-daughters-drawing");
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

    this.soulName = data.soulName || "The Young Daughter";
    this.dodgeLines = data.dodgeLines || [
      "Please don't forget my picture, Papa...",
      "The colors are running in the rain...",
      "Remember the bright sun we drew together!"
    ];
    this.onCompleteCallback = data.onComplete;
    this.onDeathCallback = data.onDeath;
    this.bgKey = (data && (data.bgKey || data.bgImage)) || "bg-daughters-drawing";

    this.crystalHP = 6;
    this.maxCrystalHP = 6;
    this.soulHP = 5;
    this.retryAttempt = 0;
    this.hasSeenPhase2NewPattern = false;
    this.state = "INIT";
  }

  preload() {
    if (!this.textures.exists("bg-daughters-drawing")) {
      this.load.image("bg-daughters-drawing", "src/assets/grave1-elements/bullet-scenes/daughters-drawing.png");
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
        question: "I made a picture of Papa with wax and bright colors on a paper sheet. What am I?",
        choices: ["A) Daughter's Drawing", "B) Wooden Toy", "C) Shell Necklace", "D) Songbook"],
        answer: "A) Daughter's Drawing"
      },
      {
        question: "Even when Papa was far out at sea, he looked at my colorful smiles to feel warm. What am I?",
        choices: ["A) Daughter's Drawing", "B) Brass Compass", "C) Warm Blanket", "D) Lantern"],
        answer: "A) Daughter's Drawing"
      },
      {
        question: "Drawn with love by small hands, keeping a family together across the waves. What am I?",
        choices: ["A) Daughter's Drawing", "B) Ribbon Tie", "C) Fishing Hook", "D) Glass Bead"],
        answer: "A) Daughter's Drawing"
      },
      {
        question: "I show a big sun, a blue ocean, and a little boat with two stick figures. What am I?",
        choices: ["A) Daughter's Drawing", "B) Nautical Map", "C) Storybook", "D) Mirror"],
        answer: "A) Daughter's Drawing"
      },
      {
        question: "What did the young daughter give her father before the great storm took his ship?",
        choices: ["A) Her drawing", "B) Her ribbon", "C) A seashell", "D) A prayer bead"],
        answer: "A) Her drawing"
      }
    ];
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;

    this.sound.sounds.forEach(s => {
      if (s.key !== "daughters-letter-boss" && s.isPlaying && s.loop) {
        s.stop();
      }
    });
    this.audioManager = new AudioManager(this, "daughters-letter-boss");

    const bg = this.add.rectangle(centerX, height / 2, width, height, 0x0c060a, 1.0);
    bg.setInteractive();

    this.bg = this.add.image(this.scale.width / 2, this.scale.height / 2, this.bgKey);
    this.bg.setDisplaySize(this.scale.width, this.scale.height);
    this.bg.setAlpha(0.65);

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

    // Custom daughter drawing pattern objects
    this.rainbowArcs = [];
    this.airplanes = [];
    this.scissors = [];
    this.labyrinths = [];
    this.musicalNotes = [];
    this.sparkles = [];
    this.paintBombs = [];
    this.imaginaryFriends = [];

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

    this.rainbowHue = 0;
    this.currentRainbowColor = 0xffffff;
    this.currentRainbowColorStr = "#ffffff";

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
    this.titleText = this.add.text(centerX, 25, `[${this.soulName.toUpperCase()}]`, {
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

      const introLine = `"${this.soulName} stands before you holding a faded crayon drawing."`;
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
      this.timerBarFill.setFillStyle(this.currentRainbowColor);
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
        clickedBtn.bg.setFillStyle(this.currentRainbowColor);
        clickedBtn.text.setColor("#000000");
        clickedBtn.bg.setStrokeStyle(3, this.currentRainbowColor);
      }
      this.flashBoxColor(this.currentRainbowColor);
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
      "The crayon lines grow brighter...",
      "A familiar smile appears on the paper.",
      "The warmth of childhood returns.",
      "The drawing remembers your love."
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
      // Base 1, 2, 3: Rainbow Arc Sweep, Sun Ray Spin, Paper Airplane Volley
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

      // Initialize imaginary friends once
      if (this.imaginaryFriends.length === 0) {
        for (let i = 0; i < 2; i++) {
          this.imaginaryFriends.push({
            active: true,
            x: this.arena.x + this.arena.w / 2,
            y: this.arena.y + this.arena.h / 2,
            vx: Phaser.Math.Between(50, 90) * (Math.random() < 0.5 ? 1 : -1),
            vy: Phaser.Math.Between(50, 90) * (Math.random() < 0.5 ? 1 : -1)
          });
        }
      }

      // Desperation: Imaginary Friends is active alongside 1 of the other patterns
      this.executePattern(Phaser.Utils.Array.GetRandom([1, 2, 3, 4, 5]));
    }
  }

  executePattern(patternId) {
    const desp = this.isDesperation;
    const duration = desp ? 14000 : 10000;

    // ==========================================
    // ATTACK PATTERN TIMERS & INTERVAL ADJUSTMENTS
    // ==========================================
    if (patternId === 1) {
      // --- PATTERN 1: Merry-Go-Round (Full Arena Rotation) ---
      // 360-degree rotating bead strings forming a cross, drops paint bombs
      const count = 4; // Always 4 arms to form a cross
      const colors = [[0xf87171, 0xfb923c, 0xfde68a, 0x86efac, 0x7dd3fc, 0xa78bfa, 0xc4b5fd],
                      [0xc4b5fd, 0xa78bfa, 0x7dd3fc, 0x86efac, 0xfde68a, 0xfb923c, 0xf87171]];
      for (let i = 0; i < count; i++) {
        const offsetAng = i * (Math.PI * 2 / count);
        this.rainbowArcs.push({
          active: true,
          anchorX: this.arena.x + this.arena.w / 2, // Center of arena
          anchorY: this.arena.y + this.arena.h / 2,
          angleOffset: offsetAng,
          missingBeadIndex: -1, // No gaps
          segmentLength: 24,
          numBeads: 14, // Just enough to cover the arena corners
          colors: colors[i % 2],
          rotSpeed: desp ? 0.9 : 0.7, // Rotation speed (radians per second)
          state: "TELEGRAPH", // TELEGRAPH -> SPIN
          timer: 1.5, // Delay before it starts spinning and dropping bombs
          bombTimer: 0 // Tracks when to drop the next paint bomb
        });
      }
    } else if (patternId === 2) {
      // --- PATTERN 2: Scissors (The Closing V-Trap) ---
      // Intersecting lines that snap shut like scissors
      const interval = desp ? 2600 : 3400; // Time between scissor snaps
      for (let t = 0; t < duration; t += interval) {
        this.patternTimers.push(this.time.delayedCall(t, () => this.spawnScissorsTrap()));
      }
    } else if (patternId === 3) {
      // --- PATTERN 3: Paper Airplane Volley (Zigzag) ---
      // Airplanes that fly down in a continuous sine-wave curve
      const interval = desp ? 1600 : 2200;
      for (let t = 0; t < duration; t += interval) {
        this.patternTimers.push(this.time.delayedCall(t, () => this.launchAirplaneVolley()));
      }
    } else if (patternId === 4) {
      // --- PATTERN 4: Tracing Labyrinth (The Pencil Trail) ---
      // A ghostly pencil draws a continuous, curving line that turns into a hitbox
      const interval = desp ? 2800 : 3600;
      for (let t = 0; t < duration; t += interval) {
        this.patternTimers.push(this.time.delayedCall(t, () => this.spawnTracingLabyrinth()));
      }
    } else if (patternId === 5) {
      // --- PATTERN 5: Musical Note Bounce ---
      // Basic bouncing projectiles from the sides
      const interval = desp ? 1800 : 2400;
      for (let t = 0; t < duration; t += interval) {
        this.patternTimers.push(this.time.delayedCall(t, () => this.spawnMusicalNotes()));
      }
    }
  }

  // ===================================================
  // ATTACK PATTERN SPAWN LOGIC & PARAMETERS (EDIT SPEED/COUNT HERE)
  // ===================================================

  // --- ATTACK 3: PAPER AIRPLANE VOLLEY ---
  launchAirplaneVolley() {
    const desp = this.isDesperation;
    const count = desp ? 8 : 6;
    const speed = desp ? 195 : 180;
    const leftCorner = Math.random() < 0.5;

    const startX = leftCorner ? this.arena.x + 10 : this.arena.x + this.arena.w - 10;
    const startY = this.arena.y + 10;
    const baseAngle = leftCorner ? Math.PI / 4 : (Math.PI * 3) / 4;

    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.25;
      const angle = baseAngle + spread;
      this.airplanes.push({
        active: true,
        x: startX,
        y: startY,
        baseAngle: angle,
        speed: speed,
        timer: 0,
        swayFreq: desp ? 6 : 5,   // How fast it zigzags (sine frequency)
        swayAmp: .7,             // How wide the zigzag curve is (radians amplitude)
        trail: []
      });
    }
  }

  // --- ATTACK 2: SCISSORS (THE CLOSING V-TRAP) ---
  spawnScissorsTrap() {
    const desp = this.isDesperation;
    const cx = this.arena.x + this.arena.w / 2;
    const cy = this.arena.y + this.arena.h / 2;

    const count = desp ? 2 : 1;
    
    for (let i = 0; i < count; i++) {
      // Offset the second scissor's angle slightly if there are multiple
      const angleOffset = i * (Math.PI / 2); 
      
      this.scissors.push({
        active: true,
        x: cx,
        y: cy,
        rotAngle: Math.atan2(this.soul.y - cy, this.soul.x - cx) + angleOffset, // Aim at player
        angleOpen: (Math.PI / 180) * 45,
        length: 250,
        state: "TELEGRAPH", // TELEGRAPH -> SNAPPING -> DONE
        timer: 1 // Standardized warning time
      });
    }
  }

  // --- ATTACK 4: TRACING LABYRINTH (THE PENCIL TRAIL) ---
  spawnTracingLabyrinth() {
    const desp = this.isDesperation;
    const sx = Phaser.Math.Between(this.arena.x + 40, this.arena.x + this.arena.w - 40);
    const sy = Phaser.Math.Between(this.arena.y + 40, this.arena.y + this.arena.h - 40);

    this.labyrinths.push({
      active: true,
      x: sx,
      y: sy,
      timer: 2.0,
      duration: 2.0,
      points: [{x: sx, y: sy}],
      vx: Phaser.Math.Between(-100, 100),
      vy: Phaser.Math.Between(-100, 100),
      speed: desp ? 180 : 140,
      state: "DRAWING", // DRAWING -> FLASH -> REPEAT
      flashTimer: 0.5
    });
  }

  // --- ATTACK 5: MUSICAL NOTE BOUNCE ---
  spawnMusicalNotes() {
    const desp = this.isDesperation;
    const count = desp ? 6 : 4;
    const bounces = desp ? 4 : 3;

    for (let i = 0; i < count; i++) {
      const fromLeft = i % 2 === 0;
      const startX = fromLeft ? this.arena.x + 15 : this.arena.x + this.arena.w - 15;
      const startY = Phaser.Math.Between(this.arena.y + 30, this.arena.y + this.arena.h - 80);
      const vx = (fromLeft ? 1 : -1) * (80 + Math.random() * 30);
      const vy = (Math.random() < 0.5 ? 1 : -1) * (70 + Math.random() * 30);
      const rainbowColors = [0xf87171, 0xfb923c, 0xfde68a, 0x86efac, 0x7dd3fc, 0xa78bfa, 0xc4b5fd];

      this.musicalNotes.push({
        active: true,
        x: startX,
        y: startY,
        vx: vx,
        vy: vy,
        bounces: bounces,
        flash: 0,
        color: Phaser.Utils.Array.GetRandom(rainbowColors)
      });
    }
  }

  spawnBullet(x, y, vx, vy, radius = 4, color = 0xf5a0c0, bounces = 0, lifespan = undefined) {
    this.bullets.push({
      active: true,
      x, y, vx, vy, radius, color, bounces, lifespan
    });
  }
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

  cleanupProjectiles() {
    if (this.patternTimers && this.patternTimers.length > 0) {
      this.patternTimers.forEach(t => { if (t && typeof t.remove === "function") t.remove(); });
      this.patternTimers = [];
    }
    this.bullets = [];
    this.rainbowArcs = [];
    this.airplanes = [];
    this.musicalNotes = [];
    this.sparkles = [];
    this.scissors = [];
    this.labyrinths = [];
    this.paintBombs = [];
    this.imaginaryFriends = [];
    this.activeSunRays = false;
    if (this.bulletGraphics) this.bulletGraphics.clear();
  }

  update(time, delta) {
    // Rainbow Color Shift
    this.rainbowHue = (this.rainbowHue + delta * 0.1) % 360;
    this.currentRainbowColor = Phaser.Display.Color.HSVToRGB(this.rainbowHue / 360, 1, 1).color;
    this.currentRainbowColorStr = "#" + this.currentRainbowColor.toString(16).padStart(6, '0');

    if (this.titleText) {
      this.titleText.setColor(this.currentRainbowColorStr);
    }
    
    // Make crystal icons rainbow if intact
    if (this.crystalIcons) {
      for (let i = 0; i < this.crystalIcons.length; i++) {
        if (i < this.crystalHP) {
          this.crystalIcons[i].setTint(this.currentRainbowColor);
        }
      }
    }

    if (this.state === "RIDDLE") {
      this.phaseTimer -= delta;
      this.timerBarFill.width = 480 * Math.max(0, this.phaseTimer / this.maxPhaseTimer);
      this.timerBarFill.setFillStyle(this.currentRainbowColor);

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

      // --- Desperation: Imaginary Friends ---
      if (this.isDesperation) {
        for (let g = 0; g < this.imaginaryFriends.length; g++) {
          const ghost = this.imaginaryFriends[g];
          if (!ghost.active) continue;

          ghost.x += ghost.vx * dtSec;
          ghost.y += ghost.vy * dtSec;

          // Bounce off walls
          if (ghost.x < this.arena.x + 10 || ghost.x > this.arena.x + this.arena.w - 10) ghost.vx *= -1;
          if (ghost.y < this.arena.y + 10 || ghost.y > this.arena.y + this.arena.h - 10) ghost.vy *= -1;
          
          ghost.x = Phaser.Math.Clamp(ghost.x, this.arena.x + 10, this.arena.x + this.arena.w - 10);
          ghost.y = Phaser.Math.Clamp(ghost.y, this.arena.y + 10, this.arena.y + this.arena.h - 10);

          const gx = ghost.x;
          const gy = ghost.y;

          // Sparkle trail
          if (Math.random() < 0.3) {
            this.sparkles.push({ x: gx + Phaser.Math.Between(-6, 6), y: gy + Phaser.Math.Between(-6, 6), alpha: 0.6 });
          }

          // Render ghost
          this.bulletGraphics.fillStyle(0xf5a0c0, 0.55);
          this.bulletGraphics.fillCircle(gx, gy, 10);
          this.bulletGraphics.fillStyle(0x333333, 0.9);
          this.bulletGraphics.fillCircle(gx - 3, gy - 2, 2);
          this.bulletGraphics.fillCircle(gx + 3, gy - 2, 2);
          this.bulletGraphics.lineStyle(1, 0x333333, 0.7);
          this.bulletGraphics.beginPath();
          this.bulletGraphics.arc(gx, gy + 2, 3, 0, Math.PI);
          this.bulletGraphics.strokePath();

          for (let j = -1; j <= 1; j++) {
            this.bulletGraphics.fillStyle(0xf5a0c0, 0.55);
            this.bulletGraphics.fillCircle(gx + j * 3, gy + 10, 3);
          }

          if (Phaser.Math.Distance.Between(this.soul.x, this.soul.y, gx, gy) < 10 + this.soulRadius) {
            this.triggerPlayerHit();
            return;
          }

          // Drop slow-moving bullet trail
          ghost.trailTimer = (ghost.trailTimer || 0) - dtSec;
          if (ghost.trailTimer <= 0) {
            ghost.trailTimer = 0.4; // Drop a bullet every 0.4s
            this.spawnBullet(gx, gy, 0, 0, 4, 0xf5a0c0, 0, 0.3);
          }
        }
      }

      // Draw sparkles
      for (let i = this.sparkles.length - 1; i >= 0; i--) {
        const sp = this.sparkles[i];
        sp.alpha -= dtSec * 1.2;
        if (sp.alpha <= 0) {
          this.sparkles.splice(i, 1);
          continue;
        }
        this.bulletGraphics.fillStyle(0xffffff, sp.alpha);
        this.bulletGraphics.fillCircle(sp.x, sp.y, 1.5);
      }

      // --- ATTACK 1: MERRY-GO-ROUND UPDATE & DRAW ---
      for (let i = this.rainbowArcs.length - 1; i >= 0; i--) {
        const p = this.rainbowArcs[i];
        if (!p || !p.active) continue;

        if (p.state === "TELEGRAPH") {
          p.timer -= dtSec;
          const alpha = 0.3 + Math.sin(timeSec * 15) * 0.2;
          this.bulletGraphics.lineStyle(2, p.colors[0], alpha);
          this.bulletGraphics.beginPath();
          this.bulletGraphics.moveTo(p.anchorX, p.anchorY);
          this.bulletGraphics.lineTo(p.anchorX + Math.cos(p.angleOffset) * 300, p.anchorY + Math.sin(p.angleOffset) * 300);
          this.bulletGraphics.strokePath();
          if (p.timer <= 0) p.state = "SPIN";
          continue;
        }

        // Continuous 360 rotation
        p.angleOffset += p.rotSpeed * dtSec;
        const swingAngle = p.angleOffset;

        // Drop paint bombs randomly
        p.bombTimer -= dtSec;
        if (p.bombTimer <= 0) {
          p.bombTimer = Phaser.Math.FloatBetween(0.8, 1.5);
          const dist = Phaser.Math.Between(60, 220);
          this.paintBombs.push({
            active: true,
            x: p.anchorX + Math.cos(swingAngle) * dist,
            y: p.anchorY + Math.sin(swingAngle) * dist,
            timer: 0.8, // 0.8s telegraph
            color: Phaser.Utils.Array.GetRandom(p.colors)
          });
        }

        // Make the very center of the Merry-Go-Round unsafe!
        if (Phaser.Math.Distance.Between(this.soul.x, this.soul.y, p.anchorX, p.anchorY) < 10 + this.soulRadius) {
          this.triggerPlayerHit();
          return;
        }

        for (let b = 0; b < p.numBeads; b++) {
          const dist = (b + 1) * p.segmentLength;
          const bx = p.anchorX + dist * Math.sin(swingAngle);
          const by = p.anchorY + dist * Math.cos(swingAngle);
          const color = p.colors[b % p.colors.length];

          // Draw strings
          if (b > 0) {
            const prevDist = b * p.segmentLength;
            const pbx = p.anchorX + prevDist * Math.sin(swingAngle);
            const pby = p.anchorY + prevDist * Math.cos(swingAngle);
            this.bulletGraphics.lineStyle(2, color, 0.4);
            this.bulletGraphics.beginPath();
            this.bulletGraphics.moveTo(pbx, pby);
            this.bulletGraphics.lineTo(bx, by);
            this.bulletGraphics.strokePath();
          }

          // Draw gaps
          if (b === p.missingBeadIndex || b === p.missingBeadIndex + 1) {
            this.bulletGraphics.lineStyle(2, 0xffffff, 0.6);
            this.bulletGraphics.strokeCircle(bx, by, 9);
            continue;
          }

          // Draw beads
          this.bulletGraphics.fillStyle(color, 0.25);
          this.bulletGraphics.fillCircle(bx, by, 11);
          this.bulletGraphics.fillStyle(color, 0.95);
          this.bulletGraphics.fillCircle(bx, by, 7);
          this.bulletGraphics.fillStyle(0xffffff, 0.85);
          this.bulletGraphics.fillCircle(bx, by, 2.5);

          // Draw a "seat" near the end of the arm to look like a Merry-Go-Round
          if (b === p.numBeads - 3) {
            this.bulletGraphics.fillStyle(color, 1.0);
            this.bulletGraphics.fillRect(bx - 8, by - 8, 16, 16);
            this.bulletGraphics.lineStyle(2, 0xffffff, 0.8);
            this.bulletGraphics.strokeRect(bx - 8, by - 8, 16, 16);
          }

          // Player hit check
          if (Phaser.Math.Distance.Between(this.soul.x, this.soul.y, bx, by) < 7 + this.soulRadius) {
            this.triggerPlayerHit();
            return;
          }
        }
      }

      // --- PAINT BOMBS UPDATE & DRAW ---
      for (let i = this.paintBombs.length - 1; i >= 0; i--) {
        const bomb = this.paintBombs[i];
        if (!bomb || !bomb.active) continue;
        
        bomb.timer -= dtSec;
        if (bomb.timer > 0) {
           // Telegraph
           this.bulletGraphics.lineStyle(2, bomb.color, 0.6);
           this.bulletGraphics.strokeCircle(bomb.x, bomb.y, 25);
           this.bulletGraphics.fillStyle(bomb.color, 0.2);
           this.bulletGraphics.fillCircle(bomb.x, bomb.y, 25 * (1.0 - bomb.timer / 0.8));
        } else {
           // Explosion (1 frame flash hitbox)
           this.bulletGraphics.fillStyle(bomb.color, 0.95);
           this.bulletGraphics.fillCircle(bomb.x, bomb.y, 25);
           
           if (Phaser.Math.Distance.Between(this.soul.x, this.soul.y, bomb.x, bomb.y) < 25 + this.soulRadius) {
             this.triggerPlayerHit();
             return;
           }
           
           bomb.active = false;
           this.paintBombs.splice(i, 1);
        }
      }

      // --- ATTACK 2: SCISSORS (THE CLOSING V-TRAP) UPDATE & DRAW ---
      for (let i = this.scissors.length - 1; i >= 0; i--) {
        const sc = this.scissors[i];
        if (!sc || !sc.active) continue;

        if (sc.state === "TELEGRAPH") {
          sc.timer -= dtSec;
          if (sc.timer <= 0) {
            sc.state = "SNAPPING";
            sc.timer = 0.15; // Snaps shut extremely fast
            this.sound.play("sfx-dash", { volume: 0.6 });
            this.cameras.main.shake(100, 0.005);
          }

          // Draw warning telegraph
          const alpha = 0.3 + Math.sin(timeSec * 15) * 0.2;
          this.bulletGraphics.lineStyle(4, 0xef4444, alpha);
          
          for (let side = -1; side <= 1; side += 2) {
            const ang = sc.rotAngle + side * sc.angleOpen;
            
            let dx = Math.cos(ang) * sc.length;
            let dy = Math.sin(ang) * sc.length;
            let t = 1;
            if (dx > 0) t = Math.min(t, (this.arena.x + this.arena.w - sc.x) / dx);
            else if (dx < 0) t = Math.min(t, (this.arena.x - sc.x) / dx);
            if (dy > 0) t = Math.min(t, (this.arena.y + this.arena.h - sc.y) / dy);
            else if (dy < 0) t = Math.min(t, (this.arena.y - sc.y) / dy);
            
            this.bulletGraphics.beginPath();
            this.bulletGraphics.moveTo(sc.x, sc.y);
            this.bulletGraphics.lineTo(sc.x + dx * t, sc.y + dy * t);
            this.bulletGraphics.strokePath();
          }

          // Draw finger holes/handles so orientation is obvious (even in telegraph)
          this.bulletGraphics.lineStyle(4, 0xef4444, alpha);
          for (let side = -1; side <= 1; side += 2) {
             const handleAng = sc.rotAngle + side * sc.angleOpen + Math.PI; // Opposite to blades
             const hx = sc.x + Math.cos(handleAng) * 15;
             const hy = sc.y + Math.sin(handleAng) * 15;
             this.bulletGraphics.strokeCircle(hx, hy, 10);
          }
        } else if (sc.state === "SNAPPING") {
          sc.timer -= dtSec;
          const progress = 1.0 - Math.max(0, sc.timer / 0.15); // 0 to 1
          const currentAngle = sc.angleOpen * (1.0 - progress);

          // Draw snapping blades
          this.bulletGraphics.lineStyle(6, 0xef4444, 0.9);
          
          for (let side = -1; side <= 1; side += 2) {
            const ang = sc.rotAngle + side * currentAngle;
            
            let dx = Math.cos(ang) * sc.length;
            let dy = Math.sin(ang) * sc.length;
            let t = 1;
            if (dx > 0) t = Math.min(t, (this.arena.x + this.arena.w - sc.x) / dx);
            else if (dx < 0) t = Math.min(t, (this.arena.x - sc.x) / dx);
            if (dy > 0) t = Math.min(t, (this.arena.y + this.arena.h - sc.y) / dy);
            else if (dy < 0) t = Math.min(t, (this.arena.y - sc.y) / dy);
            
            const endX = sc.x + dx * t;
            const endY = sc.y + dy * t;

            this.bulletGraphics.beginPath();
            this.bulletGraphics.moveTo(sc.x, sc.y);
            this.bulletGraphics.lineTo(endX, endY);
            this.bulletGraphics.strokePath();

            // Hitbox: Check distance to line segment
            const dist = this.pointToLineDistance(this.soul.x, this.soul.y, sc.x, sc.y, endX, endY);
            if (dist < 8 + this.soulRadius) {
              this.triggerPlayerHit();
              return;
            }
          }
          
          // Draw finger holes/handles so orientation is obvious
          this.bulletGraphics.lineStyle(4, 0xef4444, 0.9);
          for (let side = -1; side <= 1; side += 2) {
             const handleAng = sc.rotAngle + side * currentAngle + Math.PI; // Opposite to blades
             const hx = sc.x + Math.cos(handleAng) * 15;
             const hy = sc.y + Math.sin(handleAng) * 15;
             this.bulletGraphics.strokeCircle(hx, hy, 10);
          }

          if (sc.timer <= 0) {
            sc.state = "DONE";
          }
        } else if (sc.state === "DONE") {
          sc.active = false;
          this.scissors.splice(i, 1);
          continue;
        }
      }

      // --- ATTACK 3: PAPER AIRPLANE VOLLEY (ZIGZAG) UPDATE & DRAW ---
      for (let i = this.airplanes.length - 1; i >= 0; i--) {
        const ap = this.airplanes[i];
        if (!ap || !ap.active) continue;

        ap.timer += dtSec;
        
        // Sine wave oscillation for zigzag flight path
        const currentAngle = ap.baseAngle + Math.sin(ap.timer * ap.swayFreq) * ap.swayAmp;
        ap.x += Math.cos(currentAngle) * ap.speed * dtSec;
        ap.y += Math.sin(currentAngle) * ap.speed * dtSec;
        const drawAngle = currentAngle; // The angle the sprite points

        ap.trail.unshift({ x: ap.x, y: ap.y });
        if (ap.trail.length > 3) ap.trail.pop();

        if (ap.x < this.arena.x - 20 || ap.x > this.arena.x + this.arena.w + 20 ||
            ap.y < this.arena.y - 20 || ap.y > this.arena.y + this.arena.h + 20) {
          ap.active = false;
          this.airplanes.splice(i, 1);
          continue;
        }

        // Draw trail afterimages
        for (let th = 0; th < ap.trail.length; th++) {
          const tp = ap.trail[th];
          const alpha = (3 - th) * 0.06;
          this.bulletGraphics.fillStyle(0xf5a0c0, alpha);
          this.bulletGraphics.fillCircle(tp.x, tp.y, 4 - th);
        }

        // Draw airplane triangle
        const tipX = ap.x + Math.cos(drawAngle) * 9;
        const tipY = ap.y + Math.sin(drawAngle) * 9;
        const leftX = ap.x + Math.cos(drawAngle + 2.5) * 7;
        const leftY = ap.y + Math.sin(drawAngle + 2.5) * 7;
        const rightX = ap.x + Math.cos(drawAngle - 2.5) * 7;
        const rightY = ap.y + Math.sin(drawAngle - 2.5) * 7;

        this.bulletGraphics.fillStyle(0xf5a0c0, 0.95);
        this.bulletGraphics.fillTriangle(tipX, tipY, leftX, leftY, rightX, rightY);
        this.bulletGraphics.lineStyle(1, 0xffffff, 0.6);
        this.bulletGraphics.beginPath();
        this.bulletGraphics.moveTo(tipX, tipY);
        this.bulletGraphics.lineTo((leftX + rightX) / 2, (leftY + rightY) / 2);
        this.bulletGraphics.strokePath();

        // Hitbox check
        if (Phaser.Math.Distance.Between(this.soul.x, this.soul.y, ap.x, ap.y) < 6 + this.soulRadius) {
          this.triggerPlayerHit();
          return;
        }
      }

      // --- ATTACK 4: TRACING LABYRINTH (THE PENCIL TRAIL) UPDATE & DRAW ---
      for (let i = this.labyrinths.length - 1; i >= 0; i--) {
        const lab = this.labyrinths[i];
        if (!lab || !lab.active) continue;

        if (lab.state === "DRAWING") {
          lab.timer -= dtSec;

          // Aggressive homing/tracking logic
          const dx = this.soul.x - lab.x;
          const dy = this.soul.y - lab.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0) {
            const steerStrength = 600 * dtSec; // Steer towards player
            lab.vx += (dx / dist) * steerStrength;
            lab.vy += (dy / dist) * steerStrength;
          }
          
          // Normalize to constant speed
          const currentSpeed = Math.hypot(lab.vx, lab.vy);
          if (currentSpeed > 0) {
            lab.vx = (lab.vx / currentSpeed) * lab.speed;
            lab.vy = (lab.vy / currentSpeed) * lab.speed;
          }

          lab.x += lab.vx * dtSec;
          lab.y += lab.vy * dtSec;
          
          // Still bounce off walls if it hits them
          if (lab.x < this.arena.x || lab.x > this.arena.x + this.arena.w) lab.vx *= -1;
          if (lab.y < this.arena.y || lab.y > this.arena.y + this.arena.h) lab.vy *= -1;

          lab.x = Phaser.Math.Clamp(lab.x, this.arena.x, this.arena.x + this.arena.w);
          lab.y = Phaser.Math.Clamp(lab.y, this.arena.y, this.arena.y + this.arena.h);

          // Record path
          lab.points.push({x: lab.x, y: lab.y});

          // Draw the pencil tip
          this.bulletGraphics.fillStyle(0xfde68a, 1.0);
          this.bulletGraphics.fillCircle(lab.x, lab.y, 6);
          this.bulletGraphics.fillStyle(0xffffff, 0.8);
          this.bulletGraphics.fillCircle(lab.x - 2, lab.y - 2, 2);

          // Draw the line as a warning telegraph
          this.bulletGraphics.lineStyle(4, 0xfde68a, 0.4);
          this.bulletGraphics.beginPath();
          this.bulletGraphics.moveTo(lab.points[0].x, lab.points[0].y);
          for (let p = 1; p < lab.points.length; p++) {
            this.bulletGraphics.lineTo(lab.points[p].x, lab.points[p].y);
          }
          this.bulletGraphics.strokePath();

          if (lab.timer <= 0) {
            lab.state = "FLASH";
            this.sound.play("sfx-dash", { volume: 0.5 });
          }
        } else if (lab.state === "FLASH") {
          lab.flashTimer -= dtSec;

          // Draw the line as an active hazard
          this.bulletGraphics.lineStyle(8, 0xfde68a, 0.9);
          this.bulletGraphics.beginPath();
          this.bulletGraphics.moveTo(lab.points[0].x, lab.points[0].y);
          for (let p = 1; p < lab.points.length; p++) {
            this.bulletGraphics.lineTo(lab.points[p].x, lab.points[p].y);
          }
          this.bulletGraphics.strokePath();

          // Check collisions against the line segments
          let hit = false;
          for (let p = 1; p < lab.points.length; p++) {
            const p1 = lab.points[p - 1];
            const p2 = lab.points[p];
            const dist = this.pointToLineDistance(this.soul.x, this.soul.y, p1.x, p1.y, p2.x, p2.y);
            
            if (dist < 4 + this.soulRadius) {
              hit = true;
              break;
            }
          }

          if (hit) {
            this.triggerPlayerHit();
            return;
          }

          if (lab.flashTimer <= 0) {
            // Erase and repeat
            lab.state = "DRAWING";
            lab.timer = 2.0;
            lab.flashTimer = 0.5;
            lab.points = [{x: lab.x, y: lab.y}];
          }
        }
      }

      // 5. Update & Draw Musical Notes
      for (let i = this.musicalNotes.length - 1; i >= 0; i--) {
        const mn = this.musicalNotes[i];
        if (!mn || !mn.active) continue;

        mn.x += mn.vx * dtSec;
        mn.y += mn.vy * dtSec;

        let bounced = false;
        if (mn.x - 6 < this.arena.x) {
          mn.x = this.arena.x + 6;
          mn.vx *= -1;
          bounced = true;
        } else if (mn.x + 6 > this.arena.x + this.arena.w) {
          mn.x = this.arena.x + this.arena.w - 6;
          mn.vx *= -1;
          bounced = true;
        }

        if (mn.y - 6 < this.arena.y) {
          mn.y = this.arena.y + 6;
          mn.vy *= -1;
          bounced = true;
        } else if (mn.y + 6 > this.arena.y + this.arena.h) {
          mn.y = this.arena.y + this.arena.h - 6;
          mn.vy *= -1;
          bounced = true;
        }

        if (bounced) {
          if (mn.bounces > 0) {
            mn.bounces--;
            mn.flash = 0.15;
          } else {
            mn.active = false;
            this.musicalNotes.splice(i, 1);
            continue;
          }
        }

        if (mn.flash > 0) mn.flash -= dtSec;
        const color = mn.flash > 0 ? 0xffffff : mn.color;

        // Draw note shape
        this.bulletGraphics.fillStyle(color, 0.95);
        this.bulletGraphics.fillCircle(mn.x, mn.y, 5);
        this.bulletGraphics.fillStyle(0xffffff, 0.7);
        this.bulletGraphics.fillCircle(mn.x, mn.y, 2);

        this.bulletGraphics.fillStyle(color, 0.9);
        this.bulletGraphics.fillRect(mn.x + 3, mn.y - 12, 2, 12);

        this.bulletGraphics.lineStyle(2, color, 0.8);
        this.bulletGraphics.beginPath();
        this.bulletGraphics.arc(mn.x + 3, mn.y - 12, 5, -Math.PI / 2, Math.PI / 4, false);
        this.bulletGraphics.strokePath();

        if (Phaser.Math.Distance.Between(this.soul.x, this.soul.y, mn.x, mn.y) < 6 + this.soulRadius) {
          this.triggerPlayerHit();
          return;
        }
      }

      // 6. Update & Draw Standard Bullets
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i];
        if (!b || !b.active) continue;

        b.x += b.vx * dtSec;
        b.y += b.vy * dtSec;

        if (b.lifespan !== undefined) {
          b.lifespan -= dtSec;
          if (b.lifespan <= 0) {
            b.active = false;
            this.bullets.splice(i, 1);
            continue;
          }
        }

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
          } else {
            b.active = false;
            this.bullets.splice(i, 1);
            continue;
          }
        }

        const alpha = b.lifespan !== undefined ? Math.min(0.9, b.lifespan) : 0.9;
        this.bulletGraphics.fillStyle(b.color || 0xf5a0c0, alpha);
        this.bulletGraphics.fillCircle(b.x, b.y, b.radius);
        this.bulletGraphics.fillStyle(0xffffff, 0.7);
        this.bulletGraphics.fillCircle(b.x, b.y, b.radius * 0.4);

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
      btnBg.setStrokeStyle(3, this.currentRainbowColor || 0xf7c948);
      respawnBtn.setColor(this.currentRainbowColorStr || "#f7c948");
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
        this.dialogueText.setText("The drawing clears, revealing the father's smile.").setVisible(true);
        this.time.delayedCall(2500, () => {
          this.dialogueText.setVisible(false);
          if (this.onCompleteCallback) this.onCompleteCallback();
        });
      }
    });
  }
}
