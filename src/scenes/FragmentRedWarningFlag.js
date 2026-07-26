import Phaser from "phaser";
import { getEssence, setEssence } from "../save.js";

export class BulletHellScene extends Phaser.Scene {
  constructor() {
    super("BulletHellScene");
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

    this.soulName = data.soulName || "The Last Fisherman";
    this.dodgeLines = data.dodgeLines || [
      "The sea is unforgiving!",
      "Can you withstand the tide?",
      "Hold fast to your memory!"
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
    if (!this.textures.exists("red-warning-flag")) {
      this.load.image("red-warning-flag", "src/assets/grave1-elements/bullet-scenes/red-warning-flag.png");
    }
  }

  getDefaultRiddles() {
    return [
      {
        question: "I leave before dawn and return when the sky turns orange. The sea is my floor and patience is my tool. What am I?",
        choices: ["A) A fisherman", "B) A sailor", "C) A diver", "D) A farmer"],
        answer: "A) A fisherman"
      },
      {
        question: "I am woven from rope and wood, I hold what the ocean gives, but I am not a boat. What am I?",
        choices: ["A) A net", "B) A basket", "C) A trap", "D) A raft"],
        answer: "A) A net"
      },
      {
        question: "Every morning he untangled me before the boat left shore. Every evening he folded me back with care. What am I?",
        choices: ["A) His net", "B) His sail", "C) His rope", "D) His shirt"],
        answer: "A) His net"
      },
      {
        question: "My family waits on shore. I carry today's catch in my arms. The salt is still on my skin. Who am I going home to?",
        choices: ["A) His crew", "B) His wife and children", "C) His father", "D) No one"],
        answer: "B) His wife and children"
      },
      {
        question: "He cast his line every morning not for glory, not for gold — only so they would not go hungry. What drove him?",
        choices: ["A) Duty", "B) Habit", "C) Love", "D) Fear"],
        answer: "C) Love"
      }
    ];
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;

    // 1. Full-Screen Opaque Backdrop (Input Blocker)
    const bg = this.add.rectangle(centerX, height / 2, width, height, 0x050508, 1.0);
    bg.setInteractive(); // Consumes all mouse/pointer events so map behind is not clickable

    // Set main background to the Red Warning Flag
    this.bg = this.add.image(this.scale.width / 2, this.scale.height / 2, "red-warning-flag");
    this.bg.setDisplaySize(this.scale.width, this.scale.height);
    this.bg.setAlpha(0.6);

    // 2. Play Area Container (The Box)
    this.boxCenterX = centerX;
    this.boxWidth = 480;
    this.boxCenterY = 270;
    this.boxHeight = 10; // Starts small, will tween to Dialogue height

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

    // Keyboard controls
    this.soulRadius = 5;
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,S,A,D");

    // 3. UI Construction
    this.createCrystalHPUI(centerX);
    this.createSoulHPUI(centerX);
    this.createRiddleUI(centerX);

    // Initial Box Render
    this.updateArenaBounds();
    this.drawBox();

    // 4. Start Flow
    this.startIntroSequence();
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

    // Corner rivets (4 corners)
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
    // Soul Title
    this.add.text(centerX, 25, `[${this.soulName.toUpperCase()}]`, {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "12px",
      color: "#2dd4bf"
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
    this.crystalEnemy.play("fragment-anim");

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
        this.crystalIcons[i].setTint(0x2dd4bf); // Glowing cyan intact
        this.crystalIcons[i].setAlpha(1.0);
      } else {
        this.crystalIcons[i].setTint(0x333333); // Cracked dark grey shattered
        this.crystalIcons[i].setAlpha(0.4);
      }
    }
  }

  shatterCrystalParticle(targetX, targetY) {
    // Particle burst on shattered crystal
    for (let i = 0; i < 16; i++) {
      const p = this.add.rectangle(targetX, targetY, 4, 4, 0x2dd4bf);
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
    // ADJUST VINO HP POSITION HERE:
    const vinoHpX = centerX - 225;  // Left starting X position
    const vinoHpY = 445;            // Y position below Timer Bar
    const heartSpacing = 28;        // Gap between hearts
    const heartOffsetFromText = 50; // Distance from VINO label to first heart

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
        if (this.soulTweens[i] && !this.soulTweens[i].isPlaying()) {
          this.soulTweens[i].resume();
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

    // Timer Bar ABOVE Vino HP (Y = 410)
    const timerY = 410;
    this.timerBarBg = this.add.rectangle(centerX, timerY, 480, 10, 0x000000);
    this.timerBarBg.setStrokeStyle(2, 0xffffff);

    this.timerBarFill = this.add.rectangle(centerX - 240, timerY, 480, 10, 0x2dd4bf).setOrigin(0, 0.5);
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

      const introLine = "The sea remembers what men forget...\nProve your soul remembers.";
      this.typewriterDialogue(introLine, () => {
        this.waitForAdvance(() => {
          this.transitionToRiddle();
        });
      });
    });
  }

  transitionToRiddle() {
    this.state = "TWEEN_TO_RIDDLE";
    this.clearTextAndTimers();
    this.setChoiceButtonsState("HIDDEN");
    this.setRiddleUIElementsVisible(false); // Hide timer

    this.tweenBoxHeight(10, () => {
      this.tweenBoxHeight(this.HEIGHT_RIDDLE, () => {
        this.setRiddleUIElementsVisible(true);
        this.startRiddlePhase();
      });
    });
  }

  setRiddleUIElementsVisible(visible) {
    // Only used for the timer bars now
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

    // Select a random riddle from the remaining pool
    if (!this.remainingRiddles || this.remainingRiddles.length === 0) {
      this.remainingRiddles = Phaser.Utils.Array.Shuffle([...this.riddleList]);
    }
    this.currentRiddle = Phaser.Utils.Array.GetRandom(this.remainingRiddles);

    this.questionText.setOrigin(0, 0);
    this.questionText.setPosition(this.boxCenterX - this.boxWidth / 2 + 25, this.boxCenterY - 35);
    this.questionText.setAlign("left");
    this.questionText.setVisible(true);
    this.dialogueText.setVisible(false);

    this.currentRiddle.choices.forEach((choiceText, i) => {
      this.buttons[i].text.setText(choiceText);
      this.buttons[i].bg.setFillStyle(0x000000);
      this.buttons[i].text.setColor("#ffffff");
      this.buttons[i].bg.setStrokeStyle(3, 0xffffff);
    });

    this.setChoiceButtonsState("HIDDEN");
    this.setRiddleUIElementsVisible(false);

    this.typewriterText(this.questionText, this.currentRiddle.question, 16, () => {
      this.state = "RIDDLE";
      const durations = [15000, 10000, 7000, 5000];
      this.phaseTimer = durations[Math.min(this.retryAttempt, 3)];
      this.maxPhaseTimer = this.phaseTimer;

      this.timerBarFill.width = 480;
      this.timerBarFill.setFillStyle(0x2dd4bf);
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
        clickedBtn.bg.setFillStyle(0x2dd4bf);
        clickedBtn.text.setColor("#000000");
        clickedBtn.bg.setStrokeStyle(3, 0x2dd4bf);
      }
      this.flashBoxColor(0x2dd4bf);
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

    // Step 1: Particle burst at crystal icon position
    const shatteredIcon = this.crystalIcons[this.crystalHP - 1];
    this.shatterCrystalParticle(shatteredIcon.x, shatteredIcon.y);

    // Step 2: Shatter crystal HP
    this.crystalHP--;
    this.updateCrystalHPUI();

    // Remove answered riddle from pool so it doesn't repeat
    if (this.currentRiddle && this.remainingRiddles) {
      const idx = this.remainingRiddles.indexOf(this.currentRiddle);
      if (idx > -1) this.remainingRiddles.splice(idx, 1);
    }

    // Step 3: Check Win Condition
    if (this.crystalHP <= 0) {
      // BATTLE WON!
      this.time.delayedCall(1500, () => {
        if (this.onCompleteCallback) this.onCompleteCallback();
      });
      return;
    }

    // Step 4: Advance to Next Crystal with reaction dialogue
    const reactionLines = [
      "You know the way of the tide...",
      "The net holds true.",
      "Care for the tools, care for the family.",
      "Ah... the shore calls to every fisherman."
    ];

    const line = reactionLines[6 - this.crystalHP - 1] || "Impression restored...";
    this.retryAttempt = 0; // Reset timer retry for new crystal

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
            this.transitionToRiddle();
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

    // Tween box to full height (260px)
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

    // Buffer Delay: 300ms pause after tween before projectiles start
    this.time.delayedCall(300, () => {
      if (this.state === "DODGE_WAIT") {
        this.startDodgePhase();
      }
    });
  }

  cleanupProjectiles() {
    if (this.bulletGraphics) {
      this.bulletGraphics.clear();
    }
    this.bullets.forEach(b => {
      if (b.graphics && b.graphics.active) b.graphics.destroy();
    });
    this.bullets = [];
    this.lasers.forEach(l => {
      if (l.graphics) l.graphics.destroy();
    });
    this.lasers = [];
    if (this.patternTimers) {
      this.patternTimers.forEach(t => t.destroy());
      this.patternTimers = [];
    }
    this.activeWarnings.forEach(w => w.destroy());
    this.activeWarnings = [];
  }

  getCurrentPhase() {
    if (this.crystalHP >= 4) return 1; // Phase 1: HP 6, 5, 4 (Half or more crystals)
    if (this.crystalHP >= 2) return 2; // Phase 2: HP 3, 2 (Below half crystals)
    return 3;                          // Phase 3: HP 1 (Desperation state)
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
      // Phase 1 (HP 6, 5, 4): Random 1 of 3 core patterns
      const pool1 = [1, 2, 5];
      const choice = Phaser.Utils.Array.GetRandom(pool1);
      this.executePattern(choice);
    } else if (phase === 2) {
      // Phase 2 (HP 3, 2): Unlocks 2 new patterns (3: SweepingLaser, 4: ShrinkingGrid)
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
      // Phase 3 (HP 1): Desperation State!
      this.isDesperation = true;
      this.phaseTimer = 14000;
      this.maxPhaseTimer = 14000;

      // Visual Cue: Crystal pulses deep red
      this.crystalEnemy.setTint(0xff1111);

      // Curated non-conflicting combo pairs
      const comboPairs = [
        [1, 5], // CircleBlast + SpotlightBurst (aimed rings + delayed explosions)
        [1, 4], // CircleBlast + ThunderSplitter (rings + arena splitter)
        [1, 3]  // CircleBlast + SweepingLaser (rings + single laser sweeps)
      ];
      const pair = Phaser.Utils.Array.GetRandom(comboPairs);
      this.executePattern(pair[0]);
      this.executePattern(pair[1]);
    }
  }

  executePattern(patternId) {
    const desp = this.isDesperation;
    const duration = desp ? 14000 : 10000;
    
    if (patternId === 1) { // CircleBlast
      // Fire every 2000ms
      for (let t = 0; t < duration; t += 2000) {
        this.patternTimers.push(this.time.delayedCall(t, () => this.fireCircleBlast()));
      }
    } else if (patternId === 2) { // WaveGrid
      // Fire every 1500ms, increasing speed slightly each time
      const baseSpeed = desp ? 75 : 85;
      let speedInc = 0;
      for (let t = 0; t < duration; t += 1500) {
        const speed = baseSpeed + speedInc;
        this.patternTimers.push(this.time.delayedCall(t, () => this.fireWaveGrid(speed)));
        speedInc += 20;
      }
    } else if (patternId === 3) { // SweepingLaser
      // Fire every 2400ms (to give slight overlap or tight pacing)
      for (let t = 500; t < duration; t += 2400) {
        this.patternTimers.push(this.time.delayedCall(t, () => this.fireSweepingLaser()));
      }
    } else if (patternId === 4) { // ThunderSplitter
      this.fireThunderSplitter(duration);
    } else if (patternId === 5) { // SpotlightBurst
      // Fire every 3000ms
      for (let t = 0; t < duration; t += 3000) {
        this.patternTimers.push(this.time.delayedCall(t, () => this.fireSpotlightBurst()));
      }
    }
  }

  // --- PATTERN METHODS ---
  // Pattern 1: Spiral Ring Burst — Balanced
  fireCircleBlast() {
    if (this.state !== "DODGE") return;
    const count = this.isDesperation ? 10 : 12;
    const radius = 60;
    const centerX = this.crystalEnemy.x;
    const centerY = this.crystalEnemy.y;
    const ringBullets = [];
    const formTime = 300;

    for (let i = 0; i < count; i++) {
      this.patternTimers.push(this.time.delayedCall(i * (formTime / count), () => {
        if (this.state !== "DODGE") return;
        const angle = i * ((2 * Math.PI) / count) + (Math.PI / 4);
        const bx = centerX + radius * Math.cos(angle);
        const by = centerY + radius * Math.sin(angle);

        const bullet = { x: bx, y: by, vx: 0, vy: 0, radius: 4 };
        this.bullets.push(bullet);
        ringBullets.push(bullet);
      }));
    }

    this.patternTimers.push(this.time.delayedCall(formTime + 50, () => {
      if (this.state !== "DODGE" || !this.soul) return;
      const targetX = this.soul.x;
      const targetY = this.soul.y;
      const speed = this.isDesperation ? 240 : 275;

      ringBullets.forEach(b => {
        if (this.bullets.includes(b)) {
          const angle = Phaser.Math.Angle.Between(b.x, b.y, targetX, targetY);
          b.vx = Math.cos(angle) * speed;
          b.vy = Math.sin(angle) * speed;
          b.speed = speed;
          b.isHoming = true;
          b.homingTurnSpeed = 1;
        }
      });
    }));
  }

  // Pattern 2: Accelerating Sine Waves — Balanced
  fireWaveGrid(baseSpeed) {
    if (this.state !== "DODGE") return;
    const arenaX = this.arena.x;
    const arenaY = this.arena.y;
    const arenaW = this.arena.w;

    const count = 10; // Increased columns slightly
    const step = arenaW / (count + 1);
    const phaseOffset = Math.random() * Math.PI * 2; // Randomize phase per wave

    for (let i = 1; i <= count; i++) {
      // Skip 3 positions per wave for readable gaps
      if (i === 2 || i === 6 || i === 8) continue;
      const baseX = arenaX + step * i;
      const sineShift = Math.sin(i * 0.8 + phaseOffset) * 12;
      this.bullets.push({
        x: baseX + sineShift,
        y: arenaY,
        vx: Math.cos(phaseOffset) * 15,
        vy: baseSpeed,
        radius: 4,
        bounces: 1
      });
    }
  }

  // Pattern 3: Thunder Strike Sweeping Lasers — Balanced & Visually Stunning
  fireSingleLaserSweep(directionIndex, onCompleteCallback) {
    if (this.state !== "DODGE") return;
    const { x, y, w, h } = this.arena;
    let startX, startY, endX, endY, laserW, laserH, warnX, warnY, warnW, warnH;
    const sweepDuration = this.isDesperation ? 1300 : 1800;

    if (directionIndex === 0) {
      // Left vertical beam sweeping Right until middle
      startX = x; startY = y;
      endX = x + w / 2 - 6; endY = y;
      laserW = 12; laserH = h;
      warnX = x; warnY = y; warnW = w / 2; warnH = h;
    } else if (directionIndex === 1) {
      // Right vertical beam sweeping Left until middle
      startX = x + w - 12; startY = y;
      endX = x + w / 2 - 6; endY = y;
      laserW = 12; laserH = h;
      warnX = x + w / 2; warnY = y; warnW = w / 2; warnH = h;
    } else if (directionIndex === 2) {
      // Top horizontal beam sweeping Down until middle
      startX = x; startY = y;
      endX = x; endY = y + h / 2 - 6;
      laserW = w; laserH = 12;
      warnX = x; warnY = y; warnW = w; warnH = h / 2;
    } else {
      // Bottom horizontal beam sweeping Up until middle
      startX = x; startY = y + h - 12;
      endX = x; endY = y + h / 2 - 6;
      laserW = w; laserH = 12;
      warnX = x; warnY = y + h / 2; warnW = w; warnH = h / 2;
    }

    const isVertical = laserH > laserW;

    // Thunder Strike warning: quick white flash then animated stripes
    const warn = this.add.graphics();
    this.activeWarnings.push(warn);
    let warnBlink = 0;
    const warnTimer = this.time.addEvent({
      delay: 120,
      repeat: 5,
      callback: () => {
        if (!warn || !warn.active) return;
        warn.clear();
        warnBlink++;
        const alpha = (warnBlink % 2 === 0) ? 0.35 : 0.12;
        warn.fillStyle(0x3b82f6, alpha);
        warn.fillRect(warnX, warnY, warnW, warnH);
        // Animated dashed border
        warn.lineStyle(2, 0x60a5fa, 0.6);
        warn.strokeRect(warnX + 2, warnY + 2, warnW - 4, warnH - 4);
      }
    });
    this.patternTimers.push(warnTimer);

    this.patternTimers.push(this.time.delayedCall(800, () => {
      if (warn && warn.active) warn.destroy();
      if (this.state !== "DODGE") return;

      // Screen shake on activation
      this.cameras.main.shake(80, 0.003);

      const laser = { x: startX, y: startY, w: laserW, h: laserH, graphics: this.add.graphics(), life: 2800 };
      this.lasers.push(laser);

      // Generate jagged zigzag points for lightning effect
      const zigzagPoints = [];
      const segments = 12;
      for (let s = 0; s <= segments; s++) {
        const jitter = (s === 0 || s === segments) ? 0 : Phaser.Math.Between(-6, 6);
        zigzagPoints.push(jitter);
      }

      this.tweens.add({
        targets: laser,
        x: endX,
        y: endY,
        duration: sweepDuration,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          if (!laser.graphics || !laser.graphics.active) return;
          laser.graphics.clear();

          // Outer electric glow aura
          laser.graphics.fillStyle(0x3b82f6, 0.15);
          if (isVertical) {
            laser.graphics.fillRect(laser.x - 6, laser.y, laser.w + 12, laser.h);
          } else {
            laser.graphics.fillRect(laser.x, laser.y - 6, laser.w, laser.h + 12);
          }

          // Main beam body (electric blue)
          laser.graphics.fillStyle(0x3b82f6, 0.85);
          laser.graphics.fillRect(laser.x, laser.y, laser.w, laser.h);

          // Jagged zigzag lightning core
          laser.graphics.lineStyle(2, 0xffffff, 0.95);
          laser.graphics.beginPath();
          for (let s = 0; s <= segments; s++) {
            const t = s / segments;
            const jit = zigzagPoints[s] * (0.5 + Math.random() * 0.5);
            if (isVertical) {
              const px = laser.x + laser.w / 2 + jit;
              const py = laser.y + t * laser.h;
              if (s === 0) laser.graphics.moveTo(px, py);
              else laser.graphics.lineTo(px, py);
            } else {
              const px = laser.x + t * laser.w;
              const py = laser.y + laser.h / 2 + jit;
              if (s === 0) laser.graphics.moveTo(px, py);
              else laser.graphics.lineTo(px, py);
            }
          }
          laser.graphics.strokePath();

          // Random edge spark forks
          if (Math.random() < 0.4) {
            const sparkCount = Phaser.Math.Between(1, 3);
            for (let sp = 0; sp < sparkCount; sp++) {
              laser.graphics.lineStyle(1, 0x93c5fd, 0.7);
              if (isVertical) {
                const sx = laser.x + laser.w / 2;
                const sy = laser.y + Math.random() * laser.h;
                const forkLen = Phaser.Math.Between(4, 12);
                const forkDir = Math.random() < 0.5 ? -1 : 1;
                laser.graphics.beginPath();
                laser.graphics.moveTo(sx, sy);
                laser.graphics.lineTo(sx + forkLen * forkDir, sy + Phaser.Math.Between(-4, 4));
                laser.graphics.strokePath();
              } else {
                const sx = laser.x + Math.random() * laser.w;
                const sy = laser.y + laser.h / 2;
                const forkLen = Phaser.Math.Between(4, 12);
                const forkDir = Math.random() < 0.5 ? -1 : 1;
                laser.graphics.beginPath();
                laser.graphics.moveTo(sx, sy);
                laser.graphics.lineTo(sx + Phaser.Math.Between(-4, 4), sy + forkLen * forkDir);
                laser.graphics.strokePath();
              }
            }
          }
        },
        onComplete: () => {
          this.patternTimers.push(this.time.delayedCall(200, () => {
            if (laser.graphics && laser.graphics.active) laser.graphics.destroy();
            const idx = this.lasers.indexOf(laser);
            if (idx > -1) this.lasers.splice(idx, 1);
            if (onCompleteCallback) onCompleteCallback();
          }));
        }
      });
    }));
  }

