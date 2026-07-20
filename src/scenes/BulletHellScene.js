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

  // --- DODGE PATTERNS SWITCHER ---
  startPatternsForAttempt(attemptNum) {
    this.patternTimers = [];

    if (attemptNum === 1) {
      this.fireCircleBlast();
      this.patternTimers.push(this.time.delayedCall(2200, () => this.fireCircleBlast()));
      this.patternTimers.push(this.time.delayedCall(4400, () => this.fireCircleBlast()));
      this.patternTimers.push(this.time.delayedCall(6600, () => this.fireCircleBlast()));
    } else if (attemptNum === 2) {
      this.fireWaveGrid();
    } else if (attemptNum === 3) {
      this.patternTimers.push(this.time.delayedCall(1500, () => this.fireSweepingLaser(false)));
      this.patternTimers.push(this.time.delayedCall(4500, () => this.fireSweepingLaser(false)));
      this.patternTimers.push(this.time.delayedCall(7500, () => this.fireSweepingLaser(false)));
    } else if (attemptNum === 4) {
      this.fireCrossSweep();
      this.patternTimers.push(this.time.delayedCall(4500, () => this.fireCrossSweep()));
    } else if (attemptNum === 5) {
      this.fireLaserGrid();
      this.patternTimers.push(this.time.delayedCall(4500, () => this.fireLaserGrid()));
    } else if (attemptNum === 6) {
      this.fireLaserCage();
      this.patternTimers.push(this.time.delayedCall(4500, () => this.fireLaserCage()));
    } else if (attemptNum === 7) {
      this.fireLaserRain();
      this.patternTimers.push(this.time.delayedCall(4000, () => this.fireLaserRain()));
      this.patternTimers.push(this.time.delayedCall(7500, () => this.fireLaserRain()));
    } else {
      this.fireCircleBlast();
      this.patternTimers.push(this.time.delayedCall(2000, () => this.fireCrossSweep()));
      this.patternTimers.push(this.time.delayedCall(5000, () => this.fireLaserCage()));
      this.patternTimers.push(this.time.delayedCall(7500, () => this.fireLaserRain()));
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
    const formTime = 200;

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
    for (let i = 1; i <= count1; i++) {
      this.bullets.push({ x: arenaX + step1 * i, y: arenaY, vx: 0, vy: 80, radius: 5 });
    }

    this.patternTimers.push(this.time.delayedCall(1800, () => {
      if (this.state !== "DODGE") return;
      const step2 = arenaW / (count1 + 1);
      for (let i = 0; i <= count1; i++) {
        this.bullets.push({ x: arenaX + step2 * (i + 0.5), y: arenaY, vx: 0, vy: 120, radius: 5 });
      }

      this.patternTimers.push(this.time.delayedCall(2200, () => {
        if (this.state !== "DODGE") return;
        const count3 = 12;
        const step3 = arenaW / (count3 + 1);
        for (let j = 1; j <= count3; j++) {
          this.bullets.push({ x: arenaX + step3 * j, y: arenaY, vx: 0, vy: 170, radius: 5 });
        }
      }));
    }));
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

      this.patternTimers.push(this.time.delayedCall(500, () => {
        warn.destroy();
        fire();
      }));
    }
  }

  fireCrossSweep() {
    if (this.state !== "DODGE") return;
    const cx = this.arena.x + this.arena.w / 2;
    const leftStartX = this.arena.x;
    const rightStartX = this.arena.x + this.arena.w - 6;

    const warnLeft = this.add.graphics().fillStyle(0xffffff, 0.3).fillRect(leftStartX, this.arena.y, 6, this.arena.h);
    const warnRight = this.add.graphics().fillStyle(0xffffff, 0.3).fillRect(rightStartX, this.arena.y, 6, this.arena.h);

    this.patternTimers.push(this.time.delayedCall(500, () => {
      warnLeft.destroy(); warnRight.destroy();
      if (this.state !== "DODGE") return;

      const leftLaser = { x: leftStartX, y: this.arena.y, w: 6, h: this.arena.h, graphics: this.add.graphics(), life: 3000 };
      const rightLaser = { x: rightStartX, y: this.arena.y, w: 6, h: this.arena.h, graphics: this.add.graphics(), life: 3000 };
      this.lasers.push(leftLaser, rightLaser);

      this.tweens.add({ targets: leftLaser, x: cx - 40, duration: 2000, onUpdate: () => this.drawPurpleLaser(leftLaser) });
      this.tweens.add({ targets: rightLaser, x: cx + 40 - 6, duration: 2000, onUpdate: () => this.drawPurpleLaser(rightLaser) });

      this.patternTimers.push(this.time.delayedCall(2000, () => {
        if (this.state !== "DODGE") return;
        const warnCenter = this.add.graphics().fillStyle(0xffffff, 0.3).fillRect(cx - 10, this.arena.y, 20, this.arena.h);

        this.patternTimers.push(this.time.delayedCall(300, () => {
          warnCenter.destroy();
          if (this.state !== "DODGE") return;
          const centerLaser = { x: cx - 10, y: this.arena.y, w: 20, h: this.arena.h, graphics: this.add.graphics(), life: 600 };
          this.drawPurpleLaser(centerLaser);
          this.lasers.push(centerLaser);
          leftLaser.life = 600; rightLaser.life = 600;
        }));
      }));
    }));
  }

  drawPurpleLaser(l) {
    if (!l.graphics || !l.graphics.active) return;
    l.graphics.clear();
    l.graphics.fillStyle(0xb57fee, 1);
    l.graphics.fillRect(l.x, l.y, l.w, l.h);
    l.graphics.fillStyle(0xffffff, 0.9);
    if (l.w >= 6) {
      const innerW = Math.max(2, l.w - 4);
      l.graphics.fillRect(l.x + (l.w - innerW) / 2, l.y, innerW, l.h);
    }
  }

  fireLaserGrid() {
    if (this.state !== "DODGE") return;
    const cellW = this.arena.w / 3;
    const cellH = this.arena.h / 3;

    const h1 = { x: this.arena.x, y: this.arena.y + cellH - 2, w: this.arena.w, h: 4, graphics: this.add.graphics(), life: 2000 };
    const h2 = { x: this.arena.x, y: this.arena.y + cellH * 2 - 2, w: this.arena.w, h: 4, graphics: this.add.graphics(), life: 2000 };
    this.drawLaserRect(h1, 0xb57fee);
    this.drawLaserRect(h2, 0xb57fee);
    this.lasers.push(h1, h2);

    this.patternTimers.push(this.time.delayedCall(500, () => {
      if (this.state !== "DODGE") return;
      const v1 = { x: this.arena.x + cellW - 2, y: this.arena.y, w: 4, h: this.arena.h, graphics: this.add.graphics(), life: 1500 };
      const v2 = { x: this.arena.x + cellW * 2 - 2, y: this.arena.y, w: 4, h: this.arena.h, graphics: this.add.graphics(), life: 1500 };
      this.drawLaserRect(v1, 0xb57fee);
      this.drawLaserRect(v2, 0xb57fee);
      this.lasers.push(v1, v2);
    }));

    this.patternTimers.push(this.time.delayedCall(1500, () => {
      if (this.state !== "DODGE") return;
      const safeIndex = Phaser.Math.Between(0, 8);
      const safeRow = Math.floor(safeIndex / 3);
      const safeCol = safeIndex % 3;

      const safeGraphic = this.add.graphics();
      safeGraphic.fillStyle(0x2dd4bf, 0.3);
      safeGraphic.fillRect(this.arena.x + safeCol * cellW, this.arena.y + safeRow * cellH, cellW, cellH);

      this.patternTimers.push(this.time.delayedCall(500, () => {
        safeGraphic.destroy();
        if (this.state !== "DODGE") return;
        h1.life = 0; h2.life = 0;

        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            if (r === safeRow && c === safeCol) continue;
            const cx = this.arena.x + (c + 0.5) * cellW;
            const cy = this.arena.y + (r + 0.5) * cellH;
            const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
            dirs.forEach(d => {
              this.bullets.push({ x: cx, y: cy, vx: d.x * 200, vy: d.y * 200, radius: 4 });
            });
          }
        }
      }));
    }));
  }

  drawLaserRect(l, color = 0xb57fee) {
    if (!l.graphics || !l.graphics.active) return;
    l.graphics.clear();
    l.graphics.fillStyle(color, 1);
    l.graphics.fillRect(l.x, l.y, l.w, l.h);
  }

  fireLaserCage() {
    if (this.state !== "DODGE" || !this.soul) return;

    const topWarn = this.add.graphics().fillStyle(0xffffff, 0.3).fillRect(this.arena.x, this.arena.y, this.arena.w, 4);
    const bottomWarn = this.add.graphics().fillStyle(0xffffff, 0.3).fillRect(this.arena.x, this.arena.y + this.arena.h - 4, this.arena.w, 4);
    const leftWarn = this.add.graphics().fillStyle(0xffffff, 0.3).fillRect(this.arena.x, this.arena.y, 4, this.arena.h);
    const rightWarn = this.add.graphics().fillStyle(0xffffff, 0.3).fillRect(this.arena.x + this.arena.w - 4, this.arena.y, 4, this.arena.h);

    this.patternTimers.push(this.time.delayedCall(500, () => {
      topWarn.destroy(); bottomWarn.destroy(); leftWarn.destroy(); rightWarn.destroy();
      if (this.state !== "DODGE" || !this.soul) return;

      const targetX = this.soul.x;
      const targetY = this.soul.y;

      const topL = { x: this.arena.x, y: this.arena.y, w: this.arena.w, h: 4, graphics: this.add.graphics(), life: 2000 };
      const bottomL = { x: this.arena.x, y: this.arena.y + this.arena.h - 4, w: this.arena.w, h: 4, graphics: this.add.graphics(), life: 2000 };
      const leftL = { x: this.arena.x, y: this.arena.y, w: 4, h: this.arena.h, graphics: this.add.graphics(), life: 2000 };
      const rightL = { x: this.arena.x + this.arena.w - 4, y: this.arena.y, w: 4, h: this.arena.h, graphics: this.add.graphics(), life: 2000 };

      this.lasers.push(topL, bottomL, leftL, rightL);
      [topL, bottomL, leftL, rightL].forEach(l => this.drawLaserRect(l, 0xb57fee));

      this.tweens.add({ targets: topL, y: targetY - 30, duration: 1500, ease: "Sine.easeIn", onUpdate: () => this.drawLaserRect(topL, 0xb57fee) });
      this.tweens.add({ targets: bottomL, y: targetY + 30, duration: 1500, ease: "Sine.easeIn", onUpdate: () => this.drawLaserRect(bottomL, 0xb57fee) });
      this.tweens.add({ targets: leftL, x: targetX - 30, duration: 1500, ease: "Sine.easeIn", onUpdate: () => this.drawLaserRect(leftL, 0xb57fee) });
      this.tweens.add({
        targets: rightL,
        x: targetX + 30,
        duration: 1500,
        ease: "Sine.easeIn",
        onUpdate: () => this.drawLaserRect(rightL, 0xb57fee),
        onComplete: () => {
          if (this.state !== "DODGE") return;
          topL.life = 0; bottomL.life = 0; leftL.life = 0; rightL.life = 0;

          const angles = [0, 45, 90, 135, 180, 225, 270, 315];
          angles.forEach(deg => {
            const rad = Phaser.Math.DegToRad(deg);
            this.bullets.push({ x: targetX, y: targetY, vx: Math.cos(rad) * 250, vy: Math.sin(rad) * 250, radius: 5 });
          });
        }
      });
    }));
  }

  fireLaserRain() {
    if (this.state !== "DODGE") return;
    const delays = [0, 300, 600, 900, 1200, 1400, 1550, 1650];
    delays.forEach(delay => {
      this.patternTimers.push(this.time.delayedCall(delay, () => {
        if (this.state !== "DODGE") return;
        const rx = Phaser.Math.Between(this.arena.x + 10, this.arena.x + this.arena.w - 10);
        const laser = { x: rx - 2, y: this.arena.y, w: 4, h: this.arena.h, graphics: this.add.graphics(), life: 400 };
        this.drawLaserRect(laser, 0x2dd4bf);
        this.lasers.push(laser);
      }));
    });
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
