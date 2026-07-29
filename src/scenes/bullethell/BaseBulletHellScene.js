import Phaser from "phaser";
import { AudioManager } from "../../utils/audioManager.js";
import riddlesData from "../../data/riddles.json";

export class BaseBulletHellScene extends Phaser.Scene {
  constructor(key) {
    super(key);
  }

  init(data) {
    const sceneKey = this.scene.key;
    const jsonRiddles = riddlesData[sceneKey] || this.getDefaultRiddles() || [];

    const rawData = data ? (data.riddleData || data.riddleList) : null;
    if (rawData) {
      if (Array.isArray(rawData)) {
        this.riddleList = rawData;
      } else if (rawData.riddles && Array.isArray(rawData.riddles)) {
        this.riddleList = rawData.riddles;
      } else if (rawData.question) {
        this.riddleList = [rawData, ...jsonRiddles.filter(r => r.question !== rawData.question)];
      } else {
        this.riddleList = [...jsonRiddles];
      }
    } else {
      this.riddleList = [...jsonRiddles];
    }

    this.remainingRiddles = Phaser.Utils.Array.Shuffle([...this.riddleList]);
    this.currentRiddle = null;
    this.recentRiddles = [];

    // Fallbacks that child classes should provide
    this.soulName = data.soulName || this.getFallbackSoulName();
    this.dodgeLines = data.dodgeLines || this.getFallbackDodgeLines();
    this.onCompleteCallback = data.onComplete;
    this.onDeathCallback = data.onDeath;
    this.returnScene = data ? data.returnScene : null;
    this.bgKey = (data && (data.bgKey || data.bgImage)) || this.getFallbackBgKey();

    this.crystalHP = 6;
    this.maxCrystalHP = 6;
    this.soulHP = 5;
    this.retryAttempt = 0;
    this.hasSeenPhase2NewPattern = false;
    this.state = "INIT";
    this.isPaused = false;
    this.soulColor = this.getSoulColor(); 
    this.soulRadius = 6;
  }

  // --- Methods meant to be overridden by children ---
  getDefaultRiddles() { return []; }
  getFallbackSoulName() { return "Unknown Soul"; }
  getFallbackDodgeLines() { return ["Dodge!"]; }
  getFallbackBgKey() { return "bg-default"; }
  getAudioBossKey() { return "boss-music"; }
  getSoulColor() { return 0xffffff; }
  getTitleColor() { return "#ffffff"; }
  getTimerFillColor() { return 0xffffff; }
  getTimerBgColor() { return 0x000000; }
  getTimerDodgeColor() { return 0xff0000; }
  startPatternsForPhase() {} // Child initializes its specific patterns
  updateCustomPatterns(timeSec, dtSec) {} // Child updates its specific patterns
  customCleanup() {} // Child cleans up unique projectile arrays

