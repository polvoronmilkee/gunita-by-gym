import Phaser from "phaser";

export class Player {
  constructor(scene, x, y) {
    // Use the EXACT key you used when loading the spritesheet
    const textureExists = scene.textures.exists("vino-idle");

    if (textureExists) {
      this.sprite = scene.physics.add.sprite(x, y, "vino-idle");
      this.sprite.setScale(0.15);

      // Play idle animation (same key everywhere)
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

    // Physics settings
    const body = this.sprite.body;
    body.setCollideWorldBounds(true);
    body.setDrag(1000, 1000);
    body.setMaxVelocity(220, 220);
    // Correct setSize (center the body on a ~32x42 sprite)
    body.setSize(16, 24, 8, 9);
  }

  update(cursors) {
    const speed = 180;
    const body = this.sprite.body;
    if (!body) return;

    body.setVelocity(0);

    if (cursors.left.isDown) body.setVelocityX(-speed);
    else if (cursors.right.isDown) body.setVelocityX(speed);

    if (cursors.up.isDown) body.setVelocityY(-speed);
    else if (cursors.down.isDown) body.setVelocityY(speed);

    body.velocity.normalize().scale(speed);

    // Play idle when still – use the same key as in constructor
    if (this.sprite.type === "Sprite" && body.velocity.length() === 0) {
      if (this.sprite.scene.anims.exists("vino-idle")) {
        this.sprite.play("vino-idle", true);
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
