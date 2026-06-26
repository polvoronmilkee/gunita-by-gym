export function createTitleText(scene, text, y) {
  return scene.add
    .text(scene.scale.width / 2, y, text, {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "26px",
      color: "#e0c8ff",
      stroke: "#4a1e8a",
      strokeThickness: 4,
      align: "center",
    })
    .setOrigin(0.5);
}

export function createBodyText(scene, text, y) {
  return scene.add
    .text(scene.scale.width / 2, y, text, {
      fontFamily: "'VT323', monospace",
      fontSize: "26px",
      color: "#9880b8",
      align: "center",
      wordWrap: { width: 820 },
      lineSpacing: 4,
    })
    .setOrigin(0.5);
}

export function createPanel(scene, x, y, width, height, color = 0x111827, alpha = 0.9) {
  const panel = scene.add.rectangle(x, y, width, height, color, alpha);
  panel.setStrokeStyle(2, 0x4a1e8a, 0.78);
  return panel;
}