  fireSweepingLaser() {
    if (this.state !== "DODGE") return;
    const verticalDirs = [0, 1];
    const horizontalDirs = [2, 3];

    let currentPlane = (this.lastLaserPlane === "vertical") ? "horizontal" : "vertical";
    const pool = (currentPlane === "vertical") ? verticalDirs : horizontalDirs;
    const dir = Phaser.Utils.Array.GetRandom(pool);
    this.lastLaserPlane = currentPlane;

    this.fireSingleLaserSweep(dir);
  }

  // Pattern 4: Thunder Arena Splitter + Homing Orbs
  fireThunderSplitter(duration) {
    if (this.state !== "DODGE") return;
    const { x, y, w, h } = this.arena;

    // 1. Helper function to spawn 2 static vertical lasers for a given cycle duration
    const spawnLasers = (startTime, cycleDuration) => {
      this.patternTimers.push(this.time.delayedCall(startTime, () => {
        if (this.state !== "DODGE") return;

        // Warn for 1 second before lasers appear
        const warn = this.add.graphics();
        this.activeWarnings.push(warn);
        let pulse = 0;
        const warnTimer = this.time.addEvent({
          delay: 150,
          repeat: 6,
          callback: () => {
            if (!warn || !warn.active) return;
            warn.clear();
            pulse++;
            const alpha = (pulse % 2 === 0) ? 0.3 : 0.1;
            warn.fillStyle(0x3b82f6, alpha);
            warn.fillRect(laser1X, y, laserW, laserH);
            warn.fillRect(laser2X, y, laserW, laserH);
            warn.lineStyle(2, 0x60a5fa, 0.6);
            warn.strokeRect(laser1X, y, laserW, laserH);
            warn.strokeRect(laser2X, y, laserW, laserH);
          }
        });
        this.patternTimers.push(warnTimer);

        // After 1 second, activate lasers
        this.patternTimers.push(this.time.delayedCall(1050, () => {
          if (warn && warn.active) warn.destroy();
          if (this.state !== "DODGE") return;

          this.cameras.main.shake(150, 0.005);

          // Create solid lasers
          const laserLife = cycleDuration - 1050;
          const l1 = { x: laser1X, y: y, w: laserW, h: laserH, graphics: this.add.graphics(), life: laserLife };
          const l2 = { x: laser2X, y: y, w: laserW, h: laserH, graphics: this.add.graphics(), life: laserLife };
          this.lasers.push(l1, l2);

          const zigzagPoints1 = [];
          const zigzagPoints2 = [];
          const segments = 12;
          for (let s = 0; s <= segments; s++) {
            zigzagPoints1.push((s === 0 || s === segments) ? 0 : Phaser.Math.Between(-6, 6));
            zigzagPoints2.push((s === 0 || s === segments) ? 0 : Phaser.Math.Between(-6, 6));
          }

          const drawStaticLaser = (l, zigzags) => {
            if (!l.graphics || !l.graphics.active) return;
            l.graphics.clear();
            
            // Jitter zigzag points slightly
            for (let s = 1; s < segments; s++) {
              zigzags[s] += Phaser.Math.Between(-2, 2);
              zigzags[s] = Phaser.Math.Clamp(zigzags[s], -8, 8);
            }

            // Electric glow
            l.graphics.fillStyle(0x3b82f6, 0.15);
            l.graphics.fillRect(l.x - 6, l.y, l.w + 12, l.h);
            // Solid core
            l.graphics.fillStyle(0x3b82f6, 0.85);
            l.graphics.fillRect(l.x, l.y, l.w, l.h);
            // Jagged zigzag lightning core
            l.graphics.lineStyle(2, 0xffffff, 0.95);
            l.graphics.beginPath();
            for (let s = 0; s <= segments; s++) {
              const t = s / segments;
              const px = l.x + l.w / 2 + zigzags[s];
              const py = l.y + t * l.h;
              if (s === 0) l.graphics.moveTo(px, py);
              else l.graphics.lineTo(px, py);
            }
            l.graphics.strokePath();

            // Random edge spark forks
            if (Math.random() < 0.4) {
              const sparkCount = Phaser.Math.Between(1, 3);
              for (let sp = 0; sp < sparkCount; sp++) {
                l.graphics.lineStyle(1, 0x93c5fd, 0.7);
                const sx = l.x + l.w / 2;
                const sy = l.y + Math.random() * l.h;
                const forkLen = Phaser.Math.Between(4, 12);
                const forkDir = Math.random() < 0.5 ? -1 : 1;
                l.graphics.beginPath();
                l.graphics.moveTo(sx, sy);
                l.graphics.lineTo(sx + forkLen * forkDir, sy + Phaser.Math.Between(-4, 4));
                l.graphics.strokePath();
              }
            }
          };

          drawStaticLaser(l1, zigzagPoints1);
          drawStaticLaser(l2, zigzagPoints2);

          this.tweens.add({
            targets: [l1, l2],
            alpha: 1, // dummy
            duration: laserLife,
            onUpdate: () => {
              if (l1.graphics) drawStaticLaser(l1, zigzagPoints1);
              if (l2.graphics) drawStaticLaser(l2, zigzagPoints2);
            },
            onComplete: () => {
              if (l1.graphics && l1.graphics.active) l1.graphics.destroy();
              if (l2.graphics && l2.graphics.active) l2.graphics.destroy();
              const idx1 = this.lasers.indexOf(l1);
              if (idx1 > -1) this.lasers.splice(idx1, 1);
              const idx2 = this.lasers.indexOf(l2);
              if (idx2 > -1) this.lasers.splice(idx2, 1);
            }
          });
        }));
      }));
    };

    // Trigger two cycles of the lasers (halfway through, they reset)
    const half = duration / 2;
    spawnLasers(0, half);
    spawnLasers(half, half);

    // Spawn 2 massive tracking orbs every 4 seconds
    for (let t = 1500; t < duration; t += 4000) {
      this.patternTimers.push(this.time.delayedCall(t, () => {
        if (this.state !== "DODGE" || !this.soul) return;

        const spawnX = this.crystalEnemy.x;
        const spawnY = this.crystalEnemy.y;
        
        // Massive slow-moving tracking orb
        const speed = this.isDesperation ? 75 : 60;
        const radius = 20; // Very large orb
        
        const createOrb = (xOffset) => {
          return {
            x: spawnX + xOffset,
            y: spawnY,
            vx: 0,
            vy: 0,
            radius: radius,
            isHoming: true,
            homingSpeed: speed,
            color: 0x2dd4bf, // Cyan soul orb style (like Pattern 1)
            trail: [],
            life: 3000, // Explode after 3 seconds
            onExplode: (ex, ey) => {
              if (this.state !== "DODGE") return;

              // Explosion Damage check (radius * 2.5)
              if (this.soul) {
                const dist = Phaser.Math.Distance.Between(this.soul.x, this.soul.y, ex, ey);
                if (dist < radius * 2.5 + this.soulRadius) {
                  this.triggerHit();
                }
              }

              // Electric explosion visual effect
              this.cameras.main.shake(150, 0.008);
              const burst = this.add.graphics();
              let bPulse = 0;
              const expTimer = this.time.addEvent({
                delay: 30,
                repeat: 8,
                callback: () => {
                  if (!burst || !burst.active) return;
                  burst.clear();
                  bPulse++;
                  const a = 1 - (bPulse / 9);
                  burst.fillStyle(0xffffff, a);
                  burst.fillCircle(ex, ey, radius * 1.5 + bPulse * 2);
                  burst.lineStyle(3, 0x3b82f6, a); // Electric blue
                  burst.strokeCircle(ex, ey, radius * 2 + bPulse * 4);
                  
                  // Jagged sparks
                  if (bPulse % 2 !== 0) {
                    for (let i = 0; i < 5; i++) {
                      const angle = Math.random() * Math.PI * 2;
                      const len = Phaser.Math.Between(15, 35);
                      burst.lineStyle(2, 0xffffff, a);
                      burst.beginPath();
                      burst.moveTo(ex, ey);
                      burst.lineTo(ex + Math.cos(angle)*len, ey + Math.sin(angle)*len);
                      burst.strokePath();
                    }
                  }
                }
              });
              this.patternTimers.push(expTimer);

              this.time.delayedCall(300, () => {
                if (burst) burst.destroy();
              });
            }
          };
        };

        this.bullets.push(createOrb(-30), createOrb(30));
      }));
    }
  }

