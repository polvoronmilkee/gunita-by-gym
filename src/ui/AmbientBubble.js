import Phaser from "phaser";
import "./ambientBubble.css";

export class AmbientBubble {
  constructor(scene) {
    this.scene = scene;
    this.domElement = null;
    this.activeTarget = null;
    this.timerEvent = null;

    this.handleShutdown = () => this.destroy();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown);
    scene.events.once(Phaser.Scenes.Events.DESTROY, this.handleShutdown);
  }

  show(target, speaker, text, durationMs = 4500, offsetY = -45) {
    this.hide();

    this.activeTarget = target;
    this.offsetY = offsetY;

    const wrapper = document.createElement("div");
    wrapper.className = "ambient-bubble-container";

    const inner = document.createElement("div");
    inner.className = "ambient-bubble-inner";

    if (speaker) {
      const speakerEl = document.createElement("div");
      speakerEl.className = "ambient-bubble-speaker";
      speakerEl.textContent = speaker;
      inner.appendChild(speakerEl);
    }

    const textEl = document.createElement("div");
    textEl.className = "ambient-bubble-text";
    textEl.textContent = text;
    inner.appendChild(textEl);

    const arrow = document.createElement("div");
    arrow.className = "ambient-bubble-arrow";

    wrapper.appendChild(inner);
    wrapper.appendChild(arrow);

    const x = Math.round(target.x);
    const y = Math.round(target.y + offsetY);

    this.domElement = this.scene.add.dom(x, y, wrapper);
    this.domElement.setDepth(950);
    this.wrapperEl = wrapper;

    if (this.timerEvent) this.timerEvent.remove();
    
    // Fade out before destroying
    this.timerEvent = this.scene.time.delayedCall(durationMs - 500, () => {
      if (this.wrapperEl) {
        this.wrapperEl.classList.add("ambient-bubble-fade-out");
      }
    });

    this.destroyTimer = this.scene.time.delayedCall(durationMs, () => {
      this.hide();
    });
  }

  updatePosition() {
    if (this.domElement && this.activeTarget) {
      this.domElement.setPosition(
        Math.round(this.activeTarget.x),
        Math.round(this.activeTarget.y + (this.offsetY || -45))
      );
    }
  }

  hide() {
    if (this.timerEvent) {
      this.timerEvent.remove();
      this.timerEvent = null;
    }
    if (this.destroyTimer) {
      this.destroyTimer.remove();
      this.destroyTimer = null;
    }
    if (this.domElement) {
      this.domElement.destroy();
      this.domElement = null;
    }
    this.activeTarget = null;
    this.wrapperEl = null;
  }

  destroy() {
    this.hide();
    if (this.scene && this.scene.events) {
      this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown);
      this.scene.events.off(Phaser.Scenes.Events.DESTROY, this.handleShutdown);
    }
  }
}
