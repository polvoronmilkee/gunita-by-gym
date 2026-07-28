import Phaser from "phaser";
import { BaseBulletHellScene } from "./bullethell/BaseBulletHellScene.js";

export class FragmentDaughtersDrawing extends BaseBulletHellScene {
  constructor() {
    super("fragment-daughters-drawing");
  }

  getFallbackSoulName() { return "The Young Daughter"; }
  getFallbackDodgeLines() {
    return [
      "Please don't forget my picture, Papa...",
      "The colors are running in the rain...",
      "Remember the bright sun we drew together!"
    ];
  }
  getFallbackBgKey() { return "bg-daughters-drawing"; }
  getAudioBossKey() { return "daughters-letter-boss"; }
  getSoulColor() { return this.currentRainbowColor || 0xb57fee; }
  getTitleColor() { return this.currentRainbowColorStr || "#b57fee"; }
  getTimerFillColor() { return this.currentRainbowColor || 0xb57fee; }
  getDefaultRiddles() {
    return [
      {
        question: "I made a picture of Papa with wax and bright colors on a paper sheet. What am I?",
        choices: ["A) Daughter's Drawing", "B) Wooden Toy", "C) Shell Necklace", "D) Songbook"],
        answer: "A) Daughter's Drawing"
      },
      {
        question: "Even when Papa was far out at sea, he looked at my colorful smiles to feel warm. What am I?",
        choices: ["A) Daughter's Drawing", "B) Brass Compass", "C) Warm Blanket", "D) Lantern"],
        answer: "A) Daughter's Drawing"
      },
      {
        question: "Drawn with love by small hands, keeping a family together across the waves. What am I?",
        choices: ["A) Daughter's Drawing", "B) Ribbon Tie", "C) Fishing Hook", "D) Glass Bead"],
        answer: "A) Daughter's Drawing"
      },
      {
        question: "I show a big sun, a blue ocean, and a little boat with two stick figures. What am I?",
        choices: ["A) Daughter's Drawing", "B) Nautical Map", "C) Storybook", "D) Mirror"],
        answer: "A) Daughter's Drawing"
      },
      {
        question: "What did the young daughter give her father before the great storm took his ship?",
        choices: ["A) Her drawing", "B) Her ribbon", "C) A seashell", "D) A prayer bead"],
        answer: "A) Her drawing"
      }
    ];
  }

  preload() {
    super.preload();
    if (!this.textures.exists("bg-daughters-drawing")) {
      this.load.image("bg-daughters-drawing", "src/assets/grave1-elements/bullet-scenes/daughters-drawing.png");
    }
  }

  create() {
    super.create();
    
    // Initialize custom arrays
    this.rainbowArcs = [];
    this.airplanes = [];
    this.scissors = [];
    this.labyrinths = [];
    this.musicalNotes = [];
    this.sparkles = [];
    this.paintBombs = [];
    this.imaginaryFriends = [];
  }

