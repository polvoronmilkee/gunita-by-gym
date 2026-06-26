import { MenuButton } from "./MenuButton.js";
import { GUNITA_THEME } from "../utils/theme.js";

export class HudOverlay {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setScrollFactor(0);

    this.label = scene.add.text(20, 20, "", {
      fontFamily: "'VT323', monospace",
      fontSize: "24px",
      color: "#e8d8f8",
    });

    this.backButton = new MenuButton(scene, 1168, 38, 150, "Back", () => {
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

  setStatusVisible(visible) {
    this.label.setVisible(visible);
  }
}