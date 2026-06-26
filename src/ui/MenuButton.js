import Phaser from "phaser";

export class MenuButton {
  constructor(scene, x, y, width, label, onClick) {
    this.scene = scene;
    this.onClick = onClick;
    this.width = width;
    this.height = 54;

    this.container = scene.add.container(x, y);

    this.glow = scene.add.rectangle(0, 0, width + 18, this.height + 12, 0xf3e7c2, 0.08);
    this.glow.setStrokeStyle(1, 0xf3e7c2, 0.15);

    this.background = scene.add.rectangle(0, 0, width, this.height, 0x101827, 0.92);
    this.background.setStrokeStyle(2, 0x67708a, 0.9);

    this.label = scene.add.text(0, 0, label, {
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "20px",
      color: "#f6efdb",
      align: "center",
    }).setOrigin(0.5);

    this.container.add([this.glow, this.background, this.label]);
    this.container.setSize(width, this.height);
    this.container.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -this.height / 2, width, this.height),
      Phaser.Geom.Rectangle.Contains,
    );

    this.container.on("pointerover", this.handlePointerOver, this);
    this.container.on("pointerout", this.handlePointerOut, this);
    this.container.on("pointerdown", this.handlePointerDown, this);
  }

  handlePointerOver() {
    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 150,
      ease: "Sine.easeOut",
    });

    this.scene.tweens.add({
      targets: this.glow,
      alpha: 0.22,
      duration: 150,
      ease: "Sine.easeOut",
    });

    this.scene.tweens.add({
      targets: this.background,
      fillAlpha: 1,
      duration: 150,
      ease: "Sine.easeOut",
    });
  }

  handlePointerOut() {
    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1,
      scaleY: 1,
      duration: 150,
      ease: "Sine.easeOut",
    });

    this.scene.tweens.add({
      targets: this.glow,
      alpha: 0.08,
      duration: 150,
      ease: "Sine.easeOut",
    });

    this.scene.tweens.add({
      targets: this.background,
      fillAlpha: 0.92,
      duration: 150,
      ease: "Sine.easeOut",
    });
  }

  handlePointerDown() {
    if (this.onClick) {
      this.onClick();
    }
  }

  setVisible(visible) {
    this.container.setVisible(visible);
    this.container.setActive(visible);
  }
}