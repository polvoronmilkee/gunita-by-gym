import Phaser from "phaser";
import { BaseBulletHellScene } from "./bullethell/BaseBulletHellScene.js";
import { AudioManager } from "../utils/audioManager.js";

export class FragmentRosary extends BaseBulletHellScene {
  constructor() {
    super("fragment-rosary");
  }

  getFallbackSoulName() { return "The Fisherman"; }
  getFallbackDodgeLines() {
    return [
      "Faith alone will not save you here...",
      "The beads will not protect the forgetful.",
      "Pray harder. Remember deeper."
    ];
  }
  getFallbackBgKey() { return "bg-rosary-scene"; }
  getAudioBossKey() { return "rosary-boss"; }
  getSoulColor() { return 0xf7c948; }
  getTitleColor() { return "#f7c948"; }
  getTimerFillColor() { return 0xf7c948; }



  preload() {
    super.preload();
    if (!this.textures.exists("bg-rosary-scene")) {
      this.load.image("bg-rosary-scene", "src/assets/grave1-elements/bullet-scenes/rosary.png");
    }
    if (!this.cache.audio.has("rosary-boss")) {
      this.load.audio("rosary-boss", new URL("../assets/sounds/music/rosary_BOSS.mp3", import.meta.url).href);
    }
  }

  create() {
    this.bgKey = this.textures.exists(this.bgKey) ? this.bgKey : "bg-rosary-scene";
    
    super.create();
    
    this.rosaryPendulums = [];
    this.divineCross = null;
    this.playerSlowed = false;
    this.slowTimer = 0;
  }

  customCleanup() {
    this.rosaryPendulums = [];
    this.divineCross = null;
    this.playerSlowed = false;
    this.slowTimer = 0;
  }

  getPlayerSpeedModifier() {
    return this.playerSlowed ? 0.7 : 1.0;
  }
  
  drawSoul() {
    if (!this.soul) return;
    this.soul.clear();
    
    if (this.isInvincible) {
       this.soul.fillStyle(0xffffff, 0.4 + Math.sin(this.time.now / 50) * 0.3);
       this.soul.fillCircle(0, 2, this.soulRadius * 1.8);
    }
    
    if (this.playerSlowed) {
      this.soul.fillStyle(0xf7c948, 0.8);
      this.soul.lineStyle(1, 0xffffff, 0.8);
      this.soul.fillCircle(0, 2, this.soulRadius);
      this.soul.strokeCircle(0, 2, this.soulRadius);
      this.soul.fillTriangle(-4, 2, 4, 2, 0, -8);
      this.soul.strokeTriangle(-4, 2, 4, 2, 0, -8);
    } else {
      this.soul.fillStyle(0xb57fee, 1);
      this.soul.lineStyle(1, 0xffffff, 0.8);
      this.soul.fillCircle(0, 2, this.soulRadius);
      this.soul.strokeCircle(0, 2, this.soulRadius);
      this.soul.fillTriangle(-4, 2, 4, 2, 0, -8);
      this.soul.strokeTriangle(-4, 2, 4, 2, 0, -8);
    }
  }

  startPatternsForPhase() {
    this.patternTimers = [];
    this.isDesperation = false;
    const phase = this.getCurrentPhase();

    if (phase === 1) {
      const pool1 = [1, 2, 5];
      const choice = this.pickRandomPattern(pool1);
      this.executePattern(choice);
    } else if (phase === 2) {
      let choice;
      if (!this.hasSeenPhase2NewPattern) {
        const newPool = [3, 4];
        choice = this.pickRandomPattern(newPool);
        this.hasSeenPhase2NewPattern = true;
      } else {
        const pool2 = [1, 2, 3, 4, 5];
        choice = this.pickRandomPattern(pool2);
      }
      this.executePattern(choice);
    } else if (phase === 3) {
      this.isDesperation = true;
      this.phaseTimer = 14000;
      this.maxPhaseTimer = 14000;
      this.crystalEnemy.setTint(0xff1111);

      this.fireDivineCross(this.phaseTimer);
      const otherPatterns = [1, 3, 4, 5];
      const choice = this.pickRandomPattern(otherPatterns);
      this.executePattern(choice);
    }
  }