  preload() {
    if (!this.textures.exists("fragment-main")) {
      this.load.spritesheet("fragment-main", "src/assets/fragment-main.png", {
        frameWidth: 16,
        frameHeight: 16,
      });
    }
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;

    const audioKey = this.getAudioBossKey();
    this.sound.sounds.forEach(s => {
      if (s.key !== audioKey && s.isPlaying && s.loop) {
        s.stop();
      }
    });
    this.audioManager = new AudioManager(this, audioKey);

    const bg = this.add.rectangle(centerX, height / 2, width, height, 0x0c060a, 1.0);
    bg.setInteractive(); // Consume clicks

    this.bg = this.add.image(centerX, height / 2, this.bgKey);
    this.bg.setDisplaySize(width, height);
    this.bg.setAlpha(0.65);
    this.bg.setDepth(-10);

    // =========================================
    // CENTRALIZED UI COORDINATES
    // =========================================
    this.boxCenterX = centerX;
    this.boxWidth = 580;
    this.boxCenterY = 290; // The new shared Y for the dodge arena!
    this.boxHeight = 10;
    
    this.timerY = 485; // Adjusted higher alongside box
    this.vinoHpY = 520;
    this.btnYStart = 570;

    this.HEIGHT_DIALOGUE = 130;
    this.HEIGHT_RIDDLE = 130;
    this.HEIGHT_DODGE = 320;

    this.boxGraphics = this.add.graphics();
    this.bulletGraphics = this.add.graphics();

    // Standard Bullet Physics Objects
    this.bullets = [];
    this.activeWarnings = [];
    this.patternTimers = [];
    
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,S,A,D,SPACE,ENTER");
    this.selectedButtonIndex = 0;

    // Global pause listeners
    this.input.keyboard.on('keydown-P', this.handlePause, this);
    this.input.keyboard.on('keydown-ESC', this.handlePause, this);

    // Debug shortcuts for testing
    this.input.keyboard.on("keydown-U", () => {
      this.cleanupAudioAndTimers();
      this.scene.start("tutorial-bullet-hell", { returnScene: "Grave1" });
    });

    this.input.keyboard.on("keydown-I", () => {
      this.cleanupAudioAndTimers();
      this.scene.start("final-boss-fisherman", { returnScene: "Grave1" });
    });

    this.events.on('resume', () => {
      this.isPaused = false;
    });

    this.createCrystalHPUI(centerX);
    this.createSoulHPUI(centerX);
    this.createRiddleUI(centerX);

    this.updateArenaBounds();
    this.drawBox();

    this.rainbowHue = 0;
    this.currentRainbowColor = 0xffffff;
    this.currentRainbowColorStr = "#ffffff";

    this.startIntroSequence();
    this.game.events.emit("game-ready");

    this.events.once("shutdown", () => {
      this.input.keyboard.off('keydown-P', this.handlePause, this);
      this.input.keyboard.off('keydown-ESC', this.handlePause, this);
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

    this.boxGraphics.fillStyle(fillColor, 0.95);
    this.boxGraphics.fillRect(left, top, this.boxWidth, this.boxHeight);

    this.boxGraphics.lineStyle(4, 0x3c2a1e, 1);
    this.boxGraphics.strokeRect(left, top, this.boxWidth, this.boxHeight);

    this.boxGraphics.lineStyle(2, 0x8c6a49, 1);
    this.boxGraphics.strokeRect(left + 5, top + 5, this.boxWidth - 10, this.boxHeight - 10);

    this.boxGraphics.lineStyle(1, 0xbfa482, 0.6);
    this.boxGraphics.strokeRect(left + 8, top + 8, this.boxWidth - 16, this.boxHeight - 16);

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

  createCrystalHPUI(centerX) {
    this.titleText = this.add.text(centerX, 25, `[${this.soulName.toUpperCase()}]`, {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "12px",
      color: this.getTitleColor()
    }).setOrigin(0.5);

    this.crystalIcons = [];
    for (let i = 0; i < 6; i++) {
      const icon = this.add.sprite(centerX - 75 + i * 30, 50, "fragment-main");
      icon.setScale(1.2);
      this.crystalIcons.push(icon);
    }
    this.updateCrystalHPUI();

    this.crystalEnemy = this.add.sprite(centerX, 100, "fragment-main");
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
        this.crystalIcons[i].setTint(0xf7c948);
        this.crystalIcons[i].setAlpha(1.0);
      } else {
        this.crystalIcons[i].setTint(0x333333);
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

  createSoulHPUI(centerX) {
    const vinoHpX = centerX - 225;
    const heartSpacing = 28;
    const heartOffsetFromText = 50;

    this.add.text(vinoHpX, this.vinoHpY, "VINO", {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "12px",
      color: "#b57fee"
    }).setOrigin(0.5);

    this.soulIcons = [];
    this.soulTweens = [];

    for (let i = 0; i < 5; i++) {
      const soul = this.add.text(vinoHpX + heartOffsetFromText + i * heartSpacing, this.vinoHpY, "♥", {
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
    const positions = [
      { x: centerX - 130, y: this.btnYStart },
      { x: centerX + 130, y: this.btnYStart },
      { x: centerX - 130, y: this.btnYStart + 45 },
      { x: centerX + 130, y: this.btnYStart + 45 }
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
        this.selectedButtonIndex = index;
        this.updateButtonSelection();
      });

      btnBg.on("pointerout", () => {
        if (this.state !== "RIDDLE") return;
        this.updateButtonSelection();
      });

      btnBg.on("pointerdown", () => {
        if (this.state !== "RIDDLE") return;
        const targetAnswer = this.currentRiddle ? this.currentRiddle.answer : "";
        this.handleAnswer(btnText.text, targetAnswer);
      });

      this.buttons.push({ bg: btnBg, text: btnText });
    }

    this.timerBarBg = this.add.rectangle(centerX, this.timerY, 580, 10, this.getTimerBgColor());
    this.timerBarBg.setStrokeStyle(2, 0xffffff);
    this.timerBarFill = this.add.rectangle(centerX - 290, this.timerY, 580, 10, this.getTimerFillColor()).setOrigin(0, 0.5);
  }

  typewriterText(textObject, text, speed = 15, onComplete = null) {
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
    this.typewriterText(this.dialogueText, text, 16, onComplete);
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
      this.input.keyboard.off("keydown-SPACE", trigger);
      this.input.keyboard.off("keydown-ENTER", trigger);
      callback();
    };

    this.input.once("pointerdown", trigger);
    this.input.keyboard.once("keydown-SPACE", trigger);
    this.input.keyboard.once("keydown-ENTER", trigger);
  }

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

      const introLine = `"${this.soulName} stands before you."`;
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
      btn.bg.setFillStyle(0x25282e);
      btn.text.setColor("#f7e8c3");
      btn.bg.setStrokeStyle(2, 0x8c6a49);
    });
  }

  updateButtonSelection() {
    if (this.state !== "RIDDLE") return;
    this.buttons.forEach((btn, index) => {
      if (index === this.selectedButtonIndex) {
        btn.bg.setFillStyle(0x9c6c28);
        btn.text.setColor("#ffffff");
        btn.bg.setStrokeStyle(2, 0xf7e8c3);
      } else {
        btn.bg.setFillStyle(0x25282e);
        btn.text.setColor("#f7e8c3");
        btn.bg.setStrokeStyle(2, 0x8c6a49);
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
    if (pool.length === 0) pool = this.riddleList;

    if (!this.remainingRiddles) this.remainingRiddles = [];
    if (!this.recentRiddles) this.recentRiddles = [];
    
    let available = pool.filter(r => this.remainingRiddles.includes(r) && !this.recentRiddles.includes(r));
    if (available.length === 0) {
      this.remainingRiddles = this.remainingRiddles.concat(pool);
      available = pool.filter(r => !this.recentRiddles.includes(r));
      if (available.length === 0) available = [...pool];
    }
    
    this.currentRiddle = Phaser.Utils.Array.GetRandom(available);
    this.recentRiddles.push(this.currentRiddle);
    if (this.recentRiddles.length > 3) this.recentRiddles.shift();

    this.questionText.setOrigin(0, 0);
    this.questionText.setPosition(this.boxCenterX - this.boxWidth / 2 + 25, this.boxCenterY - 35);
    this.questionText.setAlign("left");
    this.questionText.setVisible(true);
    this.dialogueText.setVisible(false);

    let choices = this.currentRiddle.choices || ["A", "B", "C", "D"];
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

    this.typewriterText(this.questionText, this.currentRiddle.question, 12, () => {
      this.state = "RIDDLE";
      const durations = [20000, 16000, 12000, 10000];
      this.phaseTimer = durations[Math.min(this.retryAttempt, 3)];
      this.maxPhaseTimer = this.phaseTimer;

      this.timerBarFill.width = 580;
      this.timerBarFill.setFillStyle(this.currentRainbowColor);
      this.setChoiceButtonsState("ACTIVE");
      this.setRiddleUIElementsVisible(true);
      
      this.selectedButtonIndex = 0;
      this.updateButtonSelection();
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
    if (shatteredIcon) this.shatterCrystalParticle(shatteredIcon.x, shatteredIcon.y);

    this.crystalHP = Math.max(0, this.crystalHP - 1);
    this.updateCrystalHPUI();

    if (this.currentRiddle && this.remainingRiddles) {
      const idx = this.remainingRiddles.indexOf(this.currentRiddle);
      if (idx > -1) this.remainingRiddles.splice(idx, 1);
    }

    if (this.crystalHP <= 0) {
      this.time.delayedCall(1500, () => {
        this.victorySequence();
      });
      return;
    }

    const reactionLines = [
      "The connection grows stronger...",
      "A familiar shape appears.",
      "The warmth of memory returns.",
      "The soul remembers your presence."
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

    this.isInvincible = true;
    this.invincibleTimer = 1.0;

    this.phaseTimer = 10000;
    this.maxPhaseTimer = 10000;

    this.time.delayedCall(1500, () => {
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
    
    if (this.isInvincible) {
       this.soul.fillStyle(0xffffff, 0.4 + Math.sin(this.time.now / 50) * 0.3);
       this.soul.fillCircle(0, 2, this.soulRadius * 1.8);
    }

    this.soul.fillStyle(this.soulColor, 1);
    this.soul.lineStyle(1, 0xffffff, 0.8);
    this.soul.fillCircle(0, 2, this.soulRadius);
    this.soul.strokeCircle(0, 2, this.soulRadius);
    this.soul.fillTriangle(-4, 2, 4, 2, 0, -8);
    this.soul.strokeTriangle(-4, 2, 4, 2, 0, -8);
  }

  spawnBullet(x, y, vx, vy, radius = 4, color = 0xf5a0c0, bounces = 0, lifespan = undefined) {
    this.bullets.push({
      active: true,
      x, y, vx, vy, radius, color, bounces, lifespan
    });
  }

  cleanupProjectiles() {
    if (this.patternTimers && this.patternTimers.length > 0) {
      this.patternTimers.forEach(t => { if (t && typeof t.remove === "function") t.remove(); });
      this.patternTimers = [];
    }
    this.bullets = [];
    if (this.bulletGraphics) this.bulletGraphics.clear();
    this.customCleanup();
  }

  update(time, delta) {
    // Prevent inputs from leaking when paused
    if (this.scene.isPaused()) return;
    
    if (this.titleText) {
      this.titleText.setColor(this.getTitleColor());
    }
    
    if (this.crystalIcons) {
      for (let i = 0; i < this.crystalIcons.length; i++) {
        if (i < this.crystalHP) {
          this.crystalIcons[i].setTint(this.getTimerFillColor());
        }
      }
    }

    if (this.state === "RIDDLE") {
      this.phaseTimer -= delta;
      this.timerBarFill.width = 580 * Math.max(0, this.phaseTimer / this.maxPhaseTimer);
      this.timerBarFill.setFillStyle(this.getTimerFillColor());
      
      if (Phaser.Input.Keyboard.JustDown(this.cursors.left) || Phaser.Input.Keyboard.JustDown(this.keys.A)) {
        if (this.selectedButtonIndex % 2 === 1) this.selectedButtonIndex--;
        this.updateButtonSelection();
        if (this.audioManager) this.audioManager.playHoverSfx?.();
      } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right) || Phaser.Input.Keyboard.JustDown(this.keys.D)) {
        if (this.selectedButtonIndex % 2 === 0) this.selectedButtonIndex++;
        this.updateButtonSelection();
        if (this.audioManager) this.audioManager.playHoverSfx?.();
      } else if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keys.W)) {
        if (this.selectedButtonIndex >= 2) this.selectedButtonIndex -= 2;
        this.updateButtonSelection();
        if (this.audioManager) this.audioManager.playHoverSfx?.();
      } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.keys.S)) {
        if (this.selectedButtonIndex <= 1) this.selectedButtonIndex += 2;
        this.updateButtonSelection();
        if (this.audioManager) this.audioManager.playHoverSfx?.();
      }

      if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.keys.ENTER)) {
        const targetAnswer = this.currentRiddle ? this.currentRiddle.answer : "";
        this.handleAnswer(this.buttons[this.selectedButtonIndex].text.text, targetAnswer);
      }

      if (this.phaseTimer <= 0) {
        this.startTryAgainDialogue();
      }
    } else if (this.state === "DODGE") {
      this.phaseTimer -= delta;
      
      this.timerBarBg.setVisible(true);
      this.timerBarFill.setVisible(true);
      this.timerBarFill.width = 580 * Math.max(0, this.phaseTimer / this.maxPhaseTimer);
      this.timerBarFill.setFillStyle(this.getTimerDodgeColor());

      if (this.isInvincible) {
         this.invincibleTimer -= delta / 1000;
         if (this.invincibleTimer <= 0) {
             this.isInvincible = false;
         }
      }

      if (this.phaseTimer <= 0) {
        this.setRiddleUIElementsVisible(false);
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

      // --- Soul Movement ---
      if (!this.soul) return;
      
      let speedModifier = 1.0;
      if (this.getPlayerSpeedModifier) {
        speedModifier = this.getPlayerSpeedModifier();
      }

      let speed = 200 * (delta / 1000) * speedModifier;
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

      // Call child's custom update loop BEFORE standard bullets so we can draw underneath
      this.updateCustomPatterns(timeSec, dtSec);

      // Standard Bullets Update & Draw
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i];
        if (!b || !b.active) continue;

        if ((b.homing || b.isHoming) && this.soul) {
          const targetAngle = Math.atan2(this.soul.y - b.y, this.soul.x - b.x);
          const currentAngle = Math.atan2(b.vy, b.vx);
          
          if (b.homingTurnSpeed || b.turnRate) {
            const turnRate = b.homingTurnSpeed || b.turnRate || 0.05;
            let diff = Phaser.Math.Angle.Wrap(targetAngle - currentAngle);
            const newAngle = currentAngle + diff * (turnRate * (dtSec / (1/60))); // normalized to 60fps
            const speed = b.speed || Math.hypot(b.vx, b.vy);
            b.vx = Math.cos(newAngle) * speed;
            b.vy = Math.sin(newAngle) * speed;
          } else if (b.homingSpeed) {
            const targetVx = Math.cos(targetAngle) * b.homingSpeed;
            const targetVy = Math.sin(targetAngle) * b.homingSpeed;
            b.vx += (targetVx - b.vx) * 0.04;
            b.vy += (targetVy - b.vy) * 0.04;
          } else {
            let diff = Phaser.Math.Angle.Wrap(targetAngle - currentAngle);
            const turnRate = 0.05;
            const newAngle = currentAngle + diff * turnRate;
            const speed = Math.hypot(b.vx, b.vy);
            b.vx = Math.cos(newAngle) * speed;
            b.vy = Math.sin(newAngle) * speed;
          }
        }

        if (b.isCandleFlame) {
          b.swayPhase = (b.swayPhase || 0) + 3 * dtSec;
          b.x += Math.sin(b.swayPhase) * 0.8;
        }

        if (b.isAccelerating) {
          b.speed += (b.accel || 140) * dtSec;
          const currentDir = Math.atan2(b.vy, b.vx);
          b.vx = Math.cos(currentDir) * b.speed;
          b.vy = Math.sin(currentDir) * b.speed;
        }

        b.x += b.vx * dtSec;
        b.y += b.vy * dtSec;

        if (b.trail !== undefined) {
          b.trailTimer = (b.trailTimer || 0) + delta;
          if (b.trailTimer > 40) {
            b.trail.push({ x: b.x, y: b.y, alpha: 0.5 });
            if (b.trail.length > 3) b.trail.shift();
            b.trailTimer = 0;
          }
        }

        if (b.lifespan !== undefined || b.life !== undefined) {
          if (b.lifespan !== undefined) {
            b.lifespan -= dtSec;
            if (b.lifespan <= 0) {
              b.active = false;
              this.bullets.splice(i, 1);
              if (b.onExplode) b.onExplode(b.x, b.y);
              continue;
            }
          } else {
            b.life -= delta;
            if (b.life <= 0) {
              b.active = false;
              this.bullets.splice(i, 1);
              if (b.onExplode) b.onExplode(b.x, b.y);
              continue;
            }
          }
        }

        let bounced = false;
        
        if (b.bounces !== undefined && b.bounces > 0) {
          if (b.x - b.radius < this.arena.x) {
            b.x = this.arena.x + b.radius;
            b.vx *= -1;
            b.bounces--;
            bounced = true;
          } else if (b.x + b.radius > this.arena.x + this.arena.w) {
            b.x = this.arena.x + this.arena.w - b.radius;
            b.vx *= -1;
            b.bounces--;
            bounced = true;
          }

          if (b.y - b.radius < this.arena.y) {
            b.y = this.arena.y + b.radius;
            b.vy *= -1;
            b.bounces--;
            bounced = true;
          } else if (b.y + b.radius > this.arena.y + this.arena.h) {
            b.y = this.arena.y + this.arena.h - b.radius;
            b.vy *= -1;
            b.bounces--;
            bounced = true;
          }

          if (bounced && b.bounceHome && !b.homing) {
            b.homing = true;
            const speedMultiplier = b.speedMult || 1.25;
            const speed = Math.hypot(b.vx, b.vy) * speedMultiplier;
            const ang = Math.atan2(b.vy, b.vx);
            b.vx = Math.cos(ang) * speed;
            b.vy = Math.sin(ang) * speed;
          }
        } else {
          // Standard despawn logic with margin
          const margin = b.margin !== undefined ? b.margin : 30;
          if (b.x + b.radius < this.arena.x - margin || b.x - b.radius > this.arena.x + this.arena.w + margin ||
              b.y + b.radius < this.arena.y - margin || b.y - b.radius > this.arena.y + this.arena.h + margin) {
            b.active = false;
            this.bullets.splice(i, 1);
            continue;
          }
        }

        // Draw trail if exists
        if (b.trail) {
          for (let t = 0; t < b.trail.length; t++) {
            const tr = b.trail[t];
            const trailAlpha = (t + 1) / (b.trail.length + 1) * 0.35;
            const trailSize = b.radius * (0.4 + (t / b.trail.length) * 0.4);
            this.bulletGraphics.fillStyle(b.color || 0xff5533, trailAlpha);
            this.bulletGraphics.fillCircle(tr.x, tr.y, trailSize);
          }
        }

        const alpha = b.lifespan !== undefined ? Math.min(0.9, b.lifespan) : 0.9;
        
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

          this.bulletGraphics.fillStyle(b.color || 0x2dd4bf, alpha);
          this.bulletGraphics.fillTriangle(tipX, tipY, leftX, leftY, rightX, rightY);
          this.bulletGraphics.fillStyle(0xa855f7, alpha);
          this.bulletGraphics.fillCircle(tipX, tipY, 3);
        } else {
          // Outer glow aura
          this.bulletGraphics.fillStyle(b.color || 0xff5533, 0.2 * alpha);
          this.bulletGraphics.fillCircle(b.x, b.y, b.radius + 4);
          
          // Main body
          this.bulletGraphics.fillStyle(b.color || 0xf5a0c0, alpha);
          this.bulletGraphics.fillCircle(b.x, b.y, b.radius);
          
          // White hot core
          this.bulletGraphics.fillStyle(0xffffff, 0.85 * alpha);
          this.bulletGraphics.fillCircle(b.x, b.y, b.radius * 0.45);
        }

        if (Phaser.Math.Distance.Between(this.soul.x, this.soul.y, b.x, b.y) < b.radius + this.soulRadius) {
          this.triggerPlayerHit();
          return;
        }
      }
    }
  }

  triggerPlayerHit() {
    if (this.isInvincible) return;

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
    this.isPaused = true;
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

    const blackBg = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 1.0);
    blackBg.setInteractive();

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
      btnBg.setStrokeStyle(3, this.currentRainbowColor || 0x43b5e8);
      respawnBtn.setColor(this.currentRainbowColorStr || "#43b5e8");
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
        this.dialogueText.setText("The fragment is clear...").setVisible(true);
        this.time.delayedCall(2500, () => {
          this.dialogueText.setVisible(false);
          if (this.onCompleteCallback) {
            this.onCompleteCallback();
          } else if (this.returnScene) {
            if (this.audioManager) this.audioManager.stopMusic();
            this.scene.stop();
            this.scene.resume(this.returnScene);
          }
        });
      }
    });
  }

  // --- Helper math logic ---
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
}

