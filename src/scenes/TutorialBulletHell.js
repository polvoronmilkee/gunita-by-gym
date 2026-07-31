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

    // Disable escape button and logic for tutorial
    if (this.backBtnDom) {
      this.backBtnDom.style.display = 'none';
    }

    // Lesson tracking
    this.currentLesson = 0;
    this.totalLessons = 6;
    this.tutorialHintText = null;
    this.lumaDialogueText = null;

    // Create Luma sprite on the right side of the screen
    this.createLumaGuide();

    // Create tutorial hint text overlay (top-center banner)
    this.tutorialHintBg = this.add.rectangle(this.scale.width / 2, 140, this.scale.width, 30, 0x000000, 0.7).setDepth(99).setAlpha(0);
    this.tutorialHintText = this.add.text(this.scale.width / 2, 140, "", {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "11px",
      color: "#f0d890",
      align: "center",
      wordWrap: { width: 800 },
      lineSpacing: 6
    }).setOrigin(0.5).setDepth(100).setAlpha(0);

    // Create Luma dialogue bubble
    this.lumaDialogueBg = this.add.graphics().setDepth(99);
    this.lumaDialogueText = this.add.text(0, 0, "", {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "8px",
      color: "#ffffff",
      align: "left",
      wordWrap: { width: 180 },
      lineSpacing: 7
    }).setOrigin(0, 0).setDepth(100).setAlpha(0);
    this.lumaDialogueActive = false;
  }

  createLumaGuide() {
    this.lumaX = 1030; // Moved right to avoid clipping the arena
    this.lumaY = 240; // Shifted up slightly to align nicely

    if (this.textures.exists("luma-idle")) {
      this.lumaSprite = this.add.sprite(this.lumaX, this.lumaY, "luma-idle");
      this.lumaSprite.setScale(0.65); // Made smaller
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
        y: this.lumaY - 5,
        yoyo: true,
        repeat: -1,
        duration: 1200,
        ease: "Sine.easeInOut"
      });
    } else {
      this.lumaSprite = this.add.graphics().setDepth(90);
      this.lumaSprite.fillStyle(0xbc80ff, 0.8);
      this.lumaSprite.fillCircle(this.lumaX, this.lumaY, 30);
    }

    // Luma label removed
  }

  showLumaDialogue(text, onComplete) {
    this.lumaDialogueActive = true;
    
    // Draw bubble once when dialogue starts, anchored to her base position
    const lx = this.lumaX + 35; // Top right relative to her body
    const ly = this.lumaY - 100; 
    const boxW = 200;
    const boxH = 110;
    const boxX = lx;
    const boxY = ly;

    this.lumaDialogueBg.clear();
    this.lumaDialogueBg.fillStyle(0x1a1a2e, 0.95);
    this.lumaDialogueBg.fillRoundedRect(boxX, boxY, boxW, boxH, 8);
    
    // Pointer triangle towards Luma (pointing down-left)
    this.lumaDialogueBg.fillTriangle(boxX, boxY + 70, boxX - 12, boxY + 80, boxX + 12, boxY + 85);

    this.lumaDialogueBg.lineStyle(2, 0xbc80ff, 0.8);
    this.lumaDialogueBg.strokeRoundedRect(boxX, boxY, boxW, boxH, 8);
    this.lumaDialogueBg.beginPath();
    this.lumaDialogueBg.moveTo(boxX, boxY + 70);
    this.lumaDialogueBg.lineTo(boxX - 12, boxY + 80);
    this.lumaDialogueBg.lineTo(boxX + 12, boxY + 85);
    this.lumaDialogueBg.strokePath();

    this.lumaDialogueText.setPosition(boxX + 15, boxY + 15);
    this.lumaDialogueText.setAlpha(1);

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
    this.lumaDialogueActive = false;
    this.lumaDialogueBg.clear();
    this.lumaDialogueText.setText("").setAlpha(0);
  }

  showTutorialHint(text) {
    this.tutorialHintText.setText(text);
    this.tweens.add({
      targets: [this.tutorialHintText, this.tutorialHintBg],
      alpha: { from: 0, to: 1 },
      duration: 400,
      ease: "Sine.easeIn"
    });
  }

  hideTutorialHint() {
    this.tweens.add({
      targets: [this.tutorialHintText, this.tutorialHintBg],
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
    this.currentLesson = 0;
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

      this.showLumaDialogue("Welcome, Vino. I am Luma. I will teach you how to face the Echoes. Let's begin.", () => {
        this.showLumaDialogue("First, prepare your Soul.", () => {
          this.transitionToDodge();
        });
      });
    });
  }

  showLessonHint() {
    const hints = {
      1: "LESSON 1: Use WASD/ARROW KEYS to move your SOUL and dodge the bullets!",
      2: "LESSON 2: Dodge phase! Find the gaps in the falling rain to survive!",
      3: "LESSON 3: Dodge phase! Watch the expanding circles and avoid them!",
      4: "LESSON 4: Phase 2! The crystal attacks faster, dodge the waves!",
      5: "LESSON 5: DESPERATION PHASE! Every fragment has a different special move",
      6: "LESSON 6: Show me everything you've learned!"
    };
    this.showTutorialHint(hints[this.currentLesson] || "");
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

    // Sequentially get the riddle matching the current lesson (1-based index)
    const riddleIdx = Math.min(this.riddleList.length - 1, Math.max(0, this.currentLesson - 1));
    this.currentRiddle = this.riddleList[riddleIdx];

    this.questionText.setOrigin(0, 0);
    this.questionText.setPosition(this.boxCenterX - this.boxWidth / 2 + 25, this.boxCenterY - 35);
    this.questionText.setAlign("left");
    this.questionText.setVisible(true);
    this.dialogueText.setVisible(false);

    // Keep choice order fixed (no Shuffle) for tutorial
    let choices = this.currentRiddle.choices || ["A", "B", "C", "D"];

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

    this.showTutorialHint("RIDDLE PHASE: Read the memory. Use WASD/ARROWS to navigate, press SPACE/ENTER to select!");

    this.typewriterText(this.questionText, this.currentRiddle.question, 12, () => {
      this.state = "RIDDLE";
      this.setChoiceButtonsState("ACTIVE");
      this.setRiddleUIElementsVisible(true);
      this.selectedButtonIndex = 0;
      this.updateButtonSelection();
      
      const durations = [20000, 16000, 12000, 10000];
      this.phaseTimer = durations[Math.min(this.retryAttempt, 3)];
      this.maxPhaseTimer = this.phaseTimer;
      this.timerBarFill.width = 580;
      this.timerBarFill.setFillStyle(this.currentRainbowColor);
    });
  }

  startDodgePhase() {
    super.startDodgePhase();
    this.showLessonHint();
  }

  prepareDodgePhase() {
    super.prepareDodgePhase();
    
    if (this.currentLesson === 0) {
      this.state = "INTRO_SOUL_SHOW";
      
      // Allow Luma to speak while the Soul is now clearly visible in the dodge box!
      this.time.delayedCall(400, () => {
        this.showLumaDialogue("See that small glowing circle? That is your Soul. Protect it at all costs.", () => {
          this.showLumaDialogue("Use WASD or ARROW KEYS to move and dodge the bullets. Ready?", () => {
            this.currentLesson = 1;
            this.showLessonHint();
            this.startDodgePhase();
          });
        });
      });
    }
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
      this.phaseTimer = 6000;
      this.maxPhaseTimer = 6000;
      this.crystalEnemy.setTint(0xff4444);
      this.fireDioTimeStop();
    } else {
      this.phaseTimer = 6000;
      this.maxPhaseTimer = 6000;
      this.fireTutorialWave();
    }
  }

  fireTutorialSingleBullet() {
    const { x, w, h } = this.arena;
    this.patternTimers.push(this.time.delayedCall(500, () => {
      const sy = this.soul ? this.soul.y : this.arena.y + h / 2;
      this.spawnBullet(x - 10, sy, 100, 0, 6, 0xf0d890, 0, 5);
      this.spawnBullet(x - 10, sy - 30, 100, 5, 6, 0xf0d890, 0, 5);
      this.spawnBullet(x - 10, sy + 30, 100, -5, 6, 0xf0d890, 0, 5);
    }));
    this.patternTimers.push(this.time.delayedCall(1500, () => {
      const sy = this.soul ? this.soul.y : this.arena.y + h / 3;
      this.spawnBullet(x + w + 10, sy, -100, 0, 6, 0x60d0e8, 0, 5);
      this.spawnBullet(x + w + 10, sy - 30, -100, 15, 6, 0x60d0e8, 0, 5);
      this.spawnBullet(x + w + 10, sy + 30, -100, -15, 6, 0x60d0e8, 0, 5);
    }));
    this.patternTimers.push(this.time.delayedCall(2500, () => {
      const sy = this.soul ? this.soul.y : this.arena.y + h / 4;
      this.spawnBullet(x - 10, sy, 100, 0, 6, 0xf0d890, 0, 5);
      this.spawnBullet(x - 10, sy - 30, 100, 5, 6, 0xf0d890, 0, 5);
      this.spawnBullet(x - 10, sy + 30, 100, -5, 6, 0xf0d890, 0, 5);
    }));
    this.patternTimers.push(this.time.delayedCall(3500, () => {
      const sy = this.soul ? this.soul.y : this.arena.y + h * 0.7;
      this.spawnBullet(x + w + 10, sy, -100, 0, 6, 0x60d0e8, 0, 5);
      this.spawnBullet(x + w + 10, sy - 30, -100, -15, 6, 0x60d0e8, 0, 5);
      this.spawnBullet(x + w + 10, sy + 30, -100, 15, 6, 0x60d0e8, 0, 5);
    }));
  }

  fireTutorialSlowRain() {
    const { x, w } = this.arena;
    const topY = this.boxCenterY - 140;
    const count = 7;
    const step = w / (count + 1);

    for (let t = 0; t < 6000; t += 1200) {
      this.patternTimers.push(this.time.delayedCall(t, () => {
        const skip = Phaser.Math.Between(0, count - 1);
        for (let i = 0; i < count; i++) {
          if (i === skip) continue;
          this.spawnBullet(x + step * (i + 1), topY, 0, 75, 5, 0xf0d890);
        }
        // Spawn one extra targeted bullet to force movement if they sit in the gap
        if (this.soul) {
          const dx = this.soul.x - this.arena.x - this.arena.w / 2;
          const dy = this.soul.y - topY;
          const angle = Math.atan2(dy, dx);
          this.spawnBullet(this.arena.x + this.arena.w / 2, topY, Math.cos(angle) * 60, Math.sin(angle) * 60, 4, 0xff0000);
        }
      }));
    }
  }

  fireTutorialCircle() {
    const cx = this.arena.x + this.arena.w / 2;
    const cy = this.arena.y + 10;

    for (let t = 0; t < 6000; t += 1500) {
      this.patternTimers.push(this.time.delayedCall(t, () => {
        const count = 8;
        // Aim one specific bullet at the player, the rest relative to that angle
        const targetAngle = this.soul ? Math.atan2(this.soul.y - cy, this.soul.x - cx) : Math.PI / 2;
        for (let i = 0; i < count; i++) {
          const angle = targetAngle + (i / count) * Math.PI * 2;
          this.spawnBullet(cx, cy, Math.cos(angle) * 70, Math.sin(angle) * 70, 5, 0x60d0e8);
        }
      }));
    }
  }

  fireTutorialWave() {
    const { x, w } = this.arena;
    const topY = this.boxCenterY - 140;

    for (let t = 0; t < 8000; t += 1000) {
      this.patternTimers.push(this.time.delayedCall(t, () => {
        const count = 10;
        const step = w / (count + 1);
        const skip1 = Phaser.Math.Between(1, count - 2);
        const skip2 = skip1 + 1;
        for (let i = 0; i < count; i++) {
          if (i === skip1 || i === skip2) continue;
          this.spawnBullet(x + step * (i + 1), topY, 0, 80, 5, 0xffd700);
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
    const msg = Phaser.Utils.Array.GetRandom(dodgeFeedback);
    this.showLumaDialogue(msg, null);
    
    this.time.delayedCall(2000, () => {
      this.hideLumaDialogue();
    });

    super.triggerPlayerHit();
  }

  getPlayerSpeedModifier() {
    return this.isTimeStopped ? 0 : 1;
  }

  showEscapeConfirmation() {
    // Escape is disabled in the tutorial
  }

  fireDioTimeStop() {
    this.showLumaDialogue("Hmmm... seems like something Dio would do.", null);
    
    this.patternTimers.push(this.time.delayedCall(500, () => {
      this.isTimeStopped = true;
      this.crystalAngryTween.pause();
      this.sound.play("sfx-dash", { volume: 0.8 }); // Time stop sound
      
      const soulX = this.soul ? this.soul.x : this.arena.x + this.arena.w / 2;
      const soulY = this.soul ? this.soul.y : this.arena.y + this.arena.h / 2;
      const defaultCy = this.boxCenterY - 140;
      const defaultCx = this.arena.x + this.arena.w / 2;

      // Freeze all existing bullets
      this.bullets.forEach(b => {
        b.frozenVx = b.vx;
        b.frozenVy = b.vy;
        b.vx = 0;
        b.vy = 0;
      });

      // Spawn knives in a circle around the frozen player
      const knifeCount = 20; // Increased for tighter spacing at greater distance
      const gapIndex = Phaser.Math.Between(0, knifeCount - 1);
      for (let i = 0; i < knifeCount; i++) {
        this.patternTimers.push(this.time.delayedCall(300 + i * 110, () => { // Spawning slightly faster
          // Create a 4-knife gap for the player to escape
          const isGap = (
            i === gapIndex || 
            i === (gapIndex + 1) % knifeCount || 
            i === (gapIndex + 2) % knifeCount || 
            i === (gapIndex + 3) % knifeCount
          );
          if (isGap) return;

          const angle = (i / knifeCount) * Math.PI * 2;
          const dist = 165;
          const bx = soulX + Math.cos(angle) * dist;
          const by = soulY + Math.sin(angle) * dist;
          
          // Spawn bullet with 0 velocity, but record intended velocity
          this.spawnBullet(bx, by, 0, 0, 6, 0xffff00);
          const bullet = this.bullets[this.bullets.length - 1];
          bullet.frozenVx = -Math.cos(angle) * 160;
          bullet.frozenVy = -Math.sin(angle) * 160;
          bullet.isArrow = true; // Looks like a knife
          
          // Teleport crystal to spawn position
          this.crystalEnemy.setPosition(bx, by);
        }));
      }

      // Resume time
      this.patternTimers.push(this.time.delayedCall(300 + knifeCount * 110 + 800, () => {
        this.isTimeStopped = false;
        this.crystalAngryTween.resume();
        this.crystalEnemy.setPosition(defaultCx, defaultCy);
        
        this.bullets.forEach(b => {
          if (b.frozenVx !== undefined) {
            b.vx = b.frozenVx;
            b.vy = b.frozenVy;
            b.lifespan = 1.1; // Only set lifespan now when they start moving!
            delete b.frozenVx;
            delete b.frozenVy;
          }
        });
        
        this.sound.play("sfx-dash", { volume: 1.0 });
        this.cameras.main.shake(150, 0.005);
      }));
    }));
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
      2: "Good! When bullets fill the arena, your only goal is to dodge them and survive until the timer runs out.",
      3: "Correct. To defeat the echo, you must answer riddles. Correct answers will shatter its outer crystals!",
      4: "Excellent. But if you answer a riddle incorrectly, you will be penalized with an extra dodge phase!",
      5: "Smart. Every fragment is protected by 6 crystals. You must shatter all 6 to set it free.",
      6: "Amazing. But beware: when only 1 crystal remains, the enemy enters Desperation mode. Their attacks get chaotic!"
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

  victorySequence() {
    this.cleanupProjectiles();
    this.state = "VICTORY";
    if (this.soul) {
      this.soul.clear();
      this.soul.destroy();
      this.soul = null;
    }

    this.crystalIdleTween?.pause();
    this.crystalAngryTween?.pause();
    this.crystalEnemy?.setTint(0xffffff);

    this.clearTextAndTimers();

    import("../save.js").then(({ getCache, setCache }) => {
      const cache = getCache() || {};
      cache.has_completed_tutorial = true;
      setCache(cache);
    });

    // Unlock GameOn Portal Artifact (Echo Vessel of Vino)
    import("../utils/portalApi.js").then(({ unlockPortalArtifact }) => {
      unlockPortalArtifact().catch(err => console.warn("Failed to unlock artifact:", err));
    });

    this.tweens.add({
      targets: this.crystalEnemy,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 1000,
      ease: "Back.easeIn",
      onComplete: () => {
        if (this.audioManager) this.audioManager.stopMusic();
        if (this.onCompleteCallback) {
          this.onCompleteCallback();
        } else {
          this.scene.stop();
          this.scene.resume("CampoLunanScene");
        }
      }
    });
  }

  updateCustomPatterns(timeSec, dtSec) {
    // Dynamic speech bubble removed from here, drawn in showLumaDialogue instead
  }
}
