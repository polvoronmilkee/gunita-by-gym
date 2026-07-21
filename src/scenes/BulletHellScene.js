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

    this.crystalHP = 6;
    this.maxCrystalHP = 6;
    this.soulHP = 5;
    this.retryAttempt = 0;
    this.hasSeenPhase2NewPattern = false;
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
    this.projectiles = this.bullets;

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
      // Extended Dodge Timer (12.5s)
      this.phaseTimer = 12500;
      this.maxPhaseTimer = 12500;

      // Visual Cue: Crystal pulses deep red
      this.crystalEnemy.setTint(0xff1111);

      // Select 2 non-conflicting patterns to fire simultaneously
      const comboPairs = [
        [1, 2], // CircleBlast + WaveGrid
        [1, 4], // CircleBlast + ShrinkingGrid
        [2, 3], // WaveGrid + SweepingLaser
        [3, 5], // SweepingLaser + SpotlightBurst
        [2, 5]  // WaveGrid + SpotlightBurst
      ];
      const pair = Phaser.Utils.Array.GetRandom(comboPairs);
      this.executePattern(pair[0]);
      this.executePattern(pair[1]);
    }
  }

  executePattern(patternId) {
    if (patternId === 1) {
      this.fireCircleBlast();
      this.patternTimers.push(this.time.delayedCall(2000, () => this.fireCircleBlast()));
      this.patternTimers.push(this.time.delayedCall(4000, () => this.fireCircleBlast()));
      this.patternTimers.push(this.time.delayedCall(6000, () => this.fireCircleBlast()));
      this.patternTimers.push(this.time.delayedCall(8000, () => this.fireCircleBlast()));
      if (this.getCurrentPhase() === 3) {
        this.patternTimers.push(this.time.delayedCall(10000, () => this.fireCircleBlast()));
      }
    } else if (patternId === 2) {
      this.fireWaveGrid();
    } else if (patternId === 3) {
      this.patternTimers.push(this.time.delayedCall(500,  () => this.fireSweepingLaser(false)));
      this.patternTimers.push(this.time.delayedCall(2500, () => this.fireSweepingLaser(false)));
      this.patternTimers.push(this.time.delayedCall(4500, () => this.fireSweepingLaser(false)));
      this.patternTimers.push(this.time.delayedCall(6500, () => this.fireSweepingLaser(false)));
      this.patternTimers.push(this.time.delayedCall(8500, () => this.fireSweepingLaser(false)));
      if (this.getCurrentPhase() === 3) {
        this.patternTimers.push(this.time.delayedCall(10500, () => this.fireSweepingLaser(false)));
      }
    } else if (patternId === 4) {
      this.fireShrinkingGrid();
      this.patternTimers.push(this.time.delayedCall(4800, () => this.fireShrinkingGrid()));
    } else if (patternId === 5) {
      this.fireSpotlightBurst();
    }
  }

  // --- PATTERN METHODS ---
  // Pattern 1: Spiral Ring Burst (Option 1A)
  fireCircleBlast() {
    if (this.state !== "DODGE") return;
    const count = 15;
    const radius = 55;
    const centerX = this.crystalEnemy.x;
    const centerY = this.crystalEnemy.y;
    const ringBullets = [];
    const formTime = 300;

    for (let i = 0; i < count; i++) {
      this.patternTimers.push(this.time.delayedCall(i * (formTime / count), () => {
        if (this.state !== "DODGE") return;
        const angle = i * ((2 * Math.PI) / count) + (Math.PI / 4); // Spiral angle offset
        const bx = centerX + radius * Math.cos(angle);
        const by = centerY + radius * Math.sin(angle);

        const bullet = { x: bx, y: by, vx: 0, vy: 0, radius: 5 };
        this.bullets.push(bullet);
        ringBullets.push(bullet);
      }));
    }

    this.patternTimers.push(this.time.delayedCall(formTime + 50, () => {
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

  // Pattern 2: Accelerating Sine Waves (Option 2B)
  fireWaveGrid() {
    if (this.state !== "DODGE") return;
    const arenaX = this.arena.x;
    const arenaY = this.arena.y;
    const arenaW = this.arena.w;

    const spawnSineWave = (speed, count, phaseOffset = 0) => {
      if (this.state !== "DODGE") return;
      const step = arenaW / (count + 1);
      for (let i = 1; i <= count; i++) {
        // Skip 2 positions per wave to create readable gaps
        if (i === 3 || i === 7) continue;
        const baseX = arenaX + step * i;
        const sineShift = Math.sin(i * 0.8 + phaseOffset) * 12;
        this.bullets.push({
          x: baseX + sineShift,
          y: arenaY,
          vx: Math.cos(phaseOffset) * 15,
          vy: speed,
          radius: 5
        });
      }
    };

    spawnSineWave(90, 10, 0);
    this.patternTimers.push(this.time.delayedCall(1600, () => spawnSineWave(120, 10, 1.2)));
    this.patternTimers.push(this.time.delayedCall(3200, () => spawnSineWave(150, 10, 2.4)));
    this.patternTimers.push(this.time.delayedCall(4800, () => spawnSineWave(170, 10, 3.6)));
    this.patternTimers.push(this.time.delayedCall(6400, () => spawnSineWave(190, 10, 4.8)));
    this.patternTimers.push(this.time.delayedCall(8000, () => spawnSineWave(210, 10, 6.0)));
  }

  // Pattern 3: Continuous Sweeping Lasers (Max 2 active lasers at a time, plane alternating)
  fireSingleLaserSweep(directionIndex, onCompleteCallback) {
    if (this.state !== "DODGE") return;
    const { x, y, w, h } = this.arena;
    const isVertical = (directionIndex === 0 || directionIndex === 1);
    let startX, startY, endX, endY, laserW, laserH, warnX, warnY, warnW, warnH;

    if (directionIndex === 0) { // TOP -> Center
      startX = x; startY = y;
      endX = x; endY = y + h / 2 - 8;
      laserW = w; laserH = 16;
      warnX = x; warnY = y; warnW = w; warnH = h / 2;
    } else if (directionIndex === 1) { // BOTTOM -> Center
      startX = x; startY = y + h - 16;
      endX = x; endY = y + h / 2 - 8;
      laserW = w; laserH = 16;
      warnX = x; warnY = y + h / 2; warnW = w; warnH = h / 2;
    } else if (directionIndex === 2) { // LEFT -> Center
      startX = x; startY = y;
      endX = x + w / 2 - 8; endY = y;
      laserW = 16; laserH = h;
      warnX = x; warnY = y; warnW = w / 2; warnH = h;
    } else { // RIGHT -> Center
      startX = x + w - 16; startY = y;
      endX = x + w / 2 - 8; endY = y;
      laserW = 16; laserH = h;
      warnX = x + w / 2; warnY = y; warnW = w / 2; warnH = h;
    }

    const warn = this.add.graphics();
    warn.fillStyle(0xffffff, 0.3);
    warn.fillRect(warnX, warnY, warnW, warnH);
    this.activeWarnings.push(warn);

    this.patternTimers.push(this.time.delayedCall(600, () => {
      if (warn && warn.active) warn.destroy();
      if (this.state !== "DODGE") return;

      const laser = { x: startX, y: startY, w: laserW, h: laserH, graphics: this.add.graphics(), life: 2500 };
      this.lasers.push(laser);

      this.tweens.add({
        targets: laser,
        x: endX,
        y: endY,
        duration: 2200,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          if (!laser.graphics || !laser.graphics.active) return;
          laser.graphics.clear();
          laser.graphics.fillStyle(0xb57fee, 1);
          laser.graphics.fillRect(laser.x, laser.y, laser.w, laser.h);
          laser.graphics.fillStyle(0xffffff, 0.9);
          if (isVertical) {
            laser.graphics.fillRect(laser.x, laser.y + 4, laser.w, 8);
          } else {
            laser.graphics.fillRect(laser.x + 4, laser.y, 8, laser.h);
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
    const verticalDirs = [0, 1];   // TOP, BOTTOM
    const horizontalDirs = [2, 3]; // LEFT, RIGHT

    let totalSpawned = 0;
    const maxTotalLasers = 10;
    let currentPlane = (this.lastLaserPlane === "vertical") ? "horizontal" : "vertical";

    const spawnNextLaser = () => {
      if (this.state !== "DODGE" || totalSpawned >= maxTotalLasers) return;

      totalSpawned++;
      const planeForThisLaser = currentPlane;
      currentPlane = (currentPlane === "vertical") ? "horizontal" : "vertical";

      const pool = (planeForThisLaser === "vertical") ? verticalDirs : horizontalDirs;
      const dir = Phaser.Utils.Array.GetRandom(pool);
      this.lastLaserPlane = planeForThisLaser;

      this.fireSingleLaserSweep(dir, () => {
        // When this laser disappears, spawn the next one!
        spawnNextLaser();
      });
    };

    // Spawn Laser 1
    spawnNextLaser();

    // Spawn Laser 2 staggered by 600ms (max 2 active lasers concurrently)
    this.patternTimers.push(this.time.delayedCall(600, () => {
      spawnNextLaser();
    }));
  }

  // Pattern 4: Dynamic Safe Zone Shrinking Grid (Clean Arena Bounds)
  fireShrinkingGrid() {
    if (this.state !== "DODGE") return;
    const { x, y, w, h } = this.arena;

    // Randomize safe zone position each time
    const safeZoneTargets = [
      { cx: x + w * 0.3, cy: y + h * 0.3 }, // Top-Left
      { cx: x + w * 0.7, cy: y + h * 0.3 }, // Top-Right
      { cx: x + w * 0.3, cy: y + h * 0.7 }, // Bottom-Left
      { cx: x + w * 0.7, cy: y + h * 0.7 }, // Bottom-Right
      { cx: x + w * 0.5, cy: y + h * 0.5 }  // Center
    ];
    const target = Phaser.Utils.Array.GetRandom(safeZoneTargets);
    const stopOffset = 40; // 80px safe zone size

    // 0.7s Warning outline
    const warnRect = this.add.graphics();
    warnRect.lineStyle(3, 0xffffff, 0.4);
    warnRect.strokeRect(x, y, w, h);
    this.activeWarnings.push(warnRect);

    this.patternTimers.push(this.time.delayedCall(700, () => {
      if (warnRect && warnRect.active) warnRect.destroy();
      if (this.state !== "DODGE") return;

      const gridState = {
        topY: y,
        bottomY: y + h,
        leftX: x,
        rightX: x + w,
        life: 4500
      };

      const gridGraphics = this.add.graphics();
      gridState.graphics = gridGraphics;
      this.lasers.push(gridState);

      this.tweens.add({
        targets: gridState,
        topY: target.cy - stopOffset,
        bottomY: target.cy + stopOffset,
        leftX: target.cx - stopOffset,
        rightX: target.cx + stopOffset,
        duration: 2500,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          if (!gridGraphics || !gridGraphics.active) return;
          gridGraphics.clear();

          const tY = Math.max(y, gridState.topY);
          const bY = Math.min(y + h, gridState.bottomY);
          const lX = Math.max(x, gridState.leftX);
          const rX = Math.min(x + w, gridState.rightX);

          // Top laser band
          gridGraphics.fillStyle(0xb57fee, 0.85);
          gridGraphics.fillRect(x, y, w, Math.max(0, tY - y));
          gridGraphics.fillStyle(0xffffff, 0.9);
          gridGraphics.fillRect(x, Math.max(y, tY - 4), w, 4);

          // Bottom laser band
          gridGraphics.fillStyle(0xb57fee, 0.85);
          gridGraphics.fillRect(x, bY, w, Math.max(0, (y + h) - bY));
          gridGraphics.fillStyle(0xffffff, 0.9);
          gridGraphics.fillRect(x, bY, w, 4);

          // Left laser band
          gridGraphics.fillStyle(0xb57fee, 0.85);
          gridGraphics.fillRect(x, y, Math.max(0, lX - x), h);
          gridGraphics.fillStyle(0xffffff, 0.9);
          gridGraphics.fillRect(Math.max(x, lX - 4), y, 4, h);

          // Right laser band
          gridGraphics.fillStyle(0xb57fee, 0.85);
          gridGraphics.fillRect(rX, y, Math.max(0, (x + w) - rX), h);
          gridGraphics.fillStyle(0xffffff, 0.9);
          gridGraphics.fillRect(rX, y, 4, h);
        }
      });
    }));
  }

  // Pattern 5: Tracking Spotlight Follower (Option 5B + Exclamation Mark & Extended Lock-Down)
  fireSpotlightBurst() {
    if (this.state !== "DODGE") return;
    const { x, y, w, h } = this.arena;
    const padding = 30;

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

      // Smoothly track player soul position for 1.8s
      this.tweens.add({
        targets: warning,
        duration: 1800,
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

          // Lock down red warning ring + red exclamation mark for 900ms
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
            duration: 900,
            onComplete: () => {
              if (warning && warning.active) warning.destroy();
              if (exclText && exclText.active) exclText.destroy();
              if (this.state !== "DODGE") return;

              // Detonate into 8-directional radial burst
              const angles = [0, 45, 90, 135, 180, 225, 270, 315];
              angles.forEach(deg => {
                const rad = Phaser.Math.DegToRad(deg);
                this.bullets.push({
                  x: lockedX,
                  y: lockedY,
                  vx: Math.cos(rad) * 170,
                  vy: Math.sin(rad) * 170,
                  radius: 4
                });
              });
            }
          });
        }
      });
    };

    fireSpot();
    this.patternTimers.push(this.time.delayedCall(3000, fireSpot));
    this.patternTimers.push(this.time.delayedCall(6000, fireSpot));
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

      // Laser Physics & Collision
      for (let i = this.lasers.length - 1; i >= 0; i--) {
        const l = this.lasers[i];
        l.life -= delta;

        // 1. Shrinking Grid safe zone collision check
        if (l.leftX !== undefined && l.rightX !== undefined && l.topY !== undefined && l.bottomY !== undefined) {
          const isInsideSafeZone = (
            this.soul.x >= l.leftX &&
            this.soul.x <= l.rightX &&
            this.soul.y >= l.topY &&
            this.soul.y <= l.bottomY
          );

          if (!isInsideSafeZone && (l.leftX > this.arena.x + 4)) {
            this.triggerHit();
            return;
          }
        }
        // 2. Standard sweeping laser rectangle AABB collision check
        else if (l.x !== undefined && l.y !== undefined && l.w !== undefined && l.h !== undefined) {
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
