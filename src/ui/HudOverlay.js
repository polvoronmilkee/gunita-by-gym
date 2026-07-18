import Phaser from "phaser";
import "./hudOverlay.css";

export class HudOverlay {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.onButtonPress = options.onButtonPress ?? (() => {});
    this.onPause = options.onPause ?? (() => {});

    // Create a simple, clean, floating retro pause button
    this.root = document.createElement("button");
    this.root.type = "button";
    this.root.className = "gunita-pause-btn";
    this.root.textContent = "⏸";
    this.root.title = "Pause Game";

    this.root.addEventListener("click", () => {
      this.onButtonPress();
      this.onPause();
    });

    const container = document.getElementById("game-container") || document.body;
    container.appendChild(this.root);

    this.handleShutdown = () => this.destroy();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown);
    scene.events.once(Phaser.Scenes.Events.DESTROY, this.handleShutdown);
  }

  setStatus(text) {
    // Empty stub to prevent breaking scene calls
  }

  setBackVisible(visible) {
    // Empty stub to prevent breaking scene calls
  }

  setPauseVisible(visible) {
    this.root.style.display = visible ? "flex" : "none";
  }

  setMemoryVisible(visible) {
    // Empty stub to prevent breaking scene calls
  }

  setMusicEnabled(enabled) {
    // Empty stub to prevent breaking scene calls
  }

  setSfxEnabled(enabled) {
    // Empty stub to prevent breaking scene calls
  }

  destroy() {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.root?.remove();
  }
}
