import Phaser from "phaser";
import "./hudOverlay.css";

const DEFAULT_STATUS = "WASD / ARROWS TO MOVE   P PAUSE   M MEMORY";

function createButton(label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

export class HudOverlay {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.onBack = options.onBack ?? (() => window.returnToGunitaMenu?.());
    this.onPause = options.onPause ?? (() => {});
    this.onMemory = options.onMemory ?? (() => {});

    this.root = document.createElement("div");
    this.root.className = "campo-lunan-hud";

    this.panel = document.createElement("div");
    this.panel.className = "campo-lunan-hud__panel";

    this.status = document.createElement("div");
    this.status.className = "campo-lunan-hud__status";
    this.status.textContent = options.status ?? DEFAULT_STATUS;

    this.buttonRow = document.createElement("div");
    this.buttonRow.className = "campo-lunan-hud__buttons";

    this.backButton = createButton(
      "BACK",
      "campo-lunan-hud__button",
      this.onBack,
    );
    this.pauseButton = createButton(
      "PAUSE",
      "campo-lunan-hud__button",
      this.onPause,
    );
    this.memoryButton = createButton(
      "MEMORY",
      "campo-lunan-hud__button",
      this.onMemory,
    );

    this.buttonRow.append(this.backButton, this.pauseButton, this.memoryButton);
    this.panel.append(this.status, this.buttonRow);
    this.root.append(this.panel);

    this.domElement = scene.add
      .dom(20, 20, this.root)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(1000);

    this.handleShutdown = () => this.destroy();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown);
    scene.events.once(Phaser.Scenes.Events.DESTROY, this.handleShutdown);
  }

  setStatus(text) {
    this.status.textContent = text;
  }

  setBackVisible(visible) {
    this.backButton.hidden = !visible;
  }

  setPauseVisible(visible) {
    this.pauseButton.hidden = !visible;
  }

  setMemoryVisible(visible) {
    this.memoryButton.hidden = !visible;
  }

  destroy() {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.domElement?.destroy();
    this.root?.remove();
  }
}
