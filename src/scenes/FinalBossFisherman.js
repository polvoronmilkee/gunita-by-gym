import Phaser from "phaser";
import { BaseBulletHellScene } from "./bullethell/BaseBulletHellScene.js";

export class FinalBossFisherman extends BaseBulletHellScene {
  constructor() {
    super("final-boss-fisherman");
  }

  getFallbackSoulName() { return "The Fisherman"; }
  getFallbackDodgeLines() {
    return [
      "The tides of memory crash over you...",
      "Every wave carries a forgotten name.",
      "The old fisherman will not rest until he is remembered."
    ];
  }
  getFallbackBgKey() { return "bg-final-conclusion"; }
  getAudioBossKey() { return "finale-fisherman"; }
  getSoulColor() { return 0x2dd4bf; }
  getTitleColor() { return "#2dd4bf"; }
  getTimerFillColor() { return 0xf59e0b; }
  getTimerBgColor() { return 0x0a0a0a; }
  getTimerDodgeColor() { return 0xef4444; }



  preload() {
    super.preload();
    // Load final boss riddles JSON
    this.load.json("riddle-final-boss", "src/assets/data/dialogues/fragments-riddles/final-boss.json");

    // Load all fragment backgrounds for the swap system
    const bgAssets = [
      { key: "bg-final-conclusion", path: "src/assets/grave1-elements/bullet-scenes/final-conclusion.png" },
      { key: "bg-fish-basket", path: "src/assets/grave1-elements/bullet-scenes/fish-basket.png" },
      { key: "bg-red-warning-flag", path: "src/assets/grave1-elements/bullet-scenes/red-warning-flag.png" },
      { key: "bg-rosary-scene", path: "src/assets/grave1-elements/bullet-scenes/rosary.png" },
      { key: "bg-daughters-drawing", path: "src/assets/grave1-elements/bullet-scenes/daughters-drawing.png" }
    ];
    bgAssets.forEach(asset => {
      if (!this.textures.exists(asset.key)) {
        this.load.image(asset.key, asset.path);
      }
    });
  }

  create() {
    // Populate the riddle list from the preloaded final-boss.json before running parent setup
    const bossRiddles = this.cache.json.get("riddle-final-boss");
    if (bossRiddles && bossRiddles.riddles) {
      this.riddleList = bossRiddles.riddles;
      this.remainingRiddles = Phaser.Utils.Array.Shuffle([...this.riddleList]);
    }

    super.create();

    // Custom projectile arrays for borrowed patterns
    this.jellyfishes = [];
    this.anchors = [];
    this.scissors = [];
    this.musicalNotes = [];

    // Drowning flood state
    this.floodActive = false;
    this.floodOverlay = null;
    this.floodWaterY = null; // Animating rising water level Y
    this.shieldZone = null;
    this.shieldRadius = 40;
    this.waterParticles = [];
    this.floodWarningText = null;

    // Track current BG for swap system
    this.currentBgKey = "bg-final-conclusion";

    // Pattern-to-background mapping
    this.patternBgMap = {
      "jellyfish": "bg-fish-basket",
      "anchor": "bg-fish-basket",
      "circle-blast": "bg-red-warning-flag",
      "spotlight-burst": "bg-red-warning-flag",
      "candle-rain": "bg-rosary-scene",
      "scissors": "bg-daughters-drawing",
      "musical-notes": "bg-daughters-drawing",
      "incense-spiral": "bg-rosary-scene",
      "flood": "bg-final-conclusion"
    };
  }

  customCleanup() {
    this.jellyfishes = [];
    this.anchors = [];
    this.scissors = [];
    this.musicalNotes = [];
    this.waterParticles = [];
    this.floodActive = false;
    this.floodWaterY = null;
    if (this.floodOverlay) {
      this.floodOverlay.destroy();
      this.floodOverlay = null;
    }
    if (this.floodWarningText) {
      this.floodWarningText.destroy();
      this.floodWarningText = null;
    }
    if (this.shieldZone) {
      this.shieldZone = null;
    }
  }

