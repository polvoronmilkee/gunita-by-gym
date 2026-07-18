import "./interactionPrompt.css";
import Phaser from "phaser";

export class InteractionPrompt {
  constructor(scene) {
    this.scene = scene;
    this.element = null;
    this.activeTarget = null;
    this.currentLabel = null;

    // Clean up when scene shuts down or is destroyed
    this.handleShutdown = () => this.destroy();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown);
    scene.events.once(Phaser.Scenes.Events.DESTROY, this.handleShutdown);
  }

  show(target, key, label) {
    // If target is already active with the same label, just update position (or skip recreate)
    if (this.activeTarget === target && this.currentLabel === label) {
      this.updatePosition();
      return;
    }

    this.hide();

    this.activeTarget = target;
    this.currentLabel = label;

    const x = target.x;
    const y = target.y - 20; // Offset to float above the target

    const htmlString = `
      <div class="interaction-prompt-container">
        <div class="interaction-prompt">
          <div class="interaction-prompt__inner">
            <div class="interaction-prompt__key">${key}</div>
            <div class="interaction-prompt__divider"></div>
            <div class="interaction-prompt__label">${label}</div>
          </div>
        </div>
      </div>
    `;

    this.element = this.scene.add.dom(x, y).createFromHTML(htmlString);
    
    // Disable pointer events on Phaser DOM container so it doesn't block clicks/drag/movement
    if (this.element.node) {
      this.element.node.style.pointerEvents = "none";
    }
  }

  updatePosition() {
    if (this.element && this.activeTarget) {
      this.element.setPosition(this.activeTarget.x, this.activeTarget.y - 20);
    }
  }

  hide() {
    if (this.element) {
      this.element.destroy();
      this.element = null;
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
