import Phaser from "phaser";

export class Player {
  constructor(scene, x, y, options = {}) {
    const textureExists = scene.textures.exists("vino-idle");

    if (textureExists) {
      this.sprite = scene.physics.add.sprite(x, y, "vino-idle");
      this.sprite.setScale(0.15);

      if (scene.anims.exists("vino-idle")) {
        this.sprite.play("vino-idle");
      }
    } else {
      console.warn(
        "Asset 'vino-idle' failed to load. Falling back to rectangle.",
      );
      this.sprite = scene.add.rectangle(x, y, 32, 42, 0xd8c38f);
      scene.physics.add.existing(this.sprite);
      this.sprite.setStrokeStyle(2, 0x5b4636, 0.9);
    }

    this.scene = scene;
    this.onDashStart = options.onDashStart ?? (() => {});
    this.onDirectionChange = options.onDirectionChange ?? (() => {});
    this.wasDashing = false;
    this.currentDirection = null;
    this.dashKey = scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SHIFT,
    );
    this.wasd = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    const body = this.sprite.body;
    body.setCollideWorldBounds(true);
    body.setDrag(1000, 1000);
    body.setMaxVelocity(220, 220);
    if (this.sprite.type === "Sprite") {
      body.setSize(80, 110);
      body.setOffset(64, 100); 
    } else {
      body.setSize(24, 32);
    }
  }

  update(cursors) {
    const baseSpeed = 160;
    const isDashHeld = Boolean(this.dashKey && this.dashKey.isDown);
    const speed = isDashHeld ? baseSpeed * 1.5 : baseSpeed;
    const body = this.sprite.body;
    if (!body) return;

    body.setVelocity(0);

    const leftDown = cursors?.left?.isDown || this.wasd.left.isDown;
    const rightDown = cursors?.right?.isDown || this.wasd.right.isDown;
    const upDown = cursors?.up?.isDown || this.wasd.up.isDown;
    const downDown = cursors?.down?.isDown || this.wasd.down.isDown;
    const hasMovementInput = leftDown || rightDown || upDown || downDown;

    let nextDirection = null;
    if (upDown) nextDirection = "up";
    else if (downDown) nextDirection = "down";
    else if (leftDown) nextDirection = "left";
    else if (rightDown) nextDirection = "right";

    if (nextDirection !== this.currentDirection && nextDirection !== null) {
      this.onDirectionChange(nextDirection);
    }
    this.currentDirection = nextDirection;

    if (isDashHeld && hasMovementInput && !this.wasDashing) {
      this.onDashStart();
    }
    this.wasDashing = isDashHeld && hasMovementInput;

    // Movement
    if (leftDown) body.setVelocityX(-speed);
    else if (rightDown) body.setVelocityX(speed);

    if (upDown) body.setVelocityY(-speed);
    else if (downDown) body.setVelocityY(speed);

    body.velocity.normalize().scale(speed);

    // Animation handling
    if (this.sprite.type === "Sprite") {
      const isMoving = body.velocity.length() > 0;

      if (isMoving && upDown) {
        this.lastDirection = "up";
        if (this.sprite.scene.anims.exists("vino-moving-up")) {
          this.sprite.play("vino-moving-up", true);
        }
      } else if (isMoving && downDown) {
        this.lastDirection = "down";
        if (this.sprite.scene.anims.exists("vino-moving-down")) {
          this.sprite.play("vino-moving-down", true);
        }
      } else if (isMoving && leftDown) {
        this.lastDirection = "left";
        if (this.sprite.scene.anims.exists("vino-moving-left")) {
          this.sprite.play("vino-moving-left", true);
        }
      } else if (isMoving && rightDown) {
        this.lastDirection = "right";
        if (this.sprite.scene.anims.exists("vino-moving-right")) {
          this.sprite.play("vino-moving-right", true);
        }
      } else if (!isMoving) {
        // Idle when standing still - preserve facing direction
        if (this.lastDirection === "down") {
          if (this.sprite.scene.anims.exists("vino-idle")) {
            this.sprite.play("vino-idle", true);
          }
        } else {
          // Stop animation on first frame of last moved direction so Vino stays facing Up, Left, or Right
          if (this.sprite.anims.isPlaying) {
            this.sprite.anims.stop();
          }
        }
      }
    }
  }

  get x() {
    return this.sprite.x;
  }
  get y() {
    return this.sprite.y;
  }
}