  // =============================================
  // BACKGROUND SWAP SYSTEM
  // =============================================
  swapBackground(newBgKey) {
    if (this.currentBgKey === newBgKey || !this.textures.exists(newBgKey)) return;

    const { width, height } = this.scale;
    const oldBg = this.bg;

    // Create new bg image behind the old one
    const newBg = this.add.image(width / 2, height / 2, newBgKey);
    newBg.setDisplaySize(width, height);
    newBg.setAlpha(0);
    newBg.setDepth(-10);

    // Crossfade
    this.tweens.add({
      targets: newBg,
      alpha: 0.65,
      duration: 600,
      ease: "Sine.easeInOut"
    });

    if (oldBg) {
      this.tweens.add({
        targets: oldBg,
        alpha: 0,
        duration: 600,
        ease: "Sine.easeInOut",
        onComplete: () => {
          oldBg.destroy();
        }
      });
    }

    this.bg = newBg;
    this.currentBgKey = newBgKey;
  }

  // =============================================
  // PHASE SYSTEM
  // =============================================
  startPatternsForPhase() {
    this.patternTimers = [];
    this.isDesperation = false;
    const phase = this.getCurrentPhase();

    if (phase === 1) {
      // Phase 1: Gentler selection of patterns
      const pool = ["jellyfish", "candle-rain", "anchor", "circle-blast"];
      const chosen = this.pickRandomPattern(pool);
      this.swapBackground(this.patternBgMap[chosen]);
      this.executeNamedPattern(chosen);
    } else if (phase === 2) {
      // Phase 2: All 8 patterns (2 from each fragment)
      const pool = ["jellyfish", "anchor", "candle-rain", "incense-spiral", "circle-blast", "spotlight-burst", "scissors", "musical-notes"];
      let chosen;
      if (!this.hasSeenPhase2NewPattern) {
        chosen = Phaser.Utils.Array.GetRandom(["circle-blast", "spotlight-burst", "scissors", "incense-spiral"]);
        this.hasSeenPhase2NewPattern = true;
      } else {
        chosen = this.pickRandomPattern(pool);
      }
      this.swapBackground(this.patternBgMap[chosen]);
      this.executeNamedPattern(chosen);
    } else if (phase === 3) {
      // Phase 3: Desperation — Drowning Flood!
      this.isDesperation = true;
      this.phaseTimer = 16000;
      this.maxPhaseTimer = 16000;
      this.crystalEnemy.setTint(0xff1111);
      this.swapBackground("bg-final-conclusion");
      this.startDrowningFlood();
    }
  }

  executeNamedPattern(patternName) {
    const desp = this.isDesperation;
    const duration = desp ? 14000 : 10000;

    switch (patternName) {
      case "jellyfish":
        this.fireJellyfishWave(duration, desp);
        break;
      case "anchor":
        this.fireAnchorBombs(duration, desp);
        break;
      case "circle-blast":
        this.fireCircleBlast(duration, desp);
        break;
      case "spotlight-burst":
        this.fireSpotlightBurst(duration, desp);
        break;
      case "candle-rain":
        this.fireCandleRain(duration, desp);
        break;
      case "scissors":
        this.fireScissorsTrap(duration, desp);
        break;
      case "musical-notes":
        this.fireMusicalNotes(duration, desp);
        break;
      case "incense-spiral":
        this.fireIncenseSpiral(duration, desp);
        break;
    }
  }

  // =============================================
  // BORROWED PATTERNS (from fragments)
  // =============================================

