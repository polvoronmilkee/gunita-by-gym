import Phaser from "phaser";
import "./hudOverlay.css";

const DEFAULT_STATUS = "WASD / ARROWS MOVE   SHIFT DASH   P PAUSE   M MEMORY";

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
    this.onButtonPress = options.onButtonPress ?? (() => {});
    this.onBack = options.onBack ?? (() => window.returnToGunitaMenu?.());
    this.onPause = options.onPause ?? (() => {});
    this.onMemory = options.onMemory ?? (() => {});
    this.onToggleMusic = options.onToggleMusic ?? (() => true);
    this.onToggleSfx = options.onToggleSfx ?? (() => true);

    this.root = document.createElement("div");
    this.root.className = "campo-lunan-hud";

    this.panel = document.createElement("div");
    this.panel.className = "campo-lunan-hud__panel";

    this.status = document.createElement("div");
    this.status.className = "campo-lunan-hud__status";
    this.status.textContent = options.status ?? DEFAULT_STATUS;

    this.buttonRow = document.createElement("div");
    this.buttonRow.className = "campo-lunan-hud__buttons";

    this.audioControls = document.createElement("div");
    this.audioControls.className = "campo-lunan-hud__audio-controls";

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
    this.musicButton = createButton(
      options.musicEnabled === false ? "🔇" : "🎵",
      "campo-lunan-hud__audio-btn",
      () => {
        this.onButtonPress();
        const isEnabled = this.onToggleMusic();
        this.setMusicEnabled(isEnabled);
      },
    );
    this.sfxButton = createButton(
      options.sfxEnabled === false ? "🔇" : "🔊",
      "campo-lunan-hud__audio-btn",
      () => {
        this.onButtonPress();
        const isEnabled = this.onToggleSfx();
        this.setSfxEnabled(isEnabled);
      },
    );

    this.backButton.addEventListener("click", () => this.onButtonPress());
    this.pauseButton.addEventListener("click", () => this.onButtonPress());
    this.memoryButton.addEventListener("click", () => this.onButtonPress());

    this.buttonRow.append(this.backButton, this.pauseButton, this.memoryButton);
    this.audioControls.append(this.sfxButton, this.musicButton);
    this.panel.append(this.status, this.buttonRow);
    this.root.append(this.audioControls, this.panel);

    // Mount it directly into the game container to avoid camera scaling/positioning issues
    const container = document.getElementById("game-container") || document.body;
    container.appendChild(this.root);

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

  setMusicEnabled(enabled) {
    this.musicButton.textContent = enabled ? "🎵" : "🔇";
    this.musicButton.title = enabled ? "MUSIC ON" : "MUSIC OFF";
    this.musicButton.setAttribute(
      "aria-label",
      enabled ? "Music on" : "Music off",
    );
  }

  setSfxEnabled(enabled) {
    this.sfxButton.textContent = enabled ? "🔊" : "🔇";
    this.sfxButton.title = enabled ? "SFX ON" : "SFX OFF";
    this.sfxButton.setAttribute(
      "aria-label",
      enabled ? "Sound effects on" : "Sound effects off",
    );
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
