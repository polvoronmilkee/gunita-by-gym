import Phaser from "phaser";

const DIRECTIONS = ["down", "left", "right", "up"];
const ROW_BY_DIRECTION = { down: 0, up: 1, left: 2, right: 3 };

export class Ghost {
  constructor(scene, x, y, options = {}) {
    this.scene = scene;
    this.options = options;
    this.speed = options.speed ?? Phaser.Math.Between(35, 65);
    this.scale = options.scale ?? 0.5;
    this.tint = options.tint ?? 0xffffff;
    this.alphaTarget = 1;
    this.isDespawning = false;
    this.lifespanMs = options.lifespanMs ?? Phaser.Math.Between(12000, 28000);
    this.bornAt = scene.time.now;
    this.decideAt = 0;
    this.direction = DIRECTIONS[Phaser.Math.Between(0, 3)];
    this.state = Phaser.Math.FloatBetween(0, 1) < 0.35 ? "idle" : "walking";
    this.nextDecisionDelay = Phaser.Math.Between(900, 2600);

    const textureExists = scene.textures.exists("ghost-walk");
    if (textureExists) {
      this.sprite = scene.physics.add.sprite(x, y, "ghost-walk");
      this.sprite.setScale(this.scale);
      this.sprite.setTint(this.tint);
      this.sprite.alpha = 0;
      this._playAnimForDirection(this.direction);
    } else {
      console.warn("Ghost spritesheet not found; using placeholder.");
      this.sprite = scene.add.ellipse(x, y, 28, 36, 0xb57fee, 0.75);
      scene.physics.add.existing(this.sprite);
      this.sprite.alpha = 0;
    }

    const body = this.sprite.body;
    if (body) {
      body.setCollideWorldBounds(true);
      body.setAllowGravity?.(false);
      body.setDrag(600, 600);
      body.setMaxVelocity(this.speed * 1.2, this.speed * 1.2);
      body.setImmovable?.(false);
      if (this.sprite.type === "Sprite") {
        body.setSize(32, 48);
        body.setOffset(16, 12);
      }
    }

    this._setupEtherealFx();

    this.spawnTween = scene.tweens.add({
      targets: this.sprite,
      alpha: 0.78,
      duration: 1200,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.alphaTarget = Phaser.Math.FloatBetween(0.65, 0.88);
        this._startAmbientPulse();
      },
    });

    this._scheduleDespawn();
  }

  _setupEtherealFx() {
    if (this.scene.cameras.main.postFX && this.sprite.preFX) {
      try {
        const tintStr = "#" + this.tint.toString(16).padStart(6, "0");
        const color = Phaser.Display.Color.HexStringToColor(tintStr).color;
        this.glowFx = this.sprite.preFX.addGlow(color, 0, 0, false, 0.12, 8);
        this.scene.tweens.add({
          targets: this.glowFx,
          outerStrength: { from: 0.4, to: 1.6 },
          innerStrength: { from: 0.1, to: 0.8 },
          duration: Phaser.Math.Between(1600, 2800),
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      } catch (e) {
        // FX not available; ignore silently
      }
    }

    if (this.sprite.type === "Sprite") {
      this.floatTween = this.scene.tweens.add({
        targets: this.sprite,
        y: this.sprite.y - 4,
        duration: Phaser.Math.Between(1400, 2200),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        delay: Phaser.Math.Between(0, 600),
      });
    }
  }

  _startAmbientPulse() {
    if (!this.sprite || this.isDespawning) return;
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: this.alphaTarget + Phaser.Math.FloatBetween(-0.1, 0.1),
      duration: Phaser.Math.Between(2200, 3800),
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  _scheduleDespawn() {
    this.scene.time.delayedCall(this.lifespanMs, () => {
      this.despawn();
    });
  }

  despawn(destroyOnComplete = true) {
    if (this.isDespawning || !this.sprite || !this.sprite.active) return;
    this.isDespawning = true;
    if (this.sprite.body) this.sprite.body.setVelocity(0, 0);
    if (this.sprite.anims?.isPlaying) this.sprite.anims.stop();
    this.scene.tweens.killTweensOf?.(this.sprite);
    if (this.glowFx) this.scene.tweens.killTweensOf?.(this.glowFx);
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      duration: 1400,
      ease: "Sine.easeInOut",
      onComplete: () => {
        if (destroyOnComplete && this.sprite && this.sprite.active) {
          this.sprite.destroy();
        }
        if (this.options.onDespawn) this.options.onDespawn(this);
      },
    });
  }

  _playAnimForDirection(dir) {
    if (this.sprite.type !== "Sprite") return;
    const animKey = `ghost-${this.state === "walking" ? "walk" : "idle"}-${dir}`;
    if (this.scene.anims.exists(animKey)) {
      this.sprite.play(animKey, true);
    }
  }

  update(scene, now) {
    if (!this.sprite || !this.sprite.active || this.isDespawning) return;

    this.sprite.setDepth(this.sprite.y);

    if (now >= this.decideAt) {
      this._makeDecision();
      this.decideAt = now + this.nextDecisionDelay;
    }

    if (!this.sprite.body) return;

    if (this.state === "walking") {
      const s = this.speed;
      switch (this.direction) {
        case "up":
          this.sprite.body.setVelocity(0, -s);
          break;
        case "down":
          this.sprite.body.setVelocity(0, s);
          break;
        case "left":
          this.sprite.body.setVelocity(-s, 0);
          break;
        case "right":
          this.sprite.body.setVelocity(s, 0);
          break;
      }
      this._playAnimForDirection(this.direction);
    } else {
      this.sprite.body.setVelocity(0, 0);
      this._playAnimForDirection(this.direction);
    }
  }

  _makeDecision() {
    const roll = Phaser.Math.FloatBetween(0, 1);
    if (roll < 0.42) {
      this.state = "walking";
      this.direction = DIRECTIONS[Phaser.Math.Between(0, 3)];
      this.nextDecisionDelay = Phaser.Math.Between(1400, 3200);
    } else if (roll < 0.78) {
      this.state = "idle";
      this.nextDecisionDelay = Phaser.Math.Between(800, 2200);
    } else {
      this.state = "walking";
      const currentIdx = DIRECTIONS.indexOf(this.direction);
      const turn = Phaser.Math.Between(-1, 1);
      this.direction =
        DIRECTIONS[(currentIdx + turn + 4) % 4];
      this.nextDecisionDelay = Phaser.Math.Between(1000, 2400);
    }
  }

  destroy() {
    if (this.sprite?.active) this.sprite.destroy();
  }

  get x() {
    return this.sprite?.x ?? 0;
  }
  get y() {
    return this.sprite?.y ?? 0;
  }
  get active() {
    return !!this.sprite?.active && !this.isDespawning;
  }
}