  // --- From Fish Basket ---
  fireJellyfishWave(duration, desp) {
    const interval = desp ? 1800 : 2200;
    for (let t = 0; t < duration; t += interval) {
      this.patternTimers.push(this.time.delayedCall(t, () => {
        const count = desp ? 8 : 6;
        const cols = 10;
        const colW = this.arena.w / cols;
        const gaps = desp ? 1 : 2;

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
          const speed = desp ? -55 : -45;

          this.jellyfishes.push({
            active: true,
            x: jx,
            y: jy,
            baseX: jx,
            vy: speed,
            phase: Math.random() * Math.PI * 2,
            tentacleCount: desp ? 3 : 2
          });
        }
      }));
    }
  }

  fireAnchorBombs(duration, desp) {
    const interval = desp ? 2400 : 3200;
    for (let t = 0; t < duration; t += interval) {
      this.patternTimers.push(this.time.delayedCall(t, () => {
        const targetX = this.soul ? this.soul.x : this.arena.x + this.arena.w / 2;
        this.anchors.push({
          active: true,
          x: Phaser.Math.Clamp(targetX, this.arena.x + 30, this.arena.x + this.arena.w - 30),
          y: this.arena.y - 25,
          vy: desp ? 220 : 175,
          targetY: this.arena.y + this.arena.h - 15,
          detonated: false,
          shockwaveCount: desp ? 28 : 25,
          bounces: 0
        });
      }));
    }
  }

  // --- From Red Warning Flag ---
  fireCircleBlast(duration, desp) {
    const interval = desp ? 2000 : 2600;
    for (let t = 0; t < duration; t += interval) {
      this.patternTimers.push(this.time.delayedCall(t, () => {
        if (this.state !== "DODGE") return;
        const count = desp ? 14 : 16;
        const radius = 140;
        const centerX = this.crystalEnemy.x;
        const centerY = this.crystalEnemy.y;
        const ringBullets = [];
        const formTime = 500;

        const vortex = this.add.graphics();
        this.activeWarnings.push(vortex);
        
        this.tweens.add({
          targets: { angle: 0 },
          angle: 360,
          duration: formTime + 50,
          onUpdate: (tw) => {
            if (!vortex || !vortex.active) return;
            vortex.clear();
            vortex.lineStyle(2, 0x06b6d4, 0.5);
            vortex.beginPath();
            vortex.arc(centerX, centerY, radius + 15, Phaser.Math.DegToRad(tw.getValue()), Phaser.Math.DegToRad(tw.getValue() + 270), false);
            vortex.strokePath();
            vortex.fillStyle(0x0891b2, 0.2);
            vortex.fillCircle(centerX, centerY, radius + 15);
          },
          onComplete: () => {
            if (vortex && vortex.active) vortex.destroy();
          }
        });

        for (let i = 0; i < count; i++) {
          this.patternTimers.push(this.time.delayedCall(i * (formTime / count), () => {
            if (this.state !== "DODGE") return;
            const angle = i * ((2 * Math.PI) / count) + (Math.PI / 4);
            const bx = centerX + radius * Math.cos(angle);
            const by = centerY + radius * Math.sin(angle);

            const bullet = { active: true, x: bx, y: by, vx: 0, vy: 0, radius: 4, color: 0x06b6d4, margin: 200 };
            this.bullets.push(bullet);
            ringBullets.push(bullet);
          }));
        }

        this.patternTimers.push(this.time.delayedCall(formTime + 50, () => {
          if (this.state !== "DODGE" || !this.soul) return;
          const targetX = this.soul.x;
          const targetY = this.soul.y;
          const speed = desp ? 140 : 120;

          ringBullets.forEach(b => {
            if (this.bullets.includes(b)) {
              const angle = Phaser.Math.Angle.Between(b.x, b.y, targetX, targetY);
              b.vx = Math.cos(angle) * speed;
              b.vy = Math.sin(angle) * speed;
              b.speed = speed;
              b.isHoming = true;
              b.homingTurnSpeed = 0.02;
            }
          });
        }));
      }));
    }
  }

  // --- From Rosary ---
  fireCandleRain(duration, desp) {
    const baseSpeed = desp ? 95 : 75;
    let speedInc = 0;
    for (let t = 0; t < duration; t += 1800) {
      const speed = baseSpeed + speedInc;
      this.patternTimers.push(this.time.delayedCall(t, () => {
        const { x, w } = this.arena;
        const spawnY = this.boxCenterY - 130;
        const count = 12;
        const step = w / (count + 1);
        const gapCount = desp ? 2 : 3;

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
            active: true,
            x: baseX,
            y: spawnY,
            vx: 0,
            vy: speed,
            radius: 4,
            color: 0xf7c948,
            isCandleFlame: true,
            swayPhase: Math.random() * Math.PI * 2
          });
        }
      }));
      speedInc += 8;
    }
  }

  // --- From Red Warning Flag (Pattern 2) ---
  fireSpotlightBurst(duration, desp) {
    const interval = desp ? 2200 : 3000;
    const { x, y, w, h } = this.arena;
    const padding = 30;

    for (let t = 0; t < duration; t += interval) {
      this.patternTimers.push(this.time.delayedCall(t, () => {
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

                const burstSpeed = desp ? 160 : 130;
                const angles = [0, 60, 120, 180, 240, 300];
                angles.forEach(deg => {
                  const rad = Phaser.Math.DegToRad(deg);
                  this.spawnBullet(lockedX, lockedY, Math.cos(rad) * burstSpeed, Math.sin(rad) * burstSpeed, 8, 0xef4444);
                });
              }
            });
          }
        });
      }));
    }
  }

  fireScissorsTrap(duration, desp) {
    const interval = desp ? 2600 : 3400;
    for (let t = 0; t < duration; t += interval) {
      this.patternTimers.push(this.time.delayedCall(t, () => {
        const cx = this.arena.x + this.arena.w / 2;
        const cy = this.arena.y + this.arena.h / 2;
        const count = desp ? 2 : 1;
        
        for (let i = 0; i < count; i++) {
          const angleOffset = i * (Math.PI / 2); 
          this.scissors.push({
            active: true,
            x: cx,
            y: cy,
            rotAngle: this.soul ? Math.atan2(this.soul.y - cy, this.soul.x - cx) + angleOffset : angleOffset,
            angleOpen: (Math.PI / 180) * 45,
            length: 700,
            state: "TELEGRAPH",
            timer: 1 
          });
        }
      }));
    }
  }

  fireMusicalNotes(duration, desp) {
    const interval = desp ? 1800 : 2400;
    for (let t = 0; t < duration; t += interval) {
      this.patternTimers.push(this.time.delayedCall(t, () => {
        const count = desp ? 6 : 4;
        const bounces = desp ? 4 : 3;
        const rainbowColors = [0xf87171, 0xfb923c, 0xfde68a, 0x86efac, 0x7dd3fc, 0xa78bfa, 0xc4b5fd];

        for (let i = 0; i < count; i++) {
          const fromLeft = i % 2 === 0;
          const startX = fromLeft ? this.arena.x + 15 : this.arena.x + this.arena.w - 15;
          const startY = Phaser.Math.Between(this.arena.y + 30, this.arena.y + this.arena.h - 80);
          const vx = (fromLeft ? 1 : -1) * (80 + Math.random() * 30);
          const vy = (Math.random() < 0.5 ? 1 : -1) * (70 + Math.random() * 30);

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
      }));
    }
  }

  fireIncenseSpiral(duration, desp) {
    const { x, y, w, h } = this.arena;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const maxRadius = Math.min(w, h) / 2 - 10;
    const numArms = desp ? 3 : 2;
    const armSpacing = (Math.PI * 2) / numArms;
    const rotSpeed = 1.5;
    const spawnInterval = 250;
    let baseAngle = Math.random() * Math.PI * 2;

    for (let t = 0; t < duration; t += spawnInterval) {
      this.patternTimers.push(this.time.delayedCall(t, () => {
        if (this.state !== "DODGE") return;
        const elapsed = t / 1000;
        const angle = baseAngle + elapsed * rotSpeed;

        for (let arm = 0; arm < numArms; arm++) {
          const a = angle + arm * armSpacing;
          const sx = cx + maxRadius * Math.cos(a);
          const sy = cy + maxRadius * Math.sin(a);
          const speed = 75;
          const dirX = (cx - sx) / maxRadius;
          const dirY = (cy - sy) / maxRadius;

          this.bullets.push({
            active: true,
            x: sx,
            y: sy,
            vx: dirX * speed,
            vy: dirY * speed,
            radius: 5,
            color: arm % 2 === 0 ? 0xf5a0c0 : 0x7c3aed,
            life: 10000
          });
        }
      }));
    }
  }

  // =============================================
  // DESPERATION: DROWNING FLOOD
  // =============================================
  startDrowningFlood() {
    const { width, height } = this.scale;

    // Reset water Y level to bottom of the arena
    this.floodWaterY = this.arena.y + this.arena.h;

    // Tween the water level rising to the top of the arena over 3.5 seconds (during warning)
    this.tweens.add({
      targets: this,
      floodWaterY: this.arena.y,
      duration: 3500,
      ease: "Quad.easeOut"
    });

    // Step 1: Wind-up warning (3 seconds)
    this.floodWarningText = this.add.text(width / 2, height / 2 - 60, "THE TIDE IS RISING...", {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "14px",
      color: "#2dd4bf"
    }).setOrigin(0.5).setDepth(200).setAlpha(0);

    this.tweens.add({
      targets: this.floodWarningText,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.8, to: 1.1 },
      yoyo: true,
      repeat: 2,
      duration: 500,
      ease: "Sine.easeInOut"
    });

    // Water particles rising during wind-up
    this.time.addEvent({
      delay: 100,
      repeat: 29,
      callback: () => {
        const px = Phaser.Math.Between(this.arena.x, this.arena.x + this.arena.w);
        const py = this.arena.y + this.arena.h;
        this.waterParticles.push({
          x: px,
          y: py,
          vy: -Phaser.Math.Between(30, 80),
          alpha: 0.7,
          size: Phaser.Math.Between(2, 5)
        });
      }
    });

    // Step 2: Spawn shield safe zone (at 2.5s)
    this.time.delayedCall(2500, () => {
      const shieldX = Phaser.Math.Between(this.arena.x + 60, this.arena.x + this.arena.w - 60);
      const shieldY = Phaser.Math.Between(this.arena.y + 60, this.arena.y + this.arena.h - 60);
      this.shieldZone = { x: shieldX, y: shieldY, radius: this.shieldRadius, pulsePhase: 0 };
    });

    // Step 3: Flood begins (at 3.5s, lasts 2.5s)
    this.time.delayedCall(3500, () => {
      this.floodActive = true;
      this.floodWaterY = this.arena.y; // Ensure locked to top
      if (this.floodWarningText) {
        this.floodWarningText.setText("DROWNING!");
        this.floodWarningText.setColor("#ef4444");
      }
    });

    // Step 4: Flood ends (at 6s), transition to random pattern
    this.time.delayedCall(6000, () => {
      this.floodActive = false;
      
      // Tween the water level back down to the bottom of the arena
      this.tweens.add({
        targets: this,
        floodWaterY: this.arena.y + this.arena.h,
        duration: 500,
        ease: "Quad.easeIn",
        onComplete: () => {
          this.floodWaterY = null;
        }
      });

      if (this.floodWarningText) {
        this.floodWarningText.destroy();
        this.floodWarningText = null;
      }
      this.shieldZone = null;
      this.waterParticles = [];

      // Post-flood: fire a random pattern for the remaining time
      const pool = ["jellyfish", "circle-blast", "candle-rain", "spotlight-burst", "anchor", "scissors", "musical-notes", "incense-spiral"];
      const chosen = this.pickRandomPattern(pool);
      this.swapBackground(this.patternBgMap[chosen]);
      this.executeNamedPattern(chosen);
    });
  }

  // =============================================
  // UPDATE LOOP
  // =============================================
  updateCustomPatterns(timeSec, dtSec) {
    // --- Drowning flood damage ---
    if (this.floodActive && this.soul && !this.isInvincible) {
      let safe = false;
      if (this.shieldZone) {
        const dist = Phaser.Math.Distance.Between(this.soul.x, this.soul.y, this.shieldZone.x, this.shieldZone.y);
        if (dist < this.shieldZone.radius) safe = true;
      }
      if (!safe) {
        // Flood damage ticks
        this.floodDamageTimer = (this.floodDamageTimer || 0) + dtSec;
        if (this.floodDamageTimer >= 0.8) {
          this.floodDamageTimer = 0;
          this.triggerPlayerHit();
          return;
        }
      } else {
        this.floodDamageTimer = 0;
      }
    }

    // --- Draw rising water waves ---
    if (this.floodWaterY !== null) {
      const waveAmplitude = 5;
      const waveFrequency = 0.04;
      const waveSpeed = 8;

      this.bulletGraphics.fillStyle(0x0e4d6e, 0.55);
      this.bulletGraphics.beginPath();
      
      // Start from bottom-left corner of the dodge arena
      this.bulletGraphics.moveTo(this.arena.x, this.arena.y + this.arena.h);

      // Draw the wavy top surface
      for (let x = this.arena.x; x <= this.arena.x + this.arena.w; x += 5) {
        const waveY = this.floodWaterY + Math.sin((x * waveFrequency) + (timeSec * waveSpeed)) * waveAmplitude;
        const clampedY = Phaser.Math.Clamp(waveY, this.arena.y, this.arena.y + this.arena.h);
        this.bulletGraphics.lineTo(x, clampedY);
      }

      // Complete path to bottom-right corner of the dodge arena
      this.bulletGraphics.lineTo(this.arena.x + this.arena.w, this.arena.y + this.arena.h);
      this.bulletGraphics.closePath();
      this.bulletGraphics.fillPath();
    }

    // --- Draw shield safe zone ---
    if (this.shieldZone) {
      this.shieldZone.pulsePhase += dtSec * 4;
      const pulseR = this.shieldZone.radius + Math.sin(this.shieldZone.pulsePhase) * 5;

      // Outer glow
      this.bulletGraphics.fillStyle(0x22c55e, 0.15);
      this.bulletGraphics.fillCircle(this.shieldZone.x, this.shieldZone.y, pulseR + 10);

      // Main shield
      this.bulletGraphics.lineStyle(3, 0x22c55e, 0.9);
      this.bulletGraphics.strokeCircle(this.shieldZone.x, this.shieldZone.y, pulseR);

      // Inner fill
      this.bulletGraphics.fillStyle(0x22c55e, 0.2);
      this.bulletGraphics.fillCircle(this.shieldZone.x, this.shieldZone.y, pulseR);

      // Shield icon (cross in center)
      this.bulletGraphics.lineStyle(2, 0x22c55e, 0.7);
      this.bulletGraphics.beginPath();
      this.bulletGraphics.moveTo(this.shieldZone.x, this.shieldZone.y - 8);
      this.bulletGraphics.lineTo(this.shieldZone.x, this.shieldZone.y + 8);
      this.bulletGraphics.strokePath();
      this.bulletGraphics.beginPath();
      this.bulletGraphics.moveTo(this.shieldZone.x - 8, this.shieldZone.y);
      this.bulletGraphics.lineTo(this.shieldZone.x + 8, this.shieldZone.y);
      this.bulletGraphics.strokePath();
    }

    // --- Water particles ---
    for (let i = this.waterParticles.length - 1; i >= 0; i--) {
      const wp = this.waterParticles[i];
      wp.y += wp.vy * dtSec;
      wp.alpha -= dtSec * 0.3;
      if (wp.alpha <= 0 || wp.y < this.arena.y - 50) {
        this.waterParticles.splice(i, 1);
        continue;
      }
      this.bulletGraphics.fillStyle(0x2dd4bf, wp.alpha);
      this.bulletGraphics.fillCircle(wp.x, wp.y, wp.size);
    }

    // --- Jellyfish update ---
    for (let i = this.jellyfishes.length - 1; i >= 0; i--) {
      const jf = this.jellyfishes[i];
      if (!jf || !jf.active) continue;

      jf.y += jf.vy * dtSec;
      jf.x = jf.baseX + Math.sin(jf.phase + timeSec * 2) * 12;

      // Jellyfish Drawing (Original style)
      this.bulletGraphics.fillStyle(0x43b5e8, 0.7);
      this.bulletGraphics.fillCircle(jf.x, jf.y, 10);
      this.bulletGraphics.lineStyle(1, 0xccfbf1, 0.3);
      this.bulletGraphics.strokeCircle(jf.x, jf.y, 12);
      this.bulletGraphics.fillStyle(0xffffff, 0.6);
      this.bulletGraphics.fillCircle(jf.x, jf.y - 2, 3);

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

      if (hit) {
        this.triggerPlayerHit();
        return;
      }

      // Despawn
      if (jf.y > this.arena.y + this.arena.h + 40) {
        jf.active = false;
        this.jellyfishes.splice(i, 1);
      }
    }

    // --- Anchor bombs update ---
    for (let i = this.anchors.length - 1; i >= 0; i--) {
      const a = this.anchors[i];
      if (!a || !a.active) continue;

      if (!a.detonated) {
        a.y += a.vy * dtSec;

        const progress = Math.min(1, (a.y - (this.arena.y - 25)) / (a.targetY - (this.arena.y - 25)));
        const teleR = 5 + progress * 25;
        this.bulletGraphics.lineStyle(2, 0xff4444, 0.4 + progress * 0.4);
        this.bulletGraphics.strokeCircle(a.x, a.targetY, teleR);
        this.bulletGraphics.fillStyle(0xff4444, progress * 0.3 + Math.abs(Math.sin(timeSec * 20)) * 0.3);
        this.bulletGraphics.fillCircle(a.x, a.targetY, teleR);

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

        if (this.soul && Phaser.Math.Distance.Between(this.soul.x, this.soul.y, a.x, a.y) < 14 + this.soulRadius) {
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
      }
    }

    // --- Scissors update ---
    for (let i = this.scissors.length - 1; i >= 0; i--) {
      const s = this.scissors[i];
      if (!s || !s.active) continue;

      if (s.state === "TELEGRAPH") {
        s.timer -= dtSec;
        const alpha = 0.3 + Math.sin(timeSec * 20) * 0.3;
        this.bulletGraphics.lineStyle(2, 0xff0000, alpha);
        
        const topAngle = s.rotAngle - s.angleOpen;
        const botAngle = s.rotAngle + s.angleOpen;
        
        this.bulletGraphics.beginPath();
        this.bulletGraphics.moveTo(s.x, s.y);
        this.bulletGraphics.lineTo(s.x + Math.cos(topAngle) * s.length, s.y + Math.sin(topAngle) * s.length);
        this.bulletGraphics.strokePath();

        this.bulletGraphics.beginPath();
        this.bulletGraphics.moveTo(s.x, s.y);
        this.bulletGraphics.lineTo(s.x + Math.cos(botAngle) * s.length, s.y + Math.sin(botAngle) * s.length);
        this.bulletGraphics.strokePath();

        // Draw handles (loops) at the back of the blades
        const handleAng1 = topAngle + Math.PI;
        const handleAng2 = botAngle + Math.PI;
        this.bulletGraphics.strokeCircle(s.x + Math.cos(handleAng1) * 15, s.y + Math.sin(handleAng1) * 15, 10);
        this.bulletGraphics.strokeCircle(s.x + Math.cos(handleAng2) * 15, s.y + Math.sin(handleAng2) * 15, 10);

        if (s.timer <= 0) {
          s.state = "SNAPPING";
          s.timer = 0.5;
        }
        continue;
      }

      if (s.state === "SNAPPING") {
        s.timer -= dtSec;
        const progress = Math.max(0, s.timer / 0.5);
        const currentOpen = s.angleOpen * progress;

        const topAngle = s.rotAngle - currentOpen;
        const botAngle = s.rotAngle + currentOpen;

        this.bulletGraphics.lineStyle(4, 0xaaaaaa, 1);
        
        this.bulletGraphics.beginPath();
        this.bulletGraphics.moveTo(s.x - Math.cos(topAngle) * 30, s.y - Math.sin(topAngle) * 30);
        this.bulletGraphics.lineTo(s.x + Math.cos(topAngle) * s.length, s.y + Math.sin(topAngle) * s.length);
        this.bulletGraphics.strokePath();
        
        this.bulletGraphics.beginPath();
        this.bulletGraphics.moveTo(s.x - Math.cos(botAngle) * 30, s.y - Math.sin(botAngle) * 30);
        this.bulletGraphics.lineTo(s.x + Math.cos(botAngle) * s.length, s.y + Math.sin(botAngle) * s.length);
        this.bulletGraphics.strokePath();

        // Draw handles (loops) at the back of the blades
        const handleAng1 = topAngle + Math.PI;
        const handleAng2 = botAngle + Math.PI;
        this.bulletGraphics.strokeCircle(s.x + Math.cos(handleAng1) * 15, s.y + Math.sin(handleAng1) * 15, 10);
        this.bulletGraphics.strokeCircle(s.x + Math.cos(handleAng2) * 15, s.y + Math.sin(handleAng2) * 15, 10);

        this.bulletGraphics.fillStyle(0xffffff, 1);
        this.bulletGraphics.fillCircle(s.x, s.y, 4);

        if (this.soul) {
          if (this.pointToLineDistance(this.soul.x, this.soul.y, s.x - Math.cos(topAngle) * 30, s.y - Math.sin(topAngle) * 30, s.x + Math.cos(topAngle) * s.length, s.y + Math.sin(topAngle) * s.length) < this.soulRadius + 2) {
            this.triggerPlayerHit();
            return;
          }
          if (this.pointToLineDistance(this.soul.x, this.soul.y, s.x - Math.cos(botAngle) * 30, s.y - Math.sin(botAngle) * 30, s.x + Math.cos(botAngle) * s.length, s.y + Math.sin(botAngle) * s.length) < this.soulRadius + 2) {
            this.triggerPlayerHit();
            return;
          }
        }

        if (s.timer <= 0) {
          s.active = false;
          this.scissors.splice(i, 1);
        }
      }
    }

    // --- Musical notes update ---
    for (let i = this.musicalNotes.length - 1; i >= 0; i--) {
      const mn = this.musicalNotes[i];
      if (!mn || !mn.active) continue;

      mn.x += mn.vx * dtSec;
      mn.y += mn.vy * dtSec;

      let bounced = false;
      if (mn.x < this.arena.x + 5) { mn.x = this.arena.x + 5; mn.vx *= -1; bounced = true; }
      else if (mn.x > this.arena.x + this.arena.w - 5) { mn.x = this.arena.x + this.arena.w - 5; mn.vx *= -1; bounced = true; }
      if (mn.y < this.arena.y + 5) { mn.y = this.arena.y + 5; mn.vy *= -1; bounced = true; }
      else if (mn.y > this.arena.y + this.arena.h - 5) { mn.y = this.arena.y + this.arena.h - 5; mn.vy *= -1; bounced = true; }

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

      if (this.soul && Phaser.Math.Distance.Between(this.soul.x, this.soul.y, mn.x, mn.y) < 6 + this.soulRadius) {
        this.triggerPlayerHit();
        return;
      }
    }
  }
}
