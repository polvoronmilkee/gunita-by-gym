import Phaser from "phaser";
import { BaseBulletHellScene } from "./bullethell/BaseBulletHellScene.js";

export class FragmentFishBasket extends BaseBulletHellScene {
  constructor() {
    super("fragment-fish-basket");
  }

  getFallbackSoulName() { return "The Old Fisherman"; }
  getFallbackDodgeLines() {
    return [
      "The tides will not wait for you...",
      "Respect the deep ocean currents.",
      "Hold fast against the storm!"
    ];
  }
  getFallbackBgKey() { return "bg-fish-basket"; }
  getAudioBossKey() { return "fish-basket-boss"; }
  getSoulColor() { return 0x43b5e8; }
  getTitleColor() { return "#43b5e8"; }
  getTimerFillColor() { return 0x43b5e8; }


  preload() {
    super.preload();
    if (!this.textures.exists("bg-fish-basket")) {
      this.load.image("bg-fish-basket", "src/assets/grave1-elements/bullet-scenes/fish-basket.png");
    }
  }

  create() {
    super.create();
    
    // Custom fish basket pattern objects
    this.jellyfishes = [];
    this.urchins = [];
    this.anchors = [];
    this.nets = [];
    this.tidalWaves = [];
  }

  customCleanup() {
    this.jellyfishes = [];
    this.urchins = [];
    this.anchors = [];
    this.nets = [];
    this.tidalWaves = [];
  }

  startPatternsForPhase() {
    this.patternTimers = [];
    this.isDesperation = false;
    const phase = this.getCurrentPhase();

    if (phase === 1) {
      const pool = [1, 2, 3];
      this.executePattern(Phaser.Utils.Array.GetRandom(pool));
    } else if (phase === 2) {
      let choice;
      if (!this.hasSeenPhase2NewPattern) {
        choice = Phaser.Utils.Array.GetRandom([4, 5]);
        this.hasSeenPhase2NewPattern = true;
      } else {
        choice = Phaser.Utils.Array.GetRandom([1, 2, 3, 4, 5]);
      }
      this.executePattern(choice);
    } else if (phase === 3) {
      this.isDesperation = true;
      this.phaseTimer = 14000;
      this.maxPhaseTimer = 14000;
      this.crystalEnemy.setTint(0xff1111);

      this.executePattern(Phaser.Utils.Array.GetRandom([1, 2, 3, 4, 5]));
    }
  }

  executePattern(patternId) {
    const desp = this.isDesperation;
    const duration = desp ? 14000 : 10000;

    if (patternId === 1) {
      const interval = desp ? 1800 : 2200;
      for (let t = 0; t < duration; t += interval) {
        this.patternTimers.push(this.time.delayedCall(t, () => this.fireJellyfishWave()));
      }
    } else if (patternId === 2) {
      const interval = desp ? 2000 : 2600;
      for (let t = 0; t < duration; t += interval) {
        this.patternTimers.push(this.time.delayedCall(t, () => this.spawnSeaUrchin()));
      }
    } else if (patternId === 3) {
      const interval = desp ? 2400 : 3200;
      for (let t = 0; t < duration; t += interval) {
        this.patternTimers.push(this.time.delayedCall(t, () => this.dropAnchorBomb()));
      }
    } else if (patternId === 4) {
      const interval = desp ? 2400 : 3200;
      for (let t = 0; t < duration; t += interval) {
        this.patternTimers.push(this.time.delayedCall(t, () => this.dropFishingNet()));
      }
    } else if (patternId === 5) {
      const interval = desp ? 1500 : 2200;
      for (let t = 0; t < duration; t += interval) {
        this.patternTimers.push(this.time.delayedCall(t, () => this.crashTidalWave()));
      }
    }
  }

  fireJellyfishWave() {
    const desp = this.isDesperation;
    const count = desp ? 8 : 6;
    const gaps = desp ? 1 : 2;
    const cols = 10;
    const colW = this.arena.w / cols;

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
  }

