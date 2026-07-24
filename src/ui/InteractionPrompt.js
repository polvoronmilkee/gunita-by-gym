import "./interactionPrompt.css";
import Phaser from "phaser";

export class InteractionPrompt {
  constructor(scene) {
    this.scene = scene;
    this.container = null;
    this.innerContainer = null;
    this.activeTarget = null;
    this.currentLabel = null;
    this.bobTween = null;

    // Clean up when scene shuts down or is destroyed
    this.handleShutdown = () => this.destroy();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown);
    scene.events.once(Phaser.Scenes.Events.DESTROY, this.handleShutdown);
  }

  show(target, key, label) {
    if (this.activeTarget === target && this.currentLabel === label) {
      this.updatePosition();
      return;
    }

    this.hide();

    this.activeTarget = target;
    this.currentLabel = label;

    // 1. Math.round to force crisp integer pixel positions
    const x = Math.round(target.x);
    const y = Math.round(target.y - 20);

    this.container = this.scene.add.container(x, y);
    this.container.setDepth(1000);

    this.innerContainer = this.scene.add.container(0, 0);
    this.container.add(this.innerContainer);

    // 2. High-resolution text configuration (Resolution: 2 for sharp display)
    const textStyle = {
      fontFamily: "Georgia, serif",
      fontSize: "9px",
      fontWeight: "bold",
      color: "#f0ebd8"
    };

    const labelText = this.scene.add.text(0, 0, label.toUpperCase(), textStyle);
    labelText.setResolution(2); // Fixes text blurriness
    labelText.setOrigin(0, 0.5);

    // Compact layout measurements (reduced padding and sizes)
    const marginL = 5;
    const keycapW = 15; // Scaled down from 18
    const gap = 5;      // Scaled down from 8
    const marginR = 7;  // Scaled down from 10
    const textW = labelText.width;

    const boxW = Math.round(marginL + keycapW + gap + textW + marginR);
    const boxH = 22;    // Scaled down from 30
    const radius = 4;   // Scaled down from 6

    const graphics = this.scene.add.graphics();
    this.innerContainer.add(graphics);

    // 3. Drop Shadow
    const shadowOffset = 1.5;
    graphics.fillStyle(0x000000, 0.35);
    graphics.fillRoundedRect(
      Math.round(-boxW / 2 + shadowOffset),
      Math.round(-boxH - 5 + shadowOffset),
      boxW,
      boxH,
      radius
    );
    graphics.fillTriangle(
      -4 + shadowOffset, Math.round(-5 + shadowOffset),
      4 + shadowOffset, Math.round(-5 + shadowOffset),
      0 + shadowOffset, Math.round(shadowOffset)
    );

    // 4. Main Slate Box
    graphics.fillStyle(0x181d24, 1.0);
    graphics.fillRoundedRect(Math.round(-boxW / 2), -boxH - 5, boxW, boxH, radius);
    graphics.fillTriangle(-4, -5, 4, -5, 0, 0);

    // 5. Borders
    graphics.lineStyle(1, 0x3a404c, 1.0);
    graphics.strokeRoundedRect(Math.round(-boxW / 2), -boxH - 5, boxW, boxH, radius);

    graphics.lineStyle(1, 0xc8a86b, 0.7);
    graphics.strokeRoundedRect(
      Math.round(-boxW / 2 + 2),
      -boxH - 5 + 2,
      boxW - 4,
      boxH - 4,
      2
    );

    // 6. Compact 3D Keycap Box
    const keyL = Math.round(-boxW / 2 + marginL);
    const keyT = Math.round(-boxH - 5 + (boxH - keycapW) / 2);

    graphics.fillStyle(0x2d3742, 1.0);
    graphics.fillRoundedRect(keyL, keyT + 1, keycapW, keycapW, 2);

    graphics.fillStyle(0x4a5868, 1.0);
    graphics.fillRoundedRect(keyL, keyT, keycapW, keycapW, 2);

    graphics.lineStyle(1, 0x00e5ff, 1.0);
    graphics.strokeRoundedRect(keyL, keyT, keycapW, keycapW, 2);

    // 7. Keycap Text
    const keyCenterX = Math.round(keyL + keycapW / 2);
    const keyCenterY = Math.round(keyT + keycapW / 2);
    const keyText = this.scene.add.text(keyCenterX, keyCenterY, key, {
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "8px",
      fontWeight: "bold",
      color: "#ffffff"
    });
    keyText.setResolution(2); // Fixes text blurriness
    keyText.setOrigin(0.5, 0.5);
    this.innerContainer.add(keyText);

    // Position Action Label Text
    const textX = keyL + keycapW + gap;
    const textY = Math.round(-boxH - 5 + boxH / 2);
    labelText.setPosition(textX, textY);
    this.innerContainer.add(labelText);

    // 8. Pixel-aligned tween targets to prevent sub-pixel blur during motion
    this.bobTween = this.scene.tweens.add({
      targets: this.innerContainer,
      y: -3,
      duration: 800,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1
    });
  }

  updatePosition() {
    if (this.container && this.activeTarget) {
      this.container.setPosition(
        Math.round(this.activeTarget.x),
        Math.round(this.activeTarget.y - 20)
      );
    }
  }

  hide() {
    if (this.bobTween) {
      this.bobTween.remove();
      this.bobTween = null;
    }
    if (this.container) {
      this.container.destroy();
      this.container = null;
      this.innerContainer = null;
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