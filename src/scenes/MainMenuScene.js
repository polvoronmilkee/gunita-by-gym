import Phaser from "phaser";
import { MenuButton } from "../ui/MenuButton.js";
import { createAtmosphericFog, createFloatingLights, createMenuBackdrop } from "../utils/menuEffects.js";

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("MainMenuScene");
  }

  create() {
    createMenuBackdrop(this);

    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.14);

    this.cameraAnchor = this.add.container(640, 360);
    this.tweens.add({
      targets: this.cameraAnchor,
      x: 656,
      y: 346,
      duration: 8200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.cameras.main.startFollow(this.cameraAnchor, true, 0.02, 0.02);

    createAtmosphericFog(this, 18);
    createFloatingLights(this, 8);

    const title = this.add.text(640, 178, "GUNITA", {
      fontFamily: "'Courier New', monospace",
      fontSize: "84px",
      fontStyle: "bold",
      color: "#f4e7c0",
      stroke: "#1a2134",
      strokeThickness: 8,
    }).setOrigin(0.5);

    const subtitle = this.add.text(640, 262, "Reaper of Echoes", {
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "24px",
      color: "#c9d7f0",
      letterSpacing: 2,
    }).setOrigin(0.5);

    const tagline = this.add.text(640, 320, "The dead have stories to tell. Will you listen?", {
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "20px",
      color: "#f7dca9",
      align: "center",
      wordWrap: { width: 700 },
    }).setOrigin(0.5);

    this.tweens.add({
      targets: [title, subtitle, tagline],
      alpha: 1,
      duration: 1000,
      ease: "Sine.easeOut",
    });

    this.menuButtons = [
      new MenuButton(this, 640, 420, 320, "Start Journey", () => this.startJourney()),
    ];

    this.menuButtons.forEach((button, index) => {
      button.container.setAlpha(0);
      button.container.y += 18;

      this.tweens.add({
        targets: button.container,
        alpha: 1,
        y: button.container.y - 18,
        duration: 520,
        delay: 620 + index * 120,
        ease: "Sine.easeOut",
      });
    });

    this.messageBox = this.add.rectangle(640, 690, 620, 46, 0x0f172a, 0).setStrokeStyle(1, 0x6f7a93, 0);
    this.messageText = this.add.text(640, 690, "", {
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "16px",
      color: "#f6efdb",
    }).setOrigin(0.5).setVisible(false);

    this.add.text(640, 700, "The menu is modular. Each option can later open its own scene.", {
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "14px",
      color: "#93a3bc",
    }).setOrigin(0.5).setAlpha(0.65);
  }

  startJourney() {
    this.menuButtons.forEach((button) => button.setVisible(false));

    this.cameras.main.fadeOut(450, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start("CampoLunanScene");
    });
  }

  flashMessage(message) {
    this.messageBox.setAlpha(0.9).setVisible(true);
    this.messageText.setText(message).setVisible(true);

    this.tweens.killTweensOf(this.messageBox);
    this.tweens.killTweensOf(this.messageText);

    this.tweens.add({
      targets: [this.messageBox, this.messageText],
      alpha: 1,
      duration: 130,
      yoyo: true,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.messageBox.setVisible(false);
        this.messageText.setVisible(false);
      },
    });
  }
}
