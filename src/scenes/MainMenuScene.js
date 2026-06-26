import Phaser from "phaser";
import { MenuButton } from "../ui/MenuButton.js";
import { GUNITA_THEME } from "../utils/theme.js";
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
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "52px",
      fontStyle: "bold",
      color: "#e0c8ff",
      stroke: "#4a1e8a",
      strokeThickness: 6,
    }).setOrigin(0.5);

    const subtitle = this.add.text(640, 262, "Reaper of Echoes", {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "13px",
      color: "#f0c060",
      letterSpacing: 1,
    }).setOrigin(0.5);

    const tagline = this.add.text(640, 320, "The dead have stories to tell. Will you listen?", {
      fontFamily: "'VT323', monospace",
      fontSize: "28px",
      color: "#9880b8",
      align: "center",
      wordWrap: { width: 700 },
    }).setOrigin(0.5);

    this.tweens.add({
      targets: [title, subtitle, tagline],
      alpha: { from: 0, to: 1 },
      y: "+=0",
      duration: 1200,
      ease: "Sine.easeOut",
    });

    this.menuButtons = [
      new MenuButton(this, 640, 420, 320, "Start Journey", () => this.startJourney()),
    ];

    this.menuButtons.forEach((button, index) => {
      button.container.setAlpha(0);
      button.container.y += 20;

      this.tweens.add({
        targets: button.container,
        alpha: 1,
        y: button.container.y - 20,
        duration: 680,
        delay: 720 + index * 140,
        ease: "Sine.easeOut",
      });
    });

    this.messageBox = this.add.rectangle(640, 690, 620, 46, GUNITA_THEME.bg2, 0).setStrokeStyle(1, GUNITA_THEME.purple, 0);
    this.messageText = this.add.text(640, 690, "", {
      fontFamily: "'VT323', monospace",
      fontSize: "22px",
      color: "#e0c8ff",
    }).setOrigin(0.5).setVisible(false);

    this.add.text(640, 700, "The menu is modular. Each option can later open its own scene.", {
      fontFamily: "'VT323', monospace",
      fontSize: "20px",
      color: "#9880b8",
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
