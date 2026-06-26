import Phaser from "phaser";
import { GUNITA_THEME } from "./theme.js";

export function createMenuBackdrop(scene) {
  const width = scene.scale.width;
  const height = scene.scale.height;

  scene.add.rectangle(width / 2, height / 2, width, height, GUNITA_THEME.bg);
  scene.add.rectangle(width / 2, height / 2, width, height, GUNITA_THEME.overlay, 0.88);

  const moonGlow = scene.add.circle(width * 0.73, height * 0.22, 150, GUNITA_THEME.purpleLight, 0.1);
  const moon = scene.add.circle(width * 0.73, height * 0.22, 72, GUNITA_THEME.purplePale, 0.18);

  scene.tweens.add({
    targets: [moonGlow, moon],
    y: "-=8",
    duration: 5200,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });
}

export function createAtmosphericFog(scene, count = 16) {
  const fogLayer = scene.add.group();

  for (let index = 0; index < count; index += 1) {
    const fog = scene.add.circle(
      Phaser.Math.Between(-80, scene.scale.width + 80),
      Phaser.Math.Between(20, scene.scale.height - 20),
      Phaser.Math.Between(18, 60),
      0xaab4c8,
      Phaser.Math.FloatBetween(0.02, 0.06),
    );

    fogLayer.add(fog);

    scene.tweens.add({
      targets: fog,
      x: fog.x + Phaser.Math.Between(-40, 40),
      y: fog.y + Phaser.Math.Between(-18, 18),
      alpha: Phaser.Math.FloatBetween(0.01, 0.035),
      scale: Phaser.Math.FloatBetween(0.95, 1.15),
      duration: Phaser.Math.Between(5000, 10000),
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      delay: index * 180,
    });
  }

  return fogLayer;
}

export function createFloatingLights(scene, count = 8) {
  const lights = scene.add.group();

  for (let index = 0; index < count; index += 1) {
    const light = scene.add.circle(
      Phaser.Math.Between(80, scene.scale.width - 80),
      Phaser.Math.Between(140, scene.scale.height - 120),
      Phaser.Math.Between(3, 7),
      0xf1d7a1,
      Phaser.Math.FloatBetween(0.35, 0.75),
    );

    lights.add(light);

    scene.tweens.add({
      targets: light,
      y: light.y + Phaser.Math.Between(-24, 24),
      x: light.x + Phaser.Math.Between(-16, 16),
      alpha: Phaser.Math.FloatBetween(0.22, 0.72),
      scale: Phaser.Math.FloatBetween(0.85, 1.18),
      duration: Phaser.Math.Between(2800, 5200),
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      delay: index * 220,
    });
  }

  return lights;
}