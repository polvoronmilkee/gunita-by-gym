import Phaser from "phaser";
import { BaseBulletHellScene } from "./bullethell/BaseBulletHellScene.js";
import { AudioManager } from "../utils/audioManager.js";

export class FragmentRedWarningFlag extends BaseBulletHellScene {
  constructor() {
    super("fragment-red-warning-flag");
  }

  getFallbackSoulName() { return "The Last Fisherman"; }
  getFallbackDodgeLines() {
    return [
      "The sea is unforgiving!",
      "Can you withstand the tide?",
      "Hold fast to your memory!"
    ];
  }
  getFallbackBgKey() { return "bg-fish-basket"; }
  getAudioBossKey() { return "chaotic-fragment"; }
  getSoulColor() { return 0x2dd4bf; }
  getTitleColor() { return "#ff5533"; }
  getTimerFillColor() { return 0x2dd4bf; }



  preload() {
    super.preload();
    if (!this.textures.exists("bg-fish-basket")) {
      this.load.image("bg-fish-basket", "src/assets/grave1-elements/bullet-scenes/fish-basket.png");
    }
    if (!this.textures.exists("red-warning-flag")) {
      this.load.image("red-warning-flag", "src/assets/grave1-elements/bullet-scenes/red-warning-flag.png");
    }
    if (!this.cache.audio.has("chaotic-fragment")) {
      this.load.audio("chaotic-fragment", new URL("../assets/sounds/music/chaotic_fragment_1.mp3", import.meta.url).href);
    }
  }

  create() {
    this.bgKey = this.textures.exists(this.bgKey) ? this.bgKey : "red-warning-flag";
    
    super.create();
    
    // Custom arrays for RedWarningFlag
    this.lasers = [];
    this.activeLasers = [];
    this.activeWarnings = [];
  }

  customCleanup() {
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
  }

  startPatternsForPhase() {
    this.patternTimers = [];
    this.isDesperation = false;
    const phase = this.getCurrentPhase();

    if (phase === 1) {
      const pool1 = [1, 2, 5];
      const choice = Phaser.Utils.Array.GetRandom(pool1);
      this.executePattern(choice);
    } else if (phase === 2) {
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
      this.isDesperation = true;
      this.phaseTimer = 14000;
      this.maxPhaseTimer = 14000;
      this.crystalEnemy.setTint(0xff1111);

      const comboPairs = [
        [1, 5],
        [1, 4],
        [1, 3]
      ];
      const pair = Phaser.Utils.Array.GetRandom(comboPairs);
      this.executePattern(pair[0]);
      this.executePattern(pair[1]);
    }
  }

  executePattern(patternId) {
    const desp = this.isDesperation;
    const duration = desp ? 14000 : 10000;
    
    if (patternId === 1) {
      for (let t = 0; t < duration; t += 2000) {
        this.patternTimers.push(this.time.delayedCall(t, () => this.fireCircleBlast()));
      }
    } else if (patternId === 2) {
      const baseSpeed = desp ? 75 : 85;
      let speedInc = 0;
      for (let t = 0; t < duration; t += 1500) {
        const speed = baseSpeed + speedInc;
        this.patternTimers.push(this.time.delayedCall(t, () => this.fireWaveGrid(speed)));
        speedInc += 20;
      }
    } else if (patternId === 3) {
      for (let t = 500; t < duration; t += 2400) {
        this.patternTimers.push(this.time.delayedCall(t, () => this.fireSweepingLaser()));
      }
    } else if (patternId === 4) {
      this.fireThunderSplitter(duration);
    } else if (patternId === 5) {
      for (let t = 0; t < duration; t += 3000) {
        this.patternTimers.push(this.time.delayedCall(t, () => this.fireSpotlightBurst()));
      }
    }
  }

