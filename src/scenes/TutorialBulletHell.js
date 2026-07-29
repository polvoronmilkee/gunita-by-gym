import Phaser from "phaser";
import { BaseBulletHellScene } from "./bullethell/BaseBulletHellScene.js";

export class TutorialBulletHell extends BaseBulletHellScene {
  constructor() {
    super("tutorial-bullet-hell");
  }

  getFallbackSoulName() { return "Tutorial Guide"; }
  getFallbackDodgeLines() {
    return [
      "That wasn't right... try again!",
      "Don't worry, you'll get it!",
      "Keep learning, Vino!"
    ];
  }
  getFallbackBgKey() { return "bg-tutorial"; }
  getAudioBossKey() { return "gameplay-tutorial"; }
  getSoulColor() { return 0xc8e6ff; }
  getTitleColor() { return "#f0d890"; }
  getTimerFillColor() { return 0xf0d890; }
  getTimerBgColor() { return 0x1a1a2e; }
  getTimerDodgeColor() { return 0xffd700; }



  preload() {
    super.preload();
    if (!this.textures.exists("bg-tutorial")) {
      this.load.image("bg-tutorial", "src/assets/grave1-elements/bullet-scenes/tutorial.png");
    }
    if (!this.textures.exists("luma-idle")) {
      this.load.spritesheet("luma-idle", "src/assets/luma-idle-spritesheet.png", {
        frameWidth: 138.67,
        frameHeight: 193.67,
      });
    }
  }

  create() {
    super.create();

    // Lesson tracking
    this.currentLesson = 0;
    this.totalLessons = 6;
    this.tutorialHintText = null;
    this.lumaDialogueText = null;

    // Create Luma sprite on the left side of the screen
    this.createLumaGuide();

    // Create tutorial hint text overlay (bottom-center)
    this.tutorialHintText = this.add.text(this.scale.width / 2, this.scale.height - 35, "", {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "8px",
      color: "#f0d890",
      align: "center",
      wordWrap: { width: 500 },
      lineSpacing: 6
    }).setOrigin(0.5).setDepth(100).setAlpha(0);

    // Create Luma dialogue bubble (left side under Luma)
    this.lumaDialogueBg = this.add.graphics().setDepth(99);
    this.lumaDialogueText = this.add.text(55, 305, "", {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "8px",
      color: "#ffffff",
      align: "left",
      wordWrap: { width: 320 },
      lineSpacing: 6
    }).setOrigin(0, 0).setDepth(100).setAlpha(0);
  }

  createLumaGuide() {
    const lumaX = 215;
    const lumaY = 170;

    if (this.textures.exists("luma-idle")) {
      this.lumaSprite = this.add.sprite(lumaX, lumaY, "luma-idle");
      this.lumaSprite.setScale(0.85);
      this.lumaSprite.setDepth(90);

      if (!this.anims.exists("luma-idle-anim")) {
        this.anims.create({
          key: "luma-idle-anim",
          frames: this.anims.generateFrameNumbers("luma-idle", { start: 0, end: 3 }),
          frameRate: 4,
          repeat: -1,
        });
      }
      this.lumaSprite.play("luma-idle-anim");

      if (this.lumaSprite.preFX) {
        this.lumaGlow = this.lumaSprite.preFX.addGlow(0xbc80ff, 0, 0, false, 0.1, 10);
        this.tweens.add({
          targets: this.lumaGlow,
          outerStrength: 4,
          yoyo: true,
          repeat: -1,
          duration: 1500,
          ease: "Sine.easeInOut"
        });
      }

      this.tweens.add({
        targets: this.lumaSprite,
        y: lumaY - 5,
        yoyo: true,
        repeat: -1,
        duration: 1200,
        ease: "Sine.easeInOut"
      });
    } else {
      this.lumaSprite = this.add.graphics().setDepth(90);
      this.lumaSprite.fillStyle(0xbc80ff, 0.8);
      this.lumaSprite.fillCircle(lumaX, lumaY, 30);
    }

    this.lumaLabel = this.add.text(lumaX, lumaY - 95, "LUMA", {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "10px",
      color: "#bc80ff"
    }).setOrigin(0.5).setDepth(91);
  }

