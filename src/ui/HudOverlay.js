import { MenuButton } from "./MenuButton.js";

export class HudOverlay {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setScrollFactor(0);

    this.label = scene.add.text(20, 20, "", {
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "18px",
      color: "#d6dbe8",
    });

    this.backButton = new MenuButton(scene, 1188, 42, 148, "Back", () => {
      scene.scene.start("MainMenuScene");
    });

    this.container.add(this.label);
  }

  setStatus(text) {
    this.label.setText(text);
  }

  setBackVisible(visible) {
    this.backButton.setVisible(visible);
  }
}