  executePattern(patternId) {
    const desp = this.isDesperation;
    const duration = desp ? 14000 : 10000;

    // Pattern 1: Rosary Pendulum
    // Tweak swing duration, numBeads, and missingBeadIndex inside fireRosaryPendulum() to customize.
    if (patternId === 1) {
      this.fireRosaryPendulum(duration);
    // Pattern 2: Divine Cross
    // Tweak cross arm length, rotation, and particle speed inside fireDivineCross() to customize.
    } else if (patternId === 2) {
      this.fireDivineCross(duration);
    // Pattern 3: Candle Rain
    // Tweak speed, count, and drop frequency inside fireCandleRain() to customize.
    } else if (patternId === 3) {
      const baseSpeed = desp ? 95 : 75;
      let speedInc = 0;
      for (let t = 0; t < duration; t += 1800) {
        const speed = baseSpeed + speedInc;
        this.patternTimers.push(this.time.delayedCall(t, () => this.fireCandleRain(speed)));
        speedInc += 8;
      }
    // Pattern 4: Incense Spiral
    // Tweak arm count, spacing, and rotation speed inside fireIncenseSpiral() to customize.
    } else if (patternId === 4) {
      this.fireIncenseSpiral(duration);
    // Pattern 5: Bouncing Rosary Ring
    // Tweak ring size, speed, and bounce parameters inside fireBouncingRosaryRing() to customize.
    } else if (patternId === 5) {
      for (let t = 0; t < duration; t += 3600) {
        this.patternTimers.push(this.time.delayedCall(t, () => this.fireBouncingRosaryRing()));
      }
    }
  }

  fireRosaryPendulum(duration) {
    if (this.state !== "DODGE") return;
    const { x, y, w, h } = this.arena;
    const desp = this.isDesperation;

    this.sharedRosaryGapIndex = Phaser.Math.Between(3, 8);

    const createPendulum = (isOpposite) => {
      const start = isOpposite ? -Math.PI / 2 : Math.PI / 2;
      const end = isOpposite ? Math.PI / 2 : -Math.PI / 2;
      return {
        anchorX: x + w / 2,
        anchorY: y,
        numBeads: 16,
        segmentLength: 22,
        beadRadius: 10,
        hitboxRadius: 9,
        swingState: "HOLD",
        holdDelay: 0.8,
        isInitialHold: true,
        swingProgress: 0,
        swingDuration: 2200, // Slower swing duration (was 1600)
        startAngle: start,
        endAngle: end,
        angleHistory: [],
        active: true
      };
    };

    this.rosaryPendulums.push(createPendulum(false));

    if (desp) {
      this.rosaryPendulums.push(createPendulum(true));
    }
  }

  fireDivineCross(duration) {
    if (this.state !== "DODGE") return;
    const { x, y, w, h } = this.arena;
    const desp = this.isDesperation;

    const crossX = x + w / 2;
    const crossY = y + h / 2;

    this.divineCross = {
      x: this.crystalEnemy.x,
      y: this.crystalEnemy.y,
      targetX: crossX,
      targetY: crossY,
      size: 30,
      active: false,
      dropping: true,
      pulseTimer: 0,
      pulseInterval: desp ? 1500 : 2000,
      shootTimer: 0,
      shootInterval: desp ? 600 : 800,
      pulseRings: []
    };

    this.tweens.add({
      targets: this.divineCross,
      x: crossX,
      y: crossY,
      duration: 800,
      ease: "Bounce.easeOut",
      onComplete: () => {
        if (this.divineCross) {
          this.divineCross.active = true;
          this.divineCross.dropping = false;
          this.cameras.main.shake(80, 0.003);
        }
      }
    });
  }

