import Phaser from "phaser";

export class Player {
  constructor(scene, x, y) {
    const textureExists = scene.textures.exists("vino-idle");

    if (textureExists) {
      this.sprite = scene.physics.add.sprite(x, y, "vino-idle");
      this.sprite.setScale(0.15);

      if (scene.anims.exists("vino-idle")) {
        this.sprite.play("vino-idle");
      }
    } else {
      console.warn("Asset 'vino-idle' failed to load. Falling back to rectangle.");
      this.sprite = scene.add.rectangle(x, y, 32, 42, 0xd8c38f);
      scene.physics.add.existing(this.sprite);
      this.sprite.setStrokeStyle(2, 0x5b4636, 0.9);
    }

    this.scene = scene;
this.dashKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
const body = this.sprite.body;
    body.setCollideWorldBounds(true);
    body.setDrag(1000, 1000);
    body.setMaxVelocity(220, 220);
    body.setSize(16, 24, 8, 9);
  }

  update(cursors) {
    const baseSpeed = 160;
    const speed = (this.dashKey && this.dashKey.isDown) ? baseSpeed * 1.5 : baseSpeed;
    const body = this.sprite.body;
    if (!body) return;

    body.setVelocity(0);

    // Movement
    if (cursors.left.isDown) body.setVelocityX(-speed);
    else if (cursors.right.isDown) body.setVelocityX(speed);

    if (cursors.up.isDown) body.setVelocityY(-speed);
    else if (cursors.down.isDown) body.setVelocityY(speed);


    body.velocity.normalize().scale(speed);

    // Animation handling
    if (this.sprite.type === "Sprite") {
      const isMoving = body.velocity.length() > 0;

      if (isMoving && cursors.up.isDown) {
        // Play moving-up animation when moving up
        if (this.sprite.scene.anims.exists("vino-moving-up")) {
          this.sprite.play("vino-moving-up", true);
        }

      } else if (isMoving && cursors.down.isDown) {
        // Play moving-down animation when moving down
        if (this.sprite.scene.anims.exists("vino-moving-down")) {
          this.sprite.play("vino-moving-down", true);
        }

      } else if (isMoving && cursors.left.isDown) {
        // Play moving-left animation when moving left
        if (this.sprite.scene.anims.exists("vino-moving-left")) {
          this.sprite.play("vino-moving-left", true);
        }

      } else if (isMoving && cursors.right.isDown) {
        // Play moving-right animation when moving right        
        if (this.sprite.scene.anims.exists("vino-moving-right")) {
          this.sprite.play("vino-moving-right", true);
        }
      } else if (!isMoving) {
        // Idle when standing still
        if (this.sprite.scene.anims.exists("vino-idle")) {
          this.sprite.play("vino-idle", true);
        }
      }
    }
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }
}