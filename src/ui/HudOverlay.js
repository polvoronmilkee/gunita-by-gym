export class HudOverlay {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setScrollFactor(0);

    this.label = scene.add.text(20, 20, "", {
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "18px",
      color: "#d6dbe8",
    });

    this.container.add(this.label);
  }

  setStatus(text) {
    this.label.setText(text);
  }
}