  fireCircleBlast() {
    if (this.state !== "DODGE") return;
    const count = this.isDesperation ? 14 : 16;
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

        const bullet = { active: true, x: bx, y: by, vx: 0, vy: 0, radius: 4, color: 0x06b6d4 };
        this.bullets.push(bullet);
        ringBullets.push(bullet);
      }));
    }

    this.patternTimers.push(this.time.delayedCall(formTime + 50, () => {
      if (this.state !== "DODGE" || !this.soul) return;
      const targetX = this.soul.x;
      const targetY = this.soul.y;
      const speed = this.isDesperation ? 210 : 230;

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

  fireWaveGrid(baseSpeed) {
    if (this.state !== "DODGE") return;
    const arenaX = this.arena.x;
    const arenaY = this.arena.y;
    const arenaW = this.arena.w;

    const count = 10;
    const step = arenaW / (count + 1);
    const phaseOffset = Math.random() * Math.PI * 2;

    for (let i = 1; i <= count; i++) {
      if (i === 2 || i === 6 || i === 8) continue;
      const baseX = arenaX + step * i;
      const sineShift = Math.sin(i * 0.8 + phaseOffset) * 12;
      this.bullets.push({
        active: true,
        x: baseX + sineShift,
        y: arenaY,
        vx: Math.cos(phaseOffset) * 15,
        vy: baseSpeed,
        radius: 4,
        bounces: 1
      });
    }
  }

  fireSingleLaserSweep(directionIndex, onCompleteCallback) {
    if (this.state !== "DODGE") return;
    const { x, y, w, h } = this.arena;
    let startX, startY, endX, endY, laserW, laserH, warnX, warnY, warnW, warnH;
    const sweepDuration = this.isDesperation ? 1300 : 1800;

    if (directionIndex === 0) {
      startX = x; startY = y;
      endX = x + w / 2 - 6; endY = y;
      laserW = 12; laserH = h;
      warnX = x; warnY = y; warnW = w / 2; warnH = h;
    } else if (directionIndex === 1) {
      startX = x + w - 12; startY = y;
      endX = x + w / 2 - 6; endY = y;
      laserW = 12; laserH = h;
      warnX = x + w / 2; warnY = y; warnW = w / 2; warnH = h;
    } else if (directionIndex === 2) {
      startX = x; startY = y;
      endX = x; endY = y + h / 2 - 6;
      laserW = w; laserH = 12;
      warnX = x; warnY = y; warnW = w; warnH = h / 2;
    } else {
      startX = x; startY = y + h - 12;
      endX = x; endY = y + h / 2 - 6;
      laserW = w; laserH = 12;
      warnX = x; warnY = y + h / 2; warnW = w; warnH = h / 2;
    }

    const isVertical = laserH > laserW;
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
        const alpha = (warnBlink % 2 === 0) ? 0.45 : 0.25;
        warn.fillStyle(0x06b6d4, alpha);
        warn.fillRect(warnX, warnY, warnW, warnH);
        warn.lineStyle(2, 0xffffff, 0.8);
        warn.strokeRect(warnX + 2, warnY + 2, warnW - 4, warnH - 4);
      }
    });
    this.patternTimers.push(warnTimer);

    this.patternTimers.push(this.time.delayedCall(800, () => {
      if (warn && warn.active) warn.destroy();
      if (this.state !== "DODGE") return;

      this.cameras.main.shake(80, 0.003);

      const laser = { x: startX, y: startY, w: laserW, h: laserH, graphics: this.add.graphics(), life: 2800 };
      this.lasers.push(laser);

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

          laser.graphics.fillStyle(0x0891b2, 0.25);
          if (isVertical) {
            laser.graphics.fillRect(laser.x - 6, laser.y, laser.w + 12, laser.h);
          } else {
            laser.graphics.fillRect(laser.x, laser.y - 6, laser.w, laser.h + 12);
          }

          laser.graphics.fillStyle(0x06b6d4, 0.85);
          laser.graphics.fillRect(laser.x, laser.y, laser.w, laser.h);

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

          if (Math.random() < 0.4) {
            const sparkCount = Phaser.Math.Between(1, 3);
            for (let sp = 0; sp < sparkCount; sp++) {
              laser.graphics.lineStyle(1, 0xffffff, 0.7);
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

  fireThunderSplitter(duration) {
    if (this.state !== "DODGE") return;
    const { x, y, w, h } = this.arena;

    const laneWidth = w / 3;
    const laserW = 12;
    const laserH = h;
    const laser1X = x + laneWidth - laserW / 2;
    const laser2X = x + laneWidth * 2 - laserW / 2;

    const spawnLasers = (startTime, cycleDuration) => {
      this.patternTimers.push(this.time.delayedCall(startTime, () => {
        if (this.state !== "DODGE") return;

        const warn = this.add.graphics();
        this.activeWarnings.push(warn);
        let pulse = 0;
        const warnTimer = this.time.addEvent({
          delay: 200,
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

        this.patternTimers.push(this.time.delayedCall(1050, () => {
          if (warn && warn.active) warn.destroy();
          if (this.state !== "DODGE") return;

          this.cameras.main.shake(150, 0.005);

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
            
            for (let s = 1; s < segments; s++) {
              zigzags[s] += Phaser.Math.Between(-2, 2);
              zigzags[s] = Phaser.Math.Clamp(zigzags[s], -8, 8);
            }

            l.graphics.fillStyle(0x3b82f6, 0.15);
            l.graphics.fillRect(l.x - 6, l.y, l.w + 12, l.h);
            l.graphics.fillStyle(0x3b82f6, 0.85);
            l.graphics.fillRect(l.x, l.y, l.w, l.h);
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
            alpha: 1, 
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

    const half = duration / 2;
    spawnLasers(0, half);
    spawnLasers(half, half);

    for (let t = 1500; t < duration; t += 4000) {
      this.patternTimers.push(this.time.delayedCall(t, () => {
        if (this.state !== "DODGE" || !this.soul) return;

        const spawnX = this.crystalEnemy.x;
        const spawnY = this.crystalEnemy.y;
        
        const speed = this.isDesperation ? 70 : 80;
        const radius = 18; 
        
        const createOrb = (xOffset) => {
          return {
            active: true,
            x: spawnX + xOffset,
            y: spawnY,
            vx: 0,
            vy: 0,
            radius: radius,
            isHoming: true,
            homingSpeed: speed,
            color: 0xff5533,
            trail: [],
            life: 2000,
            onExplode: (ex, ey) => {
              if (this.state !== "DODGE") return;
              
              if (this.soul) {
                const dist = Phaser.Math.Distance.Between(this.soul.x, this.soul.y, ex, ey);
                if (dist < radius * 2 + this.soulRadius) {
                  this.triggerPlayerHit();
                }
              }

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
                  burst.lineStyle(3, 0x3b82f6, a);
                  burst.strokeCircle(ex, ey, radius * 2 + bPulse * 4);
                  
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

              const burstSpeed = desp ? 160 : 180;
              const angles = [0, 60, 120, 180, 240, 300];
              angles.forEach(deg => {
                const rad = Phaser.Math.DegToRad(deg);
                this.bullets.push({
                  active: true,
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

    fireSpot();
  }

  updateCustomPatterns(timeSec, dtSec) {
    const deltaMs = dtSec * 1000;
    
    if (this.activeLasers) {
      this.activeLasers.forEach(laser => {
        if (!laser || !laser.active) return;
        if (laser.width > laser.height) {
          if (Math.abs(this.soul.y - laser.y) < 6) this.triggerPlayerHit();
        } else {
          if (Math.abs(this.soul.x - laser.x) < 6) this.triggerPlayerHit();
        }
      });
    }

    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      l.life -= deltaMs;

      if (l.x !== undefined && l.y !== undefined && l.w !== undefined && l.h !== undefined) {
        const testX = Math.max(l.x, Math.min(this.soul.x, l.x + l.w));
        const testY = Math.max(l.y, Math.min(this.soul.y, l.y + l.h));

        const dist = Phaser.Math.Distance.Between(this.soul.x, this.soul.y, testX, testY);
        if (dist < this.soulRadius) {
          this.triggerPlayerHit();
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