  fireCandleRain(baseSpeed) {
    if (this.state !== "DODGE") return;
    const { x, w } = this.arena;
    const spawnY = this.boxCenterY - 130;
    const desp = this.isDesperation;

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
        vy: baseSpeed,
        radius: 4,
        color: 0xf7c948,
        isCandleFlame: true,
        swayPhase: Math.random() * Math.PI * 2
      });
    }
  }

  fireIncenseSpiral(duration) {
    if (this.state !== "DODGE") return;
    const { x, y, w, h } = this.arena;
    const desp = this.isDesperation;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const maxRadius = Math.min(w, h) / 2 - 10;

    const half = duration / 2;

    const spawnCycle = (startTime, cycleDuration) => {
      const numArms = desp ? 3 : 2;
      const armSpacing = (Math.PI * 2) / numArms;
      const rotSpeed = 1.5;
      const spawnInterval = 250;
      let baseAngle = Math.random() * Math.PI * 2;

      for (let t = 0; t < cycleDuration; t += spawnInterval) {
        this.patternTimers.push(this.time.delayedCall(startTime + t, () => {
          if (this.state !== "DODGE") return;
          const elapsed = t / 1000;
          const angle = baseAngle + elapsed * rotSpeed;

          for (let arm = 0; arm < numArms; arm++) {
            const a = angle + arm * armSpacing;
            const spawnX = cx + maxRadius * Math.cos(a);
            const spawnY = cy + maxRadius * Math.sin(a);
            const speed = 75;
            const dirX = (cx - spawnX) / maxRadius;
            const dirY = (cy - spawnY) / maxRadius;

            this.bullets.push({
              active: true,
              x: spawnX,
              y: spawnY,
              vx: dirX * speed,
              vy: dirY * speed,
              radius: 5,
              color: arm % 2 === 0 ? 0xf5a0c0 : 0x7c3aed,
              life: 10000
            });
          }
        }));
      }
    };

    spawnCycle(0, half);
    spawnCycle(half + 500, half - 500);
  }

  fireBouncingRosaryRing() {
    if (this.state !== "DODGE" || !this.soul) return;
    const desp = this.isDesperation;
    const cx = this.crystalEnemy.x;
    const cy = this.crystalEnemy.y;

    const targetX = this.soul.x;
    const targetY = this.soul.y;
    const angle = Phaser.Math.Angle.Between(cx, cy, targetX, targetY);
    const slowSpeed = 80;

    this.bullets.push({
      active: true,
      x: cx,
      y: cy,
      vx: Math.cos(angle) * slowSpeed,
      vy: Math.sin(angle) * slowSpeed,
      radius: 12,
      color: 0xf7c948,
      life: 1400,
      onExplode: (ex, ey) => {
        if (this.state !== "DODGE") return;
        this.cameras.main.shake(100, 0.005);

        const scatterCount = desp ? 8 : 6;
        for (let s = 0; s < scatterCount; s++) {
          const sAngle = (s / scatterCount) * Math.PI * 2 + (Math.PI / 6);
          const bounceSpeed = desp ? 145 : 130;
          this.bullets.push({
            active: true,
            x: ex,
            y: ey,
            vx: Math.cos(sAngle) * bounceSpeed,
            vy: Math.sin(sAngle) * bounceSpeed,
            radius: 5,
            color: 0xe8a317,
            bounces: 2
          });
        }
      }
    });
  }

  updateCustomPatterns(timeSec, dtSec) {
    const delta = dtSec * 1000;

    if (this.playerSlowed) {
      this.slowTimer -= delta;
      if (this.slowTimer <= 0) {
        this.playerSlowed = false;
        this.slowTimer = 0;
      }
    }

    if (this.rosaryPendulums && this.rosaryPendulums.length > 0) {
      for (let pi = 0; pi < this.rosaryPendulums.length; pi++) {
        const p = this.rosaryPendulums[pi];
        if (!p.active) continue;

        if (p.swingState === "HOLD") {
          p.holdDelay -= dtSec;
          if (p.holdDelay <= 0) {
            p.swingState = "SWING";
            p.swingProgress = 0;

            if (p.isInitialHold) {
              p.isInitialHold = false;
            } else {
              const temp = p.startAngle;
              p.startAngle = p.endAngle;
              p.endAngle = temp;
              
              // Only randomize the shared gap index once per full cycle
              if (pi === 0) {
                this.sharedRosaryGapIndex = Phaser.Math.Between(3, 8);
              }
            }
          }
        } else if (p.swingState === "SWING") {
          p.swingProgress += dtSec / (p.swingDuration / 1000);
          if (p.swingProgress >= 1.0) {
            p.swingProgress = 1.0;
            p.swingState = "HOLD";
            p.holdDelay = 1.3;
          }
        }

        const isHolding = p.swingState === "HOLD";
        const t = p.swingProgress;
        const easeT = (1 - Math.cos(t * Math.PI)) / 2;
        const swingAngle = p.startAngle + (p.endAngle - p.startAngle) * easeT;

        if (!isHolding) {
          p.angleHistory.push(swingAngle);
          if (p.angleHistory.length > 4) p.angleHistory.shift();
        } else {
          if (p.angleHistory.length > 0) p.angleHistory.shift();
        }

        const wireAlpha = isHolding ? 0.8 : 0.4;
        this.bulletGraphics.lineStyle(2, 0xf7c948, wireAlpha);
        this.bulletGraphics.beginPath();
        this.bulletGraphics.moveTo(p.anchorX, p.anchorY);

        for (let i = 0; i < p.numBeads; i++) {
          const dist = (i + 1) * p.segmentLength;
          const wx = p.anchorX + dist * Math.sin(swingAngle);
          const wy = p.anchorY + dist * Math.cos(swingAngle);
          this.bulletGraphics.lineTo(wx, wy);
        }
        this.bulletGraphics.strokePath();

        for (let th = 0; th < p.angleHistory.length; th++) {
          const hAngle = p.angleHistory[th];
          const trailAlpha = (th + 1) / (p.angleHistory.length + 1) * 0.12;
          this.bulletGraphics.fillStyle(0xf7c948, trailAlpha);

          for (let i = 0; i < p.numBeads; i++) {
            // Check if within the 4-beads-wide gap
            if (i >= this.sharedRosaryGapIndex && i <= this.sharedRosaryGapIndex + 3) continue;
            const dist = (i + 1) * p.segmentLength;
            const bx = p.anchorX + dist * Math.sin(hAngle);
            const by = p.anchorY + dist * Math.cos(hAngle);

            if (i === p.numBeads - 1) {
              const cs = 5;
              this.bulletGraphics.fillRect(bx - 1, by - cs, 2, cs * 2);
              this.bulletGraphics.fillRect(bx - cs, by - 1, cs * 2, 2);
            } else {
              this.bulletGraphics.fillCircle(bx, by, p.beadRadius - 1);
            }
          }
        }

        for (let i = 0; i < p.numBeads; i++) {
          const dist = (i + 1) * p.segmentLength;
          const bx = p.anchorX + dist * Math.sin(swingAngle);
          const by = p.anchorY + dist * Math.cos(swingAngle);

          // Check if within the 4-beads-wide gap
          if (i >= this.sharedRosaryGapIndex && i <= this.sharedRosaryGapIndex + 3) {
            const gapAlpha = isHolding ? 0.9 : 0.6;
            this.bulletGraphics.lineStyle(2, 0xffffff, gapAlpha);
            this.bulletGraphics.strokeCircle(bx, by, p.beadRadius + 2);
            continue;
          }

          if (i === p.numBeads - 1) {
            const cs = 7;
            this.bulletGraphics.fillStyle(0xf7c948, 1);
            this.bulletGraphics.fillRect(bx - 2, by - cs, 4, cs * 2);
            this.bulletGraphics.fillRect(bx - cs, by - 2, cs * 2, 4);
            this.bulletGraphics.fillStyle(0xffffff, 0.9);
            this.bulletGraphics.fillCircle(bx, by, 3);
          } else {
            this.bulletGraphics.fillStyle(0xf7c948, 0.2);
            this.bulletGraphics.fillCircle(bx, by, p.beadRadius + 4);
            this.bulletGraphics.fillStyle(0xf7c948, 0.95);
            this.bulletGraphics.fillCircle(bx, by, p.beadRadius);
            this.bulletGraphics.fillStyle(0xffffff, 0.85);
            this.bulletGraphics.fillCircle(bx, by, p.beadRadius * 0.4);
          }

          if (this.soul && !isHolding) {
            const d = Phaser.Math.Distance.Between(this.soul.x, this.soul.y, bx, by);
            if (d < this.soulRadius + (p.hitboxRadius || 7)) {
              this.triggerPlayerHit();
              return;
            }
          }
        }
      }
    }

    if (this.divineCross) {
      const cross = this.divineCross;
      const s = cross.size;
      this.bulletGraphics.fillStyle(0xf7c948, 0.1);
      this.bulletGraphics.fillCircle(cross.x, cross.y, s + 15);
      this.bulletGraphics.lineStyle(4, 0xf7c948, 0.9);
      this.bulletGraphics.beginPath();
      this.bulletGraphics.moveTo(cross.x, cross.y - s);
      this.bulletGraphics.lineTo(cross.x, cross.y + s);
      this.bulletGraphics.strokePath();
      this.bulletGraphics.beginPath();
      this.bulletGraphics.moveTo(cross.x - s, cross.y);
      this.bulletGraphics.lineTo(cross.x + s, cross.y);
      this.bulletGraphics.strokePath();
      this.bulletGraphics.fillStyle(0xffffff, 0.85);
      this.bulletGraphics.fillCircle(cross.x, cross.y, 4);

      if (cross.active) {
        cross.pulseTimer += delta;
        if (cross.pulseTimer >= cross.pulseInterval) {
          cross.pulseTimer = 0;
          cross.pulseRings.push({ radius: 10, alpha: 0.9 });
          if (this.soul) {
            this.playerSlowed = true;
            this.slowTimer = 1200;
          }
          this.flashBoxColor(0xf7c948);
        }

        for (let ri = cross.pulseRings.length - 1; ri >= 0; ri--) {
          const ring = cross.pulseRings[ri];
          ring.radius += 280 * dtSec;
          ring.alpha -= 0.7 * dtSec;
          if (ring.alpha <= 0 || ring.radius > 600) {
            cross.pulseRings.splice(ri, 1);
          } else {
            this.bulletGraphics.lineStyle(3, 0xf7c948, ring.alpha);
            this.bulletGraphics.strokeCircle(cross.x, cross.y, ring.radius);
          }
        }

        if (!this.isDesperation) {
          cross.shootTimer += delta;
          if (cross.shootTimer >= cross.shootInterval && this.soul) {
            cross.shootTimer = 0;
            const angle = Phaser.Math.Angle.Between(cross.x, cross.y, this.soul.x, this.soul.y);
            const initialSpeed = 20;
            this.bullets.push({
              active: true,
              x: cross.x,
              y: cross.y,
              vx: Math.cos(angle) * initialSpeed,
              vy: Math.sin(angle) * initialSpeed,
              speed: initialSpeed,
              accel: 175,
              radius: 8,
              color: 0xf7c948,
              isAccelerating: true
            });
          }
        }

      }
    }
    }
  }
}
