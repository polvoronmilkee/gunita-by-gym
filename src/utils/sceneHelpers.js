export function createTitleText(scene, text, y) {
  return scene.add
    .text(scene.scale.width / 2, y, text, {
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "40px",
      color: "#f3e7c2",
      align: "center",
    })
    .setOrigin(0.5);
}

export function createBodyText(scene, text, y) {
  return scene.add
    .text(scene.scale.width / 2, y, text, {
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "20px",
      color: "#d6dbe8",
      align: "center",
      wordWrap: { width: 820 },
      lineSpacing: 8,
    })
    .setOrigin(0.5);
}

export function createPanel(scene, x, y, width, height, color = 0x111827, alpha = 0.9) {
  const panel = scene.add.rectangle(x, y, width, height, color, alpha);
  panel.setStrokeStyle(2, 0x6f7a93, 0.8);
  return panel;
}