  showLumaDialogue(text, onComplete) {
    this.lumaDialogueBg.clear();
    this.lumaDialogueBg.fillStyle(0x1a1a2e, 0.95);
    this.lumaDialogueBg.fillRoundedRect(40, 290, 350, 140, 8);
    this.lumaDialogueBg.lineStyle(2, 0xbc80ff, 0.8);
    this.lumaDialogueBg.strokeRoundedRect(40, 290, 350, 140, 8);
    this.lumaDialogueBg.setAlpha(1);

    this.lumaDialogueText.setAlpha(1);
    this.lumaDialogueText.setPosition(55, 305);

    this.typewriterText(this.lumaDialogueText, text, 18, () => {
      if (onComplete) {
        this.waitForAdvance(() => {
          this.hideLumaDialogue();
          onComplete();
        });
      }
    });
  }

  hideLumaDialogue() {
    this.lumaDialogueBg.clear();
    this.lumaDialogueText.setText("").setAlpha(0);
  }

  showTutorialHint(text) {
    this.tutorialHintText.setText(text).setAlpha(1);
    this.tweens.add({
      targets: this.tutorialHintText,
      alpha: { from: 0, to: 1 },
      duration: 400,
      ease: "Sine.easeIn"
    });
  }

  hideTutorialHint() {
    this.tweens.add({
      targets: this.tutorialHintText,
      alpha: 0,
      duration: 300,
      ease: "Sine.easeOut"
    });
  }

