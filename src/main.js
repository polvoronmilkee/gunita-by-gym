import Phaser from "phaser";

class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  preload() {
    // Load assets here
    this.load.image(
      "logo",
      "https://labs.phaser.io/assets/sprites/phaser3-logo.png",
    );
  }

  create() {
    const logo = this.add.image(400, 300, "logo");

    this.add
      .text(400, 450, "Welcome to Gunita by Gym", {
        fontSize: "32px",
        fill: "#fff",
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: logo,
      y: 350,
      duration: 2000,
      ease: "Power2",
      yoyo: true,
      loop: -1,
    });
  }

  update() {
    // Game loop
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game-container",
  scene: MainScene,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
};

new Phaser.Game(config);