  spawnSeaUrchin() {
    const desp = this.isDesperation;
    const count = desp ? 2 : 1;

    for (let c = 0; c < count; c++) {
      const ux = Phaser.Math.Between(this.arena.x + 40, this.arena.x + this.arena.w - 40);
      const uy = Phaser.Math.Between(this.arena.y + 40, this.arena.y + this.arena.h - 40);

      const urchin = {
        active: true,
        x: ux,
        y: uy,
        timer: 1.5,
        spines: desp ? 6 : 6,
        fired: false
      };
      this.urchins.push(urchin);
    }
  }

  dropAnchorBomb() {
    const desp = this.isDesperation;
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
  }

  dropFishingNet() {
    const desp = this.isDesperation;
    const count = desp ? 6 : 4;

    for (let c = 0; c < count; c++) {
      const nx = Phaser.Math.Between(this.arena.x + 40, this.arena.x + this.arena.w - 40);
      const ny = this.arena.y - 20;
      const ang = Phaser.Math.Between(30, 150) * (Math.PI / 180);
      const speed = desp ? 160 : 145;
      
      this.nets.push({
        active: true,
        x: nx,
        y: ny,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        state: "BALL",
        patchTimer: 0,
        radius: 10
      });
    }
  }

  crashTidalWave() {
    const desp = this.isDesperation;
    const gapHeight = desp ? 3 : 4;
    const rows = 18;
    const startGap = Phaser.Math.Between(1, rows - 1 - gapHeight);
    let safeRows = [];
    for (let i = 0; i < gapHeight; i++) safeRows.push(startGap + i);

    this.tidalWaves.push({
      active: true,
      x: this.arena.x - 20,
      vx: desp ? 130 : 95,
      safeRows: safeRows,
      rows: rows
    });
  }

  // Override to include homing params
  spawnBullet(x, y, vx, vy, radius = 4, color = 0x2dd4bf, bounces = 0, isArrow = false, bounceHome = false) {
    this.bullets.push({
      active: true,
      x, y, vx, vy, radius, color, bounces, isArrow, bounceHome, homing: false
    });
  }