  // Pattern 5: Tracking Spotlight Follower — Balanced
  fireSpotlightBurst() {
    if (this.state !== "DODGE") return;
    const { x, y, w, h } = this.arena;
    const padding = 30;
    const desp = this.isDesperation;

    const fireSpot = () => {
      if (this.state !== "DODGE" || !this.soul) return;

      const warning = this.add.circle(this.soul.x, this.soul.y, 30, 0xffffff, 0);
      warning.setStrokeStyle(2, 0xffffff, 0.5);
      this.activeWarnings.push(warning);

      const exclText = this.add.text(this.soul.x, this.soul.y, "!", {
        fontFamily: "'Press Start 2P', monospace",
        fontSize: "16px",
        color: "#ffffff"
      }).setOrigin(0.5);
      this.activeWarnings.push(exclText);

      // Track player soul position for 1.5s
      this.tweens.add({
        targets: warning,
        duration: 1200,
        onUpdate: () => {
          if (warning && warning.active && this.soul) {
            warning.x = Phaser.Math.Clamp(this.soul.x, x + padding, x + w - padding);
            warning.y = Phaser.Math.Clamp(this.soul.y, y + padding, y + h - padding);
            if (exclText && exclText.active) {
              exclText.setPosition(warning.x, warning.y);
            }
          }
        },
        onComplete: () => {
          if (!warning || !warning.active) return;
          const lockedX = warning.x;
          const lockedY = warning.y;

          // Lock down for 1100ms (more reaction time)
          warning.setStrokeStyle(3, 0xff4444, 0.9);
          warning.setFillStyle(0xff0000, 0.15);
          if (exclText && exclText.active) {
            exclText.setColor("#ff4444");
            exclText.setPosition(lockedX, lockedY);
          }

          this.tweens.add({
            targets: [warning, exclText],
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 1100,
            onComplete: () => {
              if (warning && warning.active) warning.destroy();
              if (exclText && exclText.active) exclText.destroy();
              if (this.state !== "DODGE") return;

              // Detonate into 6-directional radial burst (reduced from 8)
              const burstSpeed = desp ? 160 : 180;
              const angles = [0, 60, 120, 180, 240, 300];
              angles.forEach(deg => {
                const rad = Phaser.Math.DegToRad(deg);
                this.bullets.push({
                  x: lockedX,
                  y: lockedY,
                  vx: Math.cos(rad) * burstSpeed,
                  vy: Math.sin(rad) * burstSpeed,
                  radius: 8
                });
              });
            }
          });
        }
      });
    };

    // Fire a single spot tracking sequence
    fireSpot();
  }

