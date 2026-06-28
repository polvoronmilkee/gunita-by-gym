import Phaser from "phaser";

export class Player {
  constructor(scene, x, y) {
    this.sprite = scene.add.rectangle(x, y, 32, 42, 0xd8c38f);
    scene.physics.add.existing(this.sprite);

    this.sprite.setStrokeStyle(2, 0x5b4636, 0.9);
    this.sprite.body.setCollideWorldBounds(true);
    this.sprite.body.setDrag(1000, 1000);
    this.sprite.body.setMaxVelocity(220, 220);
    this.sprite.body.setSize(16, 24, true);
  }

  update(cursors) {
    const speed = 180;
    const body = this.sprite.body;

    if (!body) {
      return;
    }

    body.setVelocity(0);

    if (cursors.left.isDown) {
      body.setVelocityX(-speed);
    } else if (cursors.right.isDown) {
      body.setVelocityX(speed);
    }

    if (cursors.up.isDown) {
      body.setVelocityY(-speed);
    } else if (cursors.down.isDown) {
      body.setVelocityY(speed);
    }

    body.velocity.normalize().scale(speed);
  }

  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }
}