  updateCustomPatterns(timeSec, dtSec) {
    if (this.isDesperation) {
      const cx = this.arena.x + this.arena.w / 2;
      const cy = this.arena.y + this.arena.h / 2;
      const angleToCenter = Math.atan2(cy - this.soul.y, cx - this.soul.x);
      const pullSpeed = 35 * dtSec;
      
      // Affect the soul's movement directly from this hook
      this.soul.x += Math.cos(angleToCenter) * pullSpeed;
      this.soul.y += Math.sin(angleToCenter) * pullSpeed;

      const maxR = Math.max(this.arena.w, this.arena.h) / 2;
      this.bulletGraphics.fillStyle(0x0e7490, 0.1 + Math.sin(timeSec * 3) * 0.04);
      this.bulletGraphics.fillCircle(cx, cy, maxR);
      this.bulletGraphics.lineStyle(1, 0x43b5e8, 0.2);
      this.bulletGraphics.strokeCircle(cx, cy, maxR);

      for (let arm = 0; arm < 5; arm++) {
        for (let step = 1; step <= 30; step++) {
          const r = 10 + step * (maxR / 30);
          if (r > maxR) continue;
          const ang = arm * (Math.PI * 2 / 5) + timeSec * 1.5 + step * 0.15;
          const dotX = cx + r * Math.cos(ang);
          const dotY = cy + r * Math.sin(ang);
          if (dotX >= this.arena.x && dotX <= this.arena.x + this.arena.w &&
              dotY >= this.arena.y && dotY <= this.arena.y + this.arena.h) {
            this.bulletGraphics.fillStyle(0xccfbf1, 0.25);
            this.bulletGraphics.fillCircle(dotX, dotY, 1.5 + (step / 10));
          }
        }
      }
    }

    for (let i = this.jellyfishes.length - 1; i >= 0; i--) {
      const jf = this.jellyfishes[i];
      if (!jf || !jf.active) continue;

      jf.y += jf.vy * dtSec;
      jf.x = jf.baseX + Math.sin(timeSec * 2 + jf.phase) * 12;

      if (jf.y < this.arena.y - 40) {
        jf.active = false;
        this.jellyfishes.splice(i, 1);
        continue;
      }

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

      if (hit) { this.triggerPlayerHit(); return; }
    }

    for (let i = this.urchins.length - 1; i >= 0; i--) {
      const u = this.urchins[i];
      if (!u || !u.active) continue;

      u.timer -= dtSec;
      const pulseR = 14 + Math.sin(timeSec * 6) * 3;

      if (u.timer > 0) {
         const warningAlpha = 0.2 + Math.abs(Math.sin(timeSec * 15)) * 0.3;
         this.bulletGraphics.fillStyle(0xff4444, warningAlpha);
         this.bulletGraphics.fillCircle(u.x, u.y, 35);
         this.bulletGraphics.lineStyle(2, 0xff0000, 0.5);
         this.bulletGraphics.strokeCircle(u.x, u.y, 35);
      }

      this.bulletGraphics.fillStyle(0x022c22, 1.0);
      this.bulletGraphics.fillCircle(u.x, u.y, 14);
      this.bulletGraphics.fillStyle(0x065f46, 0.8);
      this.bulletGraphics.fillCircle(u.x, u.y, 10);

      for (let sp = 0; sp < u.spines; sp++) {
        const ang = sp * (Math.PI * 2 / u.spines) + timeSec * 2;
        const innerR = 10;
        const outerR = 14 + pulseR * (u.timer < 0.5 ? 0.3 : 1.0);
        
        const tipX = u.x + Math.cos(ang) * outerR;
        const tipY = u.y + Math.sin(ang) * outerR;
        const leftX = u.x + Math.cos(ang + 0.3) * innerR;
        const leftY = u.y + Math.sin(ang + 0.3) * innerR;
        const rightX = u.x + Math.cos(ang - 0.3) * innerR;
        const rightY = u.y + Math.sin(ang - 0.3) * innerR;

        this.bulletGraphics.fillStyle(0x059669, 0.9);
        this.bulletGraphics.fillTriangle(tipX, tipY, leftX, leftY, rightX, rightY);
      }

      if (Phaser.Math.Distance.Between(this.soul.x, this.soul.y, u.x, u.y) < 16 + this.soulRadius) {
        this.triggerPlayerHit();
        return;
      }

      if (u.timer <= 0 && !u.fired) {
        u.fired = true;
        u.active = false;
        this.sound.play("sfx-dash", { volume: 0.4 });
        for (let sp = 0; sp < u.spines; sp++) {
          const ang = sp * (Math.PI * 2 / u.spines);
          this.bullets.push({
            active: true,
            x: u.x,
            y: u.y,
            vx: Math.cos(ang) * 90,
            vy: Math.sin(ang) * 90,
            radius: 6,
            color: 0xa855f7,
            bounces: 1,
            bounceHome: true,
            isArrow: true,
            homing: false,
            lifespan: 3.5
          });
        }
        this.urchins.splice(i, 1);
      }
    }

    for (let i = this.anchors.length - 1; i >= 0; i--) {
      const a = this.anchors[i];
      if (!a || !a.active) continue;

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

      if (Phaser.Math.Distance.Between(this.soul.x, this.soul.y, a.x, a.y) < 14 + this.soulRadius) {
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

    for (let i = this.nets.length - 1; i >= 0; i--) {
      const net = this.nets[i];
      if (!net || !net.active) continue;

      if (net.state === "BALL") {
        net.x += net.vx * dtSec;
        net.y += net.vy * dtSec;
        
        let hitWall = false;
        if (net.x - net.radius < this.arena.x) { net.x = this.arena.x + net.radius; net.vx *= -1; hitWall = true; }
        else if (net.x + net.radius > this.arena.x + this.arena.w) { net.x = this.arena.x + this.arena.w - net.radius; net.vx *= -1; hitWall = true; }
        
        if (net.y - net.radius < this.arena.y) { net.y = this.arena.y + net.radius; net.vy *= -1; hitWall = true; }
        else if (net.y + net.radius > this.arena.y + this.arena.h) { net.y = this.arena.y + this.arena.h - net.radius; net.vy *= -1; hitWall = true; }

        if (hitWall) {
          net.state = "PATCH";
          net.patchTimer = 1.5;
        }

        this.bulletGraphics.fillStyle(0x78716c, 1.0);
        this.bulletGraphics.fillCircle(net.x, net.y, net.radius);
        this.bulletGraphics.lineStyle(2, 0xa8a29e, 0.8);
        this.bulletGraphics.beginPath();
        this.bulletGraphics.moveTo(net.x - 8, net.y - 8); this.bulletGraphics.lineTo(net.x + 8, net.y + 8);
        this.bulletGraphics.moveTo(net.x + 8, net.y - 8); this.bulletGraphics.lineTo(net.x - 8, net.y + 8);
        this.bulletGraphics.moveTo(net.x, net.y - 10); this.bulletGraphics.lineTo(net.x, net.y + 10);
        this.bulletGraphics.moveTo(net.x - 10, net.y); this.bulletGraphics.lineTo(net.x + 10, net.y);
        this.bulletGraphics.strokePath();

        if (Phaser.Math.Distance.Between(this.soul.x, this.soul.y, net.x, net.y) < net.radius + this.soulRadius) {
          this.triggerPlayerHit();
          return;
        }

      } else if (net.state === "PATCH") {
        net.patchTimer -= dtSec;
        if (net.patchTimer <= 0) {
          net.state = "BALL";
        }

        const patchR = 28;
        this.bulletGraphics.fillStyle(0x57534e, 0.4);
        this.bulletGraphics.fillCircle(net.x, net.y, patchR);
        this.bulletGraphics.lineStyle(1, 0xa8a29e, 0.6);
        
        this.bulletGraphics.beginPath();
        for (let p = -20; p <= 20; p += 8) {
          this.bulletGraphics.moveTo(net.x + p, net.y - patchR * 0.8);
          this.bulletGraphics.lineTo(net.x + p, net.y + patchR * 0.8);
          this.bulletGraphics.moveTo(net.x - patchR * 0.8, net.y + p);
          this.bulletGraphics.lineTo(net.x + patchR * 0.8, net.y + p);
        }
        this.bulletGraphics.strokePath();

        if (Phaser.Math.Distance.Between(this.soul.x, this.soul.y, net.x, net.y) < patchR + this.soulRadius) {
          this.triggerPlayerHit();
          return;
        }
      }
    }

    for (let i = this.tidalWaves.length - 1; i >= 0; i--) {
      const tw = this.tidalWaves[i];
      if (!tw || !tw.active) continue;

      tw.x += tw.vx * dtSec;
      if (tw.x > this.arena.x + this.arena.w + 30) {
        tw.active = false;
        this.tidalWaves.splice(i, 1);
        continue;
      }

      const rowH = this.arena.h / tw.rows;
      
      this.bulletGraphics.fillStyle(0x0e7490, 0.15 + Math.abs(Math.sin(timeSec * 10)) * 0.15);
      for (let r = 0; r < tw.rows; r++) {
         if (!tw.safeRows.includes(r)) {
            this.bulletGraphics.fillRect(this.arena.x, this.arena.y + r * rowH, this.arena.w, rowH);
         }
      }
      
      this.bulletGraphics.lineStyle(2, 0xccfbf1, 0.4);

      for (let r = 0; r < tw.rows; r++) {
        if (tw.safeRows.includes(r)) continue;
        const wy = this.arena.y + rowH * (r + 0.5);
        const wx = tw.x + Math.sin(r * 0.8 + timeSec * 4) * 8;

        this.bulletGraphics.fillStyle(0x2dd4bf, 0.9);
        this.bulletGraphics.fillCircle(wx, wy, 7);
        this.bulletGraphics.fillStyle(0xffffff, 0.5);
        this.bulletGraphics.fillCircle(wx - 2, wy - 3, 2);

        if (Phaser.Math.Distance.Between(this.soul.x, this.soul.y, wx, wy) < 7 + this.soulRadius) {
          this.triggerPlayerHit();
          return;
        }
      }
    }
  }
}