  customCleanup() {
    // No custom projectile arrays for tutorial
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

      this.showLumaDialogue("Welcome, Vino. I am Luma. I will teach you how to face the Echoes. Watch and learn.", () => {
        this.typewriterDialogue("\"A fragment stands before you. Let us begin the lesson.\"", () => {
          this.waitForAdvance(() => {
            this.currentLesson = 1;
            this.showLessonHint();
            this.transitionToDodge();
          });
        });
      });
    });
  }

  showLessonHint() {
    const hints = {
      1: "LESSON 1: This is your SOUL. Use WASD or ARROW KEYS to move it.",
      2: "LESSON 2: During DODGE phases, survive until the timer runs out!",
      3: "LESSON 3: Answer RIDDLES correctly to shatter crystals.",
      4: "LESSON 4: As crystals break, patterns get harder. This is Phase 2!",
      5: "LESSON 5: DESPERATION mode - two patterns overlap at once!",
      6: "LESSON 6: You are ready. Show what you've learned!"
    };
    this.showTutorialHint(hints[this.currentLesson] || "");
  }

  startPatternsForPhase() {
    this.patternTimers = [];
    this.isDesperation = false;
    const lesson = this.currentLesson;

    if (lesson <= 1) {
      this.phaseTimer = 6000;
      this.maxPhaseTimer = 6000;
      this.fireTutorialSingleBullet();
    } else if (lesson === 2) {
      this.phaseTimer = 8000;
      this.maxPhaseTimer = 8000;
      this.fireTutorialSlowRain();
    } else if (lesson === 3) {
      this.phaseTimer = 8000;
      this.maxPhaseTimer = 8000;
      this.fireTutorialCircle();
    } else if (lesson === 4) {
      this.phaseTimer = 10000;
      this.maxPhaseTimer = 10000;
      this.fireTutorialWave();
    } else if (lesson === 5) {
      this.isDesperation = true;
      this.phaseTimer = 10000;
      this.maxPhaseTimer = 10000;
      this.crystalEnemy.setTint(0xff4444);
      this.fireTutorialSlowRain();
      this.fireTutorialCircle();
    } else {
      this.phaseTimer = 6000;
      this.maxPhaseTimer = 6000;
      this.fireTutorialWave();
    }
  }

  fireTutorialSingleBullet() {
    const { x, y, w, h } = this.arena;
    this.patternTimers.push(this.time.delayedCall(500, () => {
      this.spawnBullet(x - 10, y + h / 2, 60, 0, 6, 0xf0d890, 0, 5);
    }));
    this.patternTimers.push(this.time.delayedCall(2500, () => {
      this.spawnBullet(x + w + 10, y + h / 3, -60, 20, 6, 0x60d0e8, 0, 5);
    }));
  }

  fireTutorialSlowRain() {
    const { x, w } = this.arena;
    const topY = this.boxCenterY - 140;
    const count = 5;
    const step = w / (count + 1);

    for (let t = 0; t < 6000; t += 1500) {
      this.patternTimers.push(this.time.delayedCall(t, () => {
        const skip = Phaser.Math.Between(0, count - 1);
        for (let i = 0; i < count; i++) {
          if (i === skip) continue;
          this.spawnBullet(x + step * (i + 1), topY, 0, 45, 5, 0xf0d890);
        }
      }));
    }
  }

  fireTutorialCircle() {
    const cx = this.arena.x + this.arena.w / 2;
    const cy = this.arena.y + 10;

    for (let t = 0; t < 6000; t += 2000) {
      this.patternTimers.push(this.time.delayedCall(t, () => {
        const count = 6;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          this.spawnBullet(cx, cy, Math.cos(angle) * 55, Math.sin(angle) * 55, 5, 0x60d0e8);
        }
      }));
    }
  }

  fireTutorialWave() {
    const { x, w } = this.arena;
    const topY = this.boxCenterY - 140;

    for (let t = 0; t < 8000; t += 1200) {
      this.patternTimers.push(this.time.delayedCall(t, () => {
        const count = 8;
        const step = w / (count + 1);
        const skip1 = Phaser.Math.Between(1, count - 2);
        const skip2 = skip1 + 1;
        for (let i = 0; i < count; i++) {
          if (i === skip1 || i === skip2) continue;
          this.spawnBullet(x + step * (i + 1), topY, 0, 65, 5, 0xffd700);
        }
      }));
    }
  }

  triggerPlayerHit() {
    if (this.isInvincible) return;

    const dodgeFeedback = [
      "Careful! Move your soul to avoid those!",
      "You got hit! Use WASD to dodge next time.",
      "Don't stay still! Keep moving to survive.",
      "Watch the projectiles and find the gaps!",
      "That one hurt. Stay focused, Vino!"
    ];
    const line = Phaser.Utils.Array.GetRandom(dodgeFeedback);
    this.showLumaDialogue(line, () => {});
    
    this.time.delayedCall(2000, () => {
      this.hideLumaDialogue();
    });

    super.triggerPlayerHit();
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
      this.hideTutorialHint();
      this.time.delayedCall(1000, () => {
        this.showLumaDialogue("Excellent work, Vino! You're ready to face the real Echoes. Good luck out there.", () => {
          this.victorySequence();
        });
      });
      return;
    }

    this.currentLesson++;
    this.retryAttempt = 0;
    this.cleanupProjectiles();
    this.clearTextAndTimers();
    this.setChoiceButtonsState("HIDDEN");
    this.setRiddleUIElementsVisible(false);
    this.hideTutorialHint();

    const lessonDialogues = {
      2: "Good! Now let's see if you can dodge. The arena will expand and projectiles will appear.",
      3: "Well done! Now I'll teach you about riddles. Answer correctly to break crystals!",
      4: "Getting harder now. As you break crystals, the patterns speed up. Stay focused!",
      5: "Almost there. When only 1 crystal remains, the enemy gets DESPERATE. Two patterns overlap!",
      6: "Final lesson. Show me everything you've learned!"
    };

    const lumaLine = lessonDialogues[this.currentLesson] || "Keep going, Vino!";

    this.tweenBoxHeight(10, () => {
      this.tweenBoxHeight(this.HEIGHT_DIALOGUE, () => {
        this.dialogueText.setOrigin(0, 0);
        this.dialogueText.setPosition(this.boxCenterX - this.boxWidth / 2 + 25, this.boxCenterY - 35);
        this.dialogueText.setAlign("left");
        this.dialogueText.setVisible(true);

        this.showLumaDialogue(lumaLine, () => {
          this.showLessonHint();
          this.typewriterDialogue("\"The fragment stirs...\"", () => {
            this.waitForAdvance(() => {
              this.transitionToDodge();
            });
          });
        });
      });
    });
  }

  updateCustomPatterns(timeSec, dtSec) {
    // No custom projectile types for tutorial
  }
}