  cleanupProjectiles() {
    if (this.patternTimers && this.patternTimers.length > 0) {
      this.patternTimers.forEach(t => {
        if (t) {
          if (typeof t.remove === 'function') t.remove();
          else if (typeof t.destroy === 'function') t.destroy();
        }
      });
      this.patternTimers = [];
    }
    if (this.activeWarnings && this.activeWarnings.length > 0) {
      this.activeWarnings.forEach(w => {
        if (w && w.active) {
          this.tweens.killTweensOf(w);
          w.destroy();
        }
      });
      this.activeWarnings = [];
    }
    if (this.activeLasers && this.activeLasers.length > 0) {
      this.activeLasers.forEach(l => {
        if (l && l.active) {
          this.tweens.killTweensOf(l);
          l.destroy();
        }
      });
      this.activeLasers = [];
    }
    if (this.lasers && this.lasers.length > 0) {
      this.lasers.forEach(l => {
        if (l && l.graphics && l.graphics.active) {
          this.tweens.killTweensOf(l.graphics);
          l.graphics.destroy();
        }
      });
      this.lasers = [];
    }
    this.bullets = [];
    this.projectiles = this.bullets;
    if (this.bulletGraphics) {
      this.bulletGraphics.clear();
    }
  }

  // --- UPDATE LOOP & COLLISIONS ---
  update(time, delta) {
    if (this.state === "RIDDLE") {
      this.phaseTimer -= delta;
      this.timerBarFill.width = 480 * Math.max(0, this.phaseTimer / this.maxPhaseTimer);
      this.timerBarFill.setFillStyle(0x2dd4bf);

      if (this.phaseTimer <= 0) {
        this.startTryAgainDialogue();
      }
    } else if (this.state === "DODGE") {
      this.phaseTimer -= delta;

      if (this.phaseTimer <= 0) {
        // Dodge survived! Return to riddle with reduced timer
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

      // Soul Movement inside Dodge Box
      if (!this.soul) return;
      const speed = 190 * (delta / 1000);
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

      if (!this.bulletGraphics) {
        this.bulletGraphics = this.add.graphics();
      }
      this.bulletGraphics.clear();

      // Manage bullet trails for Soul Orb afterimages
      if (!this.bulletTrails) this.bulletTrails = [];

      // Bullet Physics & Collision — Soul Orb Visuals
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i];

        if (b.life !== undefined) {
          b.life -= delta;
          if (b.life <= 0) {
            this.bullets.splice(i, 1);
            if (b.onExplode) b.onExplode(b.x, b.y);
            continue;
          }
        }

        // Homing behavior for CircleBlast
        if (b.isHoming && this.soul) {
          const angle = Phaser.Math.Angle.Between(b.x, b.y, this.soul.x, this.soul.y);
          if (b.homingTurnSpeed) {
            // CircleBlast fast homing
            const currentAngle = Math.atan2(b.vy, b.vx);
            const newAngle = Phaser.Math.Angle.RotateTo(currentAngle, angle, b.homingTurnSpeed * (delta / 1000));
            b.vx = Math.cos(newAngle) * b.speed;
            b.vy = Math.sin(newAngle) * b.speed;
          } else if (b.homingSpeed) {
            // Massive orb slow creeping homing
            const targetVx = Math.cos(angle) * b.homingSpeed;
            const targetVy = Math.sin(angle) * b.homingSpeed;
            b.vx += (targetVx - b.vx) * 0.04;
            b.vy += (targetVy - b.vy) * 0.04;
          }
        }

        b.x += b.vx * (delta / 1000);
        b.y += b.vy * (delta / 1000);

        // Store trail position every few frames
        if (!b.trail) b.trail = [];
        b.trailTimer = (b.trailTimer || 0) + delta;
        if (b.trailTimer > 40) {
          b.trail.push({ x: b.x, y: b.y, alpha: 0.5 });
          if (b.trail.length > 3) b.trail.shift();
          b.trailTimer = 0;
        }

        const color = b.color || 0x2dd4bf;

        // Draw trail afterimages (fading smaller circles)
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

        const dist = Phaser.Math.Distance.Between(this.soul.x, this.soul.y, b.x, b.y);
        if (dist < this.soulRadius + b.radius) {
          this.triggerHit();
          return;
        }

        // Bouncing / Boundaries
        if (b.y > this.arena.y + this.arena.h) {
          if (b.bounces && b.bounces > 0) {
            b.vy *= -1;
            b.y = this.arena.y + this.arena.h;
            b.bounces--;
          } else {
            this.bullets.splice(i, 1);
          }
        } else if (b.x < 0 || b.x > this.scale.width || b.y < 0) {
          this.bullets.splice(i, 1);
        }
      }

      // Active Lasers Collision
      if (this.activeLasers) {
        this.activeLasers.forEach(laser => {
          if (!laser || !laser.active) return;
          // Horizontal laser (width > height)
          if (laser.width > laser.height) {
            if (Math.abs(this.soul.y - laser.y) < 6) this.triggerHit();
          }
          // Vertical laser (height > width)
          else {
            if (Math.abs(this.soul.x - laser.x) < 6) this.triggerHit();
          }
        });
      }

      // Laser Physics & Collision
      for (let i = this.lasers.length - 1; i >= 0; i--) {
        const l = this.lasers[i];
        l.life -= delta;

        // Standard sweeping laser / solid laser rectangle AABB collision check
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

    // Deduct Soul HP
    this.soulHP--;
    this.updateSoulHPUI();

    // Red screen flash
    const flash = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0xff0000, 0.5);

    this.time.delayedCall(180, () => {
      flash.destroy();

      if (this.soulHP <= 0) {
        if (this.onDeathCallback) this.onDeathCallback();
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
}