  customCleanup() {
    this.rainbowArcs = [];
    this.airplanes = [];
    this.musicalNotes = [];
    this.sparkles = [];
    this.scissors = [];
    this.labyrinths = [];
    this.paintBombs = [];
    this.imaginaryFriends = [];
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

      if (this.imaginaryFriends.length === 0) {
        for (let i = 0; i < 2; i++) {
          this.imaginaryFriends.push({
            active: true,
            x: this.arena.x + this.arena.w / 2,
            y: this.arena.y + this.arena.h / 2,
            vx: Phaser.Math.Between(50, 90) * (Math.random() < 0.5 ? 1 : -1),
            vy: Phaser.Math.Between(50, 90) * (Math.random() < 0.5 ? 1 : -1)
          });
        }
      }

      this.executePattern(Phaser.Utils.Array.GetRandom([1, 2, 3, 4, 5]));
    }
  }

  executePattern(patternId) {
    const desp = this.isDesperation;
    const duration = desp ? 14000 : 10000;

    if (patternId === 1) {
      const count = 4;
      const colors = [[0xf87171, 0xfb923c, 0xfde68a, 0x86efac, 0x7dd3fc, 0xa78bfa, 0xc4b5fd],
                      [0xc4b5fd, 0xa78bfa, 0x7dd3fc, 0x86efac, 0xfde68a, 0xfb923c, 0xf87171]];
      for (let i = 0; i < count; i++) {
        const offsetAng = i * (Math.PI * 2 / count);
        this.rainbowArcs.push({
          active: true,
          anchorX: this.arena.x + this.arena.w / 2,
          anchorY: this.arena.y + this.arena.h / 2,
          angleOffset: offsetAng,
          missingBeadIndex: -1,
          segmentLength: 24,
          numBeads: 18,
          colors: colors[i % 2],
          rotSpeed: desp ? 0.9 : 0.7,
          state: "TELEGRAPH",
          timer: 1.5,
          bombTimer: 0
        });
      }
    } else if (patternId === 2) {
      const interval = desp ? 2600 : 3400;
      for (let t = 0; t < duration; t += interval) {
        this.patternTimers.push(this.time.delayedCall(t, () => this.spawnScissorsTrap()));
      }
    } else if (patternId === 3) {
      const interval = desp ? 1600 : 2200;
      for (let t = 0; t < duration; t += interval) {
        this.patternTimers.push(this.time.delayedCall(t, () => this.launchAirplaneVolley()));
      }
    } else if (patternId === 4) {
      const interval = desp ? 2800 : 3600;
      for (let t = 0; t < duration; t += interval) {
        this.patternTimers.push(this.time.delayedCall(t, () => this.spawnTracingLabyrinth()));
      }
    } else if (patternId === 5) {
      const interval = desp ? 1800 : 2400;
      for (let t = 0; t < duration; t += interval) {
        this.patternTimers.push(this.time.delayedCall(t, () => this.spawnMusicalNotes()));
      }
    }
  }

  launchAirplaneVolley() {
    const desp = this.isDesperation;
    const count = desp ? 8 : 6;
    const speed = desp ? 195 : 180;
    const leftCorner = Math.random() < 0.5;

    const startX = leftCorner ? this.arena.x + 10 : this.arena.x + this.arena.w - 10;
    const startY = this.arena.y + 10;
    const baseAngle = leftCorner ? Math.PI / 4 : (Math.PI * 3) / 4;

    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.25;
      const angle = baseAngle + spread;
      this.airplanes.push({
        active: true,
        x: startX,
        y: startY,
        baseAngle: angle,
        speed: speed,
        timer: 0,
        swayFreq: desp ? 6 : 5,
        swayAmp: .7,
        trail: []
      });
    }
  }

  spawnScissorsTrap() {
    const desp = this.isDesperation;
    const cx = this.arena.x + this.arena.w / 2;
    const cy = this.arena.y + this.arena.h / 2;
    const count = desp ? 2 : 1;
    
    for (let i = 0; i < count; i++) {
      const angleOffset = i * (Math.PI / 2); 
      this.scissors.push({
        active: true,
        x: cx,
        y: cy,
        rotAngle: Math.atan2(this.soul.y - cy, this.soul.x - cx) + angleOffset,
        angleOpen: (Math.PI / 180) * 45,
        length: 700,
        state: "TELEGRAPH",
        timer: 1 
      });
    }
  }

  spawnTracingLabyrinth() {
    const desp = this.isDesperation;
    const sx = Phaser.Math.Between(this.arena.x + 40, this.arena.x + this.arena.w - 40);
    const sy = Phaser.Math.Between(this.arena.y + 40, this.arena.y + this.arena.h - 40);

    this.labyrinths.push({
      active: true,
      x: sx,
      y: sy,
      timer: 2.0,
      duration: 2.0,
      points: [{x: sx, y: sy}],
      vx: Phaser.Math.Between(-100, 100),
      vy: Phaser.Math.Between(-100, 100),
      speed: desp ? 180 : 140,
      state: "DRAWING",
      flashTimer: 0.5
    });
  }

  spawnMusicalNotes() {
    const desp = this.isDesperation;
    const count = desp ? 6 : 4;
    const bounces = desp ? 4 : 3;

    for (let i = 0; i < count; i++) {
      const fromLeft = i % 2 === 0;
      const startX = fromLeft ? this.arena.x + 15 : this.arena.x + this.arena.w - 15;
      const startY = Phaser.Math.Between(this.arena.y + 30, this.arena.y + this.arena.h - 80);
      const vx = (fromLeft ? 1 : -1) * (80 + Math.random() * 30);
      const vy = (Math.random() < 0.5 ? 1 : -1) * (70 + Math.random() * 30);
      const rainbowColors = [0xf87171, 0xfb923c, 0xfde68a, 0x86efac, 0x7dd3fc, 0xa78bfa, 0xc4b5fd];

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
  }

  updateCustomPatterns(timeSec, dtSec) {
    const delta = dtSec * 1000;
    this.rainbowHue = ((this.rainbowHue || 0) + delta * 0.1) % 360;
    this.currentRainbowColor = Phaser.Display.Color.HSVToRGB(this.rainbowHue / 360, 1, 1).color;
    this.currentRainbowColorStr = "#" + this.currentRainbowColor.toString(16).padStart(6, '0');
    if (this.isDesperation) {
      for (let g = 0; g < this.imaginaryFriends.length; g++) {
        const ghost = this.imaginaryFriends[g];
        if (!ghost.active) continue;

        ghost.x += ghost.vx * dtSec;
        ghost.y += ghost.vy * dtSec;

        if (ghost.x < this.arena.x + 10 || ghost.x > this.arena.x + this.arena.w - 10) ghost.vx *= -1;
        if (ghost.y < this.arena.y + 10 || ghost.y > this.arena.y + this.arena.h - 10) ghost.vy *= -1;
        
        ghost.x = Phaser.Math.Clamp(ghost.x, this.arena.x + 10, this.arena.x + this.arena.w - 10);
        ghost.y = Phaser.Math.Clamp(ghost.y, this.arena.y + 10, this.arena.y + this.arena.h - 10);

        const gx = ghost.x;
        const gy = ghost.y;

        if (Math.random() < 0.3) {
          this.sparkles.push({ x: gx + Phaser.Math.Between(-6, 6), y: gy + Phaser.Math.Between(-6, 6), alpha: 0.6 });
        }

        this.bulletGraphics.fillStyle(0xf5a0c0, 0.55);
        this.bulletGraphics.fillCircle(gx, gy, 10);
        this.bulletGraphics.fillStyle(0x333333, 0.9);
        this.bulletGraphics.fillCircle(gx - 3, gy - 2, 2);
        this.bulletGraphics.fillCircle(gx + 3, gy - 2, 2);
        this.bulletGraphics.lineStyle(1, 0x333333, 0.7);
        this.bulletGraphics.beginPath();
        this.bulletGraphics.arc(gx, gy + 2, 3, 0, Math.PI);
        this.bulletGraphics.strokePath();

        for (let j = -1; j <= 1; j++) {
          this.bulletGraphics.fillStyle(0xf5a0c0, 0.55);
          this.bulletGraphics.fillCircle(gx + j * 3, gy + 10, 3);
        }

        if (Phaser.Math.Distance.Between(this.soul.x, this.soul.y, gx, gy) < 10 + this.soulRadius) {
          this.triggerPlayerHit();
          return;
        }

        ghost.trailTimer = (ghost.trailTimer || 0) - dtSec;
        if (ghost.trailTimer <= 0) {
          ghost.trailTimer = 0.4;
          this.spawnBullet(gx, gy, 0, 0, 4, 0xf5a0c0, 0, 0.3);
        }
      }
    }

    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const sp = this.sparkles[i];
      sp.alpha -= dtSec * 1.2;
      if (sp.alpha <= 0) {
        this.sparkles.splice(i, 1);
        continue;
      }
      this.bulletGraphics.fillStyle(0xffffff, sp.alpha);
      this.bulletGraphics.fillCircle(sp.x, sp.y, 1.5);
    }

    for (let i = this.rainbowArcs.length - 1; i >= 0; i--) {
      const p = this.rainbowArcs[i];
      if (!p || !p.active) continue;

      if (p.state === "TELEGRAPH") {
        p.timer -= dtSec;
        const alpha = 0.3 + Math.sin(timeSec * 15) * 0.2;
        this.bulletGraphics.lineStyle(2, p.colors[0], alpha);
        this.bulletGraphics.beginPath();
        this.bulletGraphics.moveTo(p.anchorX, p.anchorY);
        this.bulletGraphics.lineTo(p.anchorX + Math.cos(p.angleOffset) * 300, p.anchorY + Math.sin(p.angleOffset) * 300);
        this.bulletGraphics.strokePath();
        
        this.bulletGraphics.fillStyle(p.colors[0], alpha * 0.5);
        this.bulletGraphics.fillCircle(p.anchorX, p.anchorY, 10 + this.soulRadius);
        
        if (p.timer <= 0) p.state = "SPIN";
        continue;
      }

      this.bulletGraphics.lineStyle(2, 0xef4444, 0.5 + Math.sin(timeSec * 20) * 0.3);
      this.bulletGraphics.strokeCircle(p.anchorX, p.anchorY, 10 + this.soulRadius);
      this.bulletGraphics.fillStyle(0xef4444, 0.2);
      this.bulletGraphics.fillCircle(p.anchorX, p.anchorY, 10 + this.soulRadius);

      p.angleOffset += p.rotSpeed * dtSec;
      const swingAngle = p.angleOffset;

      p.bombTimer -= dtSec;
      if (p.bombTimer <= 0) {
        p.bombTimer = Phaser.Math.FloatBetween(0.8, 1.5);
        const dist = Phaser.Math.Between(60, 220);
        this.paintBombs.push({
          active: true,
          x: p.anchorX + Math.cos(swingAngle) * dist,
          y: p.anchorY + Math.sin(swingAngle) * dist,
          timer: 0.8,
          color: Phaser.Utils.Array.GetRandom(p.colors)
        });
      }

      if (Phaser.Math.Distance.Between(this.soul.x, this.soul.y, p.anchorX, p.anchorY) < 10 + this.soulRadius) {
        this.triggerPlayerHit();
        return;
      }

      for (let b = 0; b < p.numBeads; b++) {
        const dist = (b + 1) * p.segmentLength;
        const bx = p.anchorX + dist * Math.sin(swingAngle);
        const by = p.anchorY + dist * Math.cos(swingAngle);
        const color = p.colors[b % p.colors.length];

        if (b > 0) {
          const prevDist = b * p.segmentLength;
          const pbx = p.anchorX + prevDist * Math.sin(swingAngle);
          const pby = p.anchorY + prevDist * Math.cos(swingAngle);
          this.bulletGraphics.lineStyle(2, color, 0.4);
          this.bulletGraphics.beginPath();
          this.bulletGraphics.moveTo(pbx, pby);
          this.bulletGraphics.lineTo(bx, by);
          this.bulletGraphics.strokePath();
        }

        if (b === p.missingBeadIndex || b === p.missingBeadIndex + 1) {
          this.bulletGraphics.lineStyle(2, 0xffffff, 0.6);
          this.bulletGraphics.strokeCircle(bx, by, 9);
          continue;
        }

        this.bulletGraphics.fillStyle(color, 0.25);
        this.bulletGraphics.fillCircle(bx, by, 11);
        this.bulletGraphics.fillStyle(color, 0.95);
        this.bulletGraphics.fillCircle(bx, by, 7);
        this.bulletGraphics.fillStyle(0xffffff, 0.85);
        this.bulletGraphics.fillCircle(bx - 2, by - 2, 2);

        if (Phaser.Math.Distance.Between(this.soul.x, this.soul.y, bx, by) < 7 + this.soulRadius) {
          this.triggerPlayerHit();
          return;
        }
      }
    }

    for (let i = this.paintBombs.length - 1; i >= 0; i--) {
      const b = this.paintBombs[i];
      if (!b || !b.active) continue;

      if (b.timer > 0) {
        b.timer -= dtSec;
        this.bulletGraphics.lineStyle(2, b.color, 0.5 + Math.sin(timeSec * 15) * 0.5);
        this.bulletGraphics.strokeCircle(b.x, b.y, 25);
        this.bulletGraphics.fillStyle(b.color, 0.2);
        this.bulletGraphics.fillCircle(b.x, b.y, 25 * (1 - b.timer / 0.8));

        if (b.timer <= 0) {
          b.state = "EXPLODE";
          b.timer = 0.3;
        }
        continue;
      }

      b.timer -= dtSec;
      if (b.timer > 0) {
        this.bulletGraphics.fillStyle(b.color, 0.8);
        this.bulletGraphics.fillCircle(b.x, b.y, 25);
        this.bulletGraphics.fillStyle(0xffffff, 0.9);
        this.bulletGraphics.fillCircle(b.x - 5, b.y - 5, 8);

        if (Phaser.Math.Distance.Between(this.soul.x, this.soul.y, b.x, b.y) < 25 + this.soulRadius) {
          this.triggerPlayerHit();
          return;
        }
      } else {
        b.active = false;
        this.paintBombs.splice(i, 1);
      }
    }

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

        if (s.timer <= 0) {
          s.state = "SNAPPING";
          s.timer = 0.5; // Half second to snap shut
        }
        continue;
      }

      if (s.state === "SNAPPING") {
        s.timer -= dtSec;
        const progress = Math.max(0, s.timer / 0.5); // 1.0 to 0.0
        const currentOpen = s.angleOpen * progress;

        const topAngle = s.rotAngle - currentOpen;
        const botAngle = s.rotAngle + currentOpen;

        this.bulletGraphics.lineStyle(4, 0xaaaaaa, 1);
        
        // Top blade
        this.bulletGraphics.beginPath();
        this.bulletGraphics.moveTo(s.x - Math.cos(topAngle)*30, s.y - Math.sin(topAngle)*30);
        this.bulletGraphics.lineTo(s.x + Math.cos(topAngle) * s.length, s.y + Math.sin(topAngle) * s.length);
        this.bulletGraphics.strokePath();
        
        // Bottom blade
        this.bulletGraphics.beginPath();
        this.bulletGraphics.moveTo(s.x - Math.cos(botAngle)*30, s.y - Math.sin(botAngle)*30);
        this.bulletGraphics.lineTo(s.x + Math.cos(botAngle) * s.length, s.y + Math.sin(botAngle) * s.length);
        this.bulletGraphics.strokePath();

        this.bulletGraphics.fillStyle(0xffffff, 1);
        this.bulletGraphics.fillCircle(s.x, s.y, 4);

        if (this.pointToLineDistance(this.soul.x, this.soul.y, s.x - Math.cos(topAngle)*30, s.y - Math.sin(topAngle)*30, s.x + Math.cos(topAngle) * s.length, s.y + Math.sin(topAngle) * s.length) < this.soulRadius + 2) {
           this.triggerPlayerHit();
           return;
        }
        if (this.pointToLineDistance(this.soul.x, this.soul.y, s.x - Math.cos(botAngle)*30, s.y - Math.sin(botAngle)*30, s.x + Math.cos(botAngle) * s.length, s.y + Math.sin(botAngle) * s.length) < this.soulRadius + 2) {
           this.triggerPlayerHit();
           return;
        }

        if (s.timer <= 0) {
          s.active = false;
          this.scissors.splice(i, 1);
        }
      }
    }

    for (let i = this.airplanes.length - 1; i >= 0; i--) {
      const p = this.airplanes[i];
      if (!p || !p.active) continue;

      p.timer += dtSec;
      
      const currentAngle = p.baseAngle + Math.sin(p.timer * p.swayFreq) * p.swayAmp;
      p.x += Math.cos(currentAngle) * p.speed * dtSec;
      p.y += Math.sin(currentAngle) * p.speed * dtSec;

      p.trail.push({x: p.x, y: p.y});
      if (p.trail.length > 20) p.trail.shift();

      if (p.trail.length > 1) {
        this.bulletGraphics.lineStyle(2, 0xffffff, 0.4);
        this.bulletGraphics.beginPath();
        this.bulletGraphics.moveTo(p.trail[0].x, p.trail[0].y);
        for(let t=1; t<p.trail.length; t++) {
           this.bulletGraphics.lineTo(p.trail[t].x, p.trail[t].y);
        }
        this.bulletGraphics.strokePath();
      }

      this.bulletGraphics.fillStyle(0xffffff, 1);
      this.bulletGraphics.fillTriangle(
        p.x + Math.cos(currentAngle)*12, p.y + Math.sin(currentAngle)*12,
        p.x + Math.cos(currentAngle + 2.5)*8, p.y + Math.sin(currentAngle + 2.5)*8,
        p.x + Math.cos(currentAngle - 2.5)*8, p.y + Math.sin(currentAngle - 2.5)*8
      );

      if (Phaser.Math.Distance.Between(this.soul.x, this.soul.y, p.x, p.y) < 8 + this.soulRadius) {
        this.triggerPlayerHit();
        return;
      }

      if (p.x < -50 || p.x > this.scale.width + 50 || p.y < -50 || p.y > this.scale.height + 50) {
        p.active = false;
        this.airplanes.splice(i, 1);
      }
    }

    for (let i = this.labyrinths.length - 1; i >= 0; i--) {
      const lab = this.labyrinths[i];
      if (!lab || !lab.active) continue;

      if (lab.state === "DRAWING") {
        lab.timer -= dtSec;

        lab.x += lab.vx * dtSec;
        lab.y += lab.vy * dtSec;
        
        if (lab.x < this.arena.x + 10 || lab.x > this.arena.x + this.arena.w - 10) lab.vx *= -1;
        if (lab.y < this.arena.y + 10 || lab.y > this.arena.y + this.arena.h - 10) lab.vy *= -1;
        
        lab.x = Phaser.Math.Clamp(lab.x, this.arena.x + 10, this.arena.x + this.arena.w - 10);
        lab.y = Phaser.Math.Clamp(lab.y, this.arena.y + 10, this.arena.y + this.arena.h - 10);

        lab.points.push({x: lab.x, y: lab.y});

        this.bulletGraphics.lineStyle(2, 0xffffff, 0.4);
        this.bulletGraphics.beginPath();
        this.bulletGraphics.moveTo(lab.points[0].x, lab.points[0].y);
        for(let pt=1; pt<lab.points.length; pt++) {
           this.bulletGraphics.lineTo(lab.points[pt].x, lab.points[pt].y);
        }
        this.bulletGraphics.strokePath();

        this.bulletGraphics.fillStyle(0xdddddd, 1);
        this.bulletGraphics.fillCircle(lab.x, lab.y, 4);

        if (lab.timer <= 0) {
          lab.state = "FLASH";
          lab.flashTimer = 0.5;
        }
      } else if (lab.state === "FLASH") {
        lab.flashTimer -= dtSec;
        const alpha = Math.max(0, lab.flashTimer / 0.5);

        this.bulletGraphics.lineStyle(4, 0xffffff, alpha);
        this.bulletGraphics.beginPath();
        this.bulletGraphics.moveTo(lab.points[0].x, lab.points[0].y);
        for(let pt=1; pt<lab.points.length; pt++) {
           this.bulletGraphics.lineTo(lab.points[pt].x, lab.points[pt].y);
        }
        this.bulletGraphics.strokePath();

        for (let pt=1; pt<lab.points.length; pt++) {
          if (this.pointToLineDistance(this.soul.x, this.soul.y, lab.points[pt-1].x, lab.points[pt-1].y, lab.points[pt].x, lab.points[pt].y) < this.soulRadius + 2) {
            this.triggerPlayerHit();
            return;
          }
        }

        if (lab.flashTimer <= 0) {
          lab.active = false;
          this.labyrinths.splice(i, 1);
        }
      }
    }

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

      if (Phaser.Math.Distance.Between(this.soul.x, this.soul.y, mn.x, mn.y) < 6 + this.soulRadius) {
        this.triggerPlayerHit();
        return;
      }
    }
  }
}
