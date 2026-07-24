import "./interactionPrompt.css";
import Phaser from "phaser";

export class InteractionPrompt {
  constructor(scene) {
    this.scene = scene;
    this.domElement = null;
    this.activeTarget = null;
    this.currentLabel = null;

    // Clean up when scene shuts down or is destroyed
    this.handleShutdown = () => this.destroy();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown);
    scene.events.once(Phaser.Scenes.Events.DESTROY, this.handleShutdown);
  }

  show(target, key, label) {
    // If target is already active with the same label, just update position
    if (this.activeTarget === target && this.currentLabel === label) {
      this.updatePosition();
      return;
    }

    this.hide();

    this.activeTarget = target;
    this.currentLabel = label;

    // Create the DOM structure
    const wrapper = document.createElement("div");
    wrapper.className = "interaction-prompt-container";

    const inner = document.createElement("div");
    inner.className = "interaction-prompt-inner";

    const keycap = document.createElement("span");
    keycap.className = "interaction-prompt-keycap";
    keycap.textContent = key;

    const labelText = document.createElement("span");
    labelText.className = "interaction-prompt-label";
    labelText.textContent = label;

    inner.appendChild(keycap);
    inner.appendChild(labelText);
    wrapper.appendChild(inner);

    // Initial positioning offset (-20px above target)
    const x = Math.round(target.x);
    const y = Math.round(target.y - 40);

    // Add DOM Element to scene
    this.domElement = this.scene.add.dom(x, y, wrapper);
    this.domElement.setDepth(1000);
  }

  updatePosition() {
    if (this.domElement && this.activeTarget) {
      this.domElement.setPosition(
        Math.round(this.activeTarget.x),
        Math.round(this.activeTarget.y - 40)
      );
    }
  }

  hide() {
    if (this.domElement) {
      this.domElement.destroy();
      this.domElement = null;
    }
    this.activeTarget = null;
    this.currentLabel = null;
  }

  destroy() {
    this.hide();
    if (this.scene && this.scene.events) {
      this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown);
      this.scene.events.off(Phaser.Scenes.Events.DESTROY, this.handleShutdown);
    }
  }
}