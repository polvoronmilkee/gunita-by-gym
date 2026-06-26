import Phaser from "phaser";
import { GUNITA_THEME } from "../utils/theme.js";

export class MenuButton {
  constructor(scene, x, y, width, label, onClick) {
    this.scene = scene;
    this.onClick = onClick;
    this.width = width;
    this.height = 54;

    this.container = scene.add.container(x, y);

    this.glow = scene.add.rectangle(0, 0, width + 18, this.height + 12, GUNITA_THEME.purpleLight, 0.06);
    this.glow.setStrokeStyle(1, GUNITA_THEME.purpleLight, 0.16);

    this.background = scene.add.rectangle(0, 0, width, this.height, GUNITA_THEME.bg2, 0.92);
    this.background.setStrokeStyle(2, GUNITA_THEME.purple, 0.9);

    this.label = scene.add.text(0, 0, label, {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "10px",
      color: "#e0c8ff",
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
      targets: this.glow,
      alpha: 0.22,
      duration: 120,
      ease: "Sine.easeOut",
    });

    this.scene.tweens.add({
      targets: this.background,
      fillAlpha: 1,
      duration: 120,
      ease: "Sine.easeOut",
    });
  }

  handlePointerOut() {
    this.scene.tweens.add({
      targets: this.glow,
      alpha: 0.08,
      duration: 120,
      ease: "Sine.easeOut",
    });

    this.scene.tweens.add({
      targets: this.background,
      fillAlpha: 0.92,
      duration: 120,
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