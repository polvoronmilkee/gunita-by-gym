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

    this.crystalHP = 5;
    this.soulHP = 5;
    this.retryAttempt = 0;
    this.state = "INIT";
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

    // 2. Box Specifications
    this.boxWidth = 440;
    this.boxCenterX = centerX;
    this.boxCenterY = 270;
    this.boxHeight = 10; // Starts small, will tween to Dialogue height

    this.HEIGHT_DIALOGUE = 130;
    this.HEIGHT_RIDDLE = 130;
    this.HEIGHT_DODGE = 260;

    this.boxGraphics = this.add.graphics();

    // Group / Container setups
    this.bullets = [];
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

    // Outer fill & border
    this.boxGraphics.fillStyle(0x000000, 1);
    this.boxGraphics.fillRect(left, top, this.boxWidth, this.boxHeight);
    this.boxGraphics.lineStyle(4, 0xffffff, 1);
    this.boxGraphics.strokeRect(left, top, this.boxWidth, this.boxHeight);

    // Inner retro white border
    this.boxGraphics.lineStyle(2, 0xffffff, 1);
    this.boxGraphics.strokeRect(left + 6, top + 6, this.boxWidth - 12, this.boxHeight - 12);
  }

  flashBoxColor(colorHex) {
    const halfW = this.boxWidth / 2;
    const halfH = this.boxHeight / 2;
    const left = this.boxCenterX - halfW;
    const top = this.boxCenterY - halfH;

    this.boxGraphics.clear();
    this.boxGraphics.fillStyle(0x000000, 1);
    this.boxGraphics.fillRect(left, top, this.boxWidth, this.boxHeight);
    this.boxGraphics.lineStyle(4, colorHex, 1);
    this.boxGraphics.strokeRect(left, top, this.boxWidth, this.boxHeight);
    this.boxGraphics.lineStyle(2, colorHex, 1);
    this.boxGraphics.strokeRect(left + 6, top + 6, this.boxWidth - 12, this.boxHeight - 12);

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

    // 5 Crystal HP Icons
    this.crystalIcons = [];
    for (let i = 0; i < 5; i++) {
      const icon = this.add.sprite(centerX - 60 + i * 30, 50, "fragment-main");
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
    for (let i = 0; i < 5; i++) {
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

      const btnBg = this.add.rectangle(pos.x, pos.y, 250, 38, 0x000000).setInteractive({ cursor: "pointer" });
      btnBg.setStrokeStyle(3, 0xffffff);

      const btnText = this.add.text(pos.x, pos.y, "", {
        fontFamily: "'Press Start 2P', monospace",
        fontSize: "8px",
        color: "#ffffff"
      }).setOrigin(0.5);

      btnBg.on("pointerover", () => {
        if (this.state !== "RIDDLE") return;
        btnBg.setFillStyle(0xb07eff);
        btnText.setColor("#000000");
        btnBg.setStrokeStyle(3, 0xb07eff);
      });

      btnBg.on("pointerout", () => {
        if (this.state !== "RIDDLE") return;
        btnBg.setFillStyle(0x000000);
        btnText.setColor("#ffffff");
        btnBg.setStrokeStyle(3, 0xffffff);
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
    if (this.soul) {
      this.soul.destroy();
      this.soul = null;
    }
    if (this.bulletGraphics) {
      this.bulletGraphics.clear();
    }
    this.bullets = [];
    this.lasers.forEach(l => {
      if (l.graphics) l.graphics.destroy();
    });
    this.lasers = [];
    if (this.patternTimers) {
      this.patternTimers.forEach(t => t.destroy());
      this.patternTimers = [];
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
      this.dialogueText.setText("Your heart is pure, Vino. Memory Restored!");
      this.time.delayedCall(2000, () => {
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

    const line = reactionLines[this.currentRiddleIndex] || "Impression restored...";
    this.currentRiddleIndex++;
    this.retryAttempt = 0; // Reset timer retry for new crystal

    if (this.soul) {
      this.soul.destroy();
      this.soul = null;
    }

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
    if (this.soul) {
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
    if (this.soul) {
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

  startDodgePhase() {
    this.cleanupProjectiles();
    this.state = "DODGE";
    const patternAttempt = (5 - this.crystalHP) + 1 + this.retryAttempt;
    this.startPatternsForAttempt(patternAttempt);
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

  // --- DODGE PATTERNS SWITCHER (SINGLE CLEAN PATTERN PER ATTEMPT) ---
  startPatternsForAttempt(attemptNum) {
    this.patternTimers = [];
    this.projectiles = this.bullets;

    const patternIndex = ((attemptNum - 1) % 6) + 1;

    if (patternIndex === 1) {
      this.fireCircleBlast();
      this.patternTimers.push(this.time.delayedCall(2000, () => this.fireCircleBlast()));
      this.patternTimers.push(this.time.delayedCall(4000, () => this.fireCircleBlast()));
      this.patternTimers.push(this.time.delayedCall(6000, () => this.fireCircleBlast()));
      this.patternTimers.push(this.time.delayedCall(8000, () => this.fireCircleBlast()));
    } else if (patternIndex === 2) {
      this.fireWaveGrid();
    } else if (patternIndex === 3) {
      this.patternTimers.push(this.time.delayedCall(500,  () => this.fireSweepingLaser(false)));
      this.patternTimers.push(this.time.delayedCall(2500, () => this.fireSweepingLaser(false)));
      this.patternTimers.push(this.time.delayedCall(4500, () => this.fireSweepingLaser(false)));
      this.patternTimers.push(this.time.delayedCall(6500, () => this.fireSweepingLaser(false)));
      this.patternTimers.push(this.time.delayedCall(8500, () => this.fireSweepingLaser(false)));
    } else if (patternIndex === 4) {
      this.fireShrinkingGrid();
      this.patternTimers.push(this.time.delayedCall(4800, () => this.fireShrinkingGrid()));
    } else if (patternIndex === 5) {
      this.fireSpotlightBurst();
    } else if (patternIndex === 6) {
      this.patternTimers.push(this.time.delayedCall(500,  () => this.fireSweepingLaser(false)));
      this.patternTimers.push(this.time.delayedCall(2500, () => this.fireSweepingLaser(false)));
      this.patternTimers.push(this.time.delayedCall(4500, () => this.fireSweepingLaser(false)));
      this.patternTimers.push(this.time.delayedCall(6500, () => this.fireSweepingLaser(false)));
      this.patternTimers.push(this.time.delayedCall(8500, () => this.fireSweepingLaser(false)));
    }
  }

  // --- PATTERN METHODS ---
  fireCircleBlast() {
    if (this.state !== "DODGE") return;
    const count = 15;
    const radius = 55;
    const centerX = this.crystalEnemy.x;
    const centerY = this.crystalEnemy.y;
    const ringBullets = [];
    const formTime = 250;

    for (let i = 0; i < count; i++) {
      this.patternTimers.push(this.time.delayedCall(i * (formTime / count), () => {
        if (this.state !== "DODGE") return;
        const angle = i * ((2 * Math.PI) / count);
        const bx = centerX + radius * Math.cos(angle);
        const by = centerY + radius * Math.sin(angle);

        const bullet = { x: bx, y: by, vx: 0, vy: 0, radius: 5 };
        this.bullets.push(bullet);
        ringBullets.push(bullet);
      }));
    }

    this.patternTimers.push(this.time.delayedCall(formTime, () => {
      if (this.state !== "DODGE" || !this.soul) return;
      const targetX = this.soul.x;
      const targetY = this.soul.y;
      const speed = 340;

      ringBullets.forEach(b => {
        if (this.bullets.includes(b)) {
          const angle = Phaser.Math.Angle.Between(b.x, b.y, targetX, targetY);
          b.vx = Math.cos(angle) * speed;
          b.vy = Math.sin(angle) * speed;
        }
      });
    }));
  }

  fireWaveGrid() {
    if (this.state !== "DODGE") return;
    const arenaX = this.arena.x;
    const arenaY = this.arena.y;
    const arenaW = this.arena.w;

    const count1 = 8;
    const step1 = arenaW / (count1 + 1);

    const spawnWave = (speed, count, shift = 0) => {
      if (this.state !== "DODGE") return;
      const step = arenaW / (count + 1);
      for (let i = 1; i <= count; i++) {
        this.bullets.push({ x: arenaX + step * i + shift, y: arenaY, vx: 0, vy: speed, radius: 5 });
      }
    };

    spawnWave(90, 8);
    this.patternTimers.push(this.time.delayedCall(1800, () => spawnWave(120, 9, 8)));
    this.patternTimers.push(this.time.delayedCall(3600, () => spawnWave(150, 10, -5)));
    this.patternTimers.push(this.time.delayedCall(5400, () => spawnWave(170, 11, 4)));
    this.patternTimers.push(this.time.delayedCall(7200, () => spawnWave(190, 12, 0)));
    this.patternTimers.push(this.time.delayedCall(8800, () => spawnWave(200, 12, -8)));
  }

  fireSweepingLaser(noWarning = false) {
    if (this.state !== "DODGE") return;
    const side = Phaser.Math.Between(0, 3);
    let isVerticalLaser = side === 0 || side === 1;

    let startX, startY, endX, endY, warnX, warnY, warnW, warnH, laserW, laserH;

    if (side === 0) {
      startX = this.arena.x; startY = this.arena.y;
      endX = this.arena.x + this.arena.w / 2 - 10; endY = this.arena.y;
      warnX = this.arena.x; warnY = this.arena.y; warnW = this.arena.w / 2; warnH = this.arena.h;
      laserW = 20; laserH = this.arena.h;
    } else if (side === 1) {
      startX = this.arena.x + this.arena.w - 20; startY = this.arena.y;
      endX = this.arena.x + this.arena.w / 2 - 10; endY = this.arena.y;
      warnX = this.arena.x + this.arena.w / 2; warnY = this.arena.y; warnW = this.arena.w / 2; warnH = this.arena.h;
      laserW = 20; laserH = this.arena.h;
    } else if (side === 2) {
      startX = this.arena.x; startY = this.arena.y;
      endX = this.arena.x; endY = this.arena.y + this.arena.h / 2 - 10;
      warnX = this.arena.x; warnY = this.arena.y; warnW = this.arena.w; warnH = this.arena.h / 2;
      laserW = this.arena.w; laserH = 20;
    } else {
      startX = this.arena.x; startY = this.arena.y + this.arena.h - 20;
      endX = this.arena.x; endY = this.arena.y + this.arena.h / 2 - 10;
      warnX = this.arena.x; warnY = this.arena.y + this.arena.h / 2; warnW = this.arena.w; warnH = this.arena.h / 2;
      laserW = this.arena.w; laserH = 20;
    }

    const fire = () => {
      if (this.state !== "DODGE") return;
      const laser = { x: startX, y: startY, w: laserW, h: laserH, graphics: this.add.graphics(), life: 1000 };
      this.lasers.push(laser);

      this.tweens.add({
        targets: laser,
        x: endX,
        y: endY,
        duration: 1000,
        onUpdate: () => {
          if (!laser.graphics || !laser.graphics.active) return;
          laser.graphics.clear();
          laser.graphics.fillStyle(0xb57fee, 1);
          laser.graphics.fillRect(laser.x, laser.y, laser.w, laser.h);
          laser.graphics.fillStyle(0xffffff, 0.9);
          if (isVerticalLaser) {
            laser.graphics.fillRect(laser.x + 6, laser.y, 8, laser.h);
          } else {
            laser.graphics.fillRect(laser.x, laser.y + 6, laser.w, 8);
          }
        }
      });
    };

    if (noWarning) {
      fire();
    } else {
      const warn = this.add.graphics();
      warn.fillStyle(0xffffff, 0.3);
      warn.fillRect(warnX, warnY, warnW, warnH);
      this.activeWarnings.push(warn);

      this.patternTimers.push(this.time.delayedCall(700, () => {
        if (warn && warn.active) warn.destroy();
        fire();
      }));
    }
  }

  // --- ATTEMPT 4: SHRINKING GRID ---
  fireShrinkingGrid() {
    if (this.state !== "DODGE") return;
    const { x, y, w, h } = this.arena;
    const width = w;
    const height = h;
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const stopOffset = 40;  // 80px safe zone total

    // 0.7s Warning lines along all 4 walls
    const warnRect = this.add.graphics();
    warnRect.lineStyle(4, 0xffffff, 0.4);
    warnRect.strokeRect(x, y, width, height);
    this.activeWarnings.push(warnRect);

    this.patternTimers.push(this.time.delayedCall(700, () => {
      if (warnRect && warnRect.active) warnRect.destroy();
      if (this.state !== "DODGE") return;

      const topLaser    = this.add.rectangle(centerX,   y,          width,  4, 0xb57fee);
      const bottomLaser = this.add.rectangle(centerX,   y + height, width,  4, 0xb57fee);
      const leftLaser   = this.add.rectangle(x,         centerY,    4, height, 0xb57fee);
      const rightLaser  = this.add.rectangle(x + width, centerY,    4, height, 0xb57fee);

      this.activeLasers = [topLaser, bottomLaser, leftLaser, rightLaser];

      this.tweens.add({ targets: topLaser,    y: centerY - stopOffset, duration: 2500, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: bottomLaser, y: centerY + stopOffset, duration: 2500, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: leftLaser,   x: centerX - stopOffset, duration: 2500, ease: 'Sine.easeInOut' });
      this.tweens.add({
        targets: rightLaser,
        x: centerX + stopOffset,
        duration: 2500,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          this.patternTimers.push(this.time.delayedCall(2000, () => {
            [topLaser, bottomLaser, leftLaser, rightLaser].forEach(l => {
              if (l && l.active) {
                this.tweens.killTweensOf(l);
                l.destroy();
              }
            });
            this.activeLasers = [];
          }));
        }
      });
    }));
  }

  // --- ATTEMPT 5: SPOTLIGHT BURST ---
  fireSpotlightBurst() {
    if (this.state !== "DODGE") return;
    const { x, y, w, h } = this.arena;
    const width = w;
    const height = h;
    const padding = 40;

    const fireSpot = () => {
      if (this.state !== "DODGE") return;
      const spotX = x + padding + Math.random() * (width - padding * 2);
      const spotY = y + padding + Math.random() * (height - padding * 2);

      const warning = this.add.circle(spotX, spotY, 30, 0xffffff, 0);
      warning.setStrokeStyle(2, 0xffffff, 0.4);
      this.activeWarnings.push(warning);

      this.tweens.add({
        targets: warning,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 400,
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          if (warning && warning.active) warning.destroy();
          if (this.state !== "DODGE") return;
          const angles = [0, 45, 90, 135, 180, 225, 270, 315];
          angles.forEach(deg => {
            const rad = Phaser.Math.DegToRad(deg);
            const bullet = {
              x: spotX,
              y: spotY,
              vx: Math.cos(rad) * 160,
              vy: Math.sin(rad) * 160,
              radius: 4
            };
            this.bullets.push(bullet);
          });
        }
      });
    };

    fireSpot();
    this.patternTimers.push(this.time.delayedCall(1200, fireSpot));
    this.patternTimers.push(this.time.delayedCall(2400, fireSpot));
    this.patternTimers.push(this.time.delayedCall(3600, fireSpot));
    this.patternTimers.push(this.time.delayedCall(4800, fireSpot));
    this.patternTimers.push(this.time.delayedCall(6000, fireSpot));
    this.patternTimers.push(this.time.delayedCall(7200, fireSpot));
    this.patternTimers.push(this.time.delayedCall(8400, fireSpot));
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

      // Bullet Physics & Collision
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i];
        b.x += b.vx * (delta / 1000);
        b.y += b.vy * (delta / 1000);

        this.bulletGraphics.fillStyle(0x2dd4bf, 1);
        this.bulletGraphics.fillCircle(b.x, b.y, b.radius);

        const dist = Phaser.Math.Distance.Between(this.soul.x, this.soul.y, b.x, b.y);
        if (dist < this.soulRadius + b.radius) {
          this.triggerHit();
          return;
        }

        if (b.x < 0 || b.x > this.scale.width || b.y < 0 || b.y > this.scale.height) {
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

      // Laser Physics & AABB Collision
      for (let i = this.lasers.length - 1; i >= 0; i--) {
        const l = this.lasers[i];
        l.life -= delta;

        const testX = Math.max(l.x, Math.min(this.soul.x, l.x + l.w));
        const testY = Math.max(l.y, Math.min(this.soul.y, l.y + l.h));

        const dist = Phaser.Math.Distance.Between(this.soul.x, this.soul.y, testX, testY);
        if (dist < this.soulRadius) {
          this.triggerHit();
          return;
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
