import Phaser from "phaser";
import { GUNITA_THEME } from "./theme.js";

export function createMenuBackdrop(scene) {
  const width = scene.scale.width;
  const height = scene.scale.height;

  scene.add.rectangle(width / 2, height / 2, width, height, GUNITA_THEME.bg);
  scene.add.rectangle(width / 2, height / 2, width, height, GUNITA_THEME.overlay, 0.88);

  const moonGlow = scene.add.circle(width * 0.73, height * 0.22, 150, GUNITA_THEME.purpleLight, 0.1);
  const moon = scene.add.circle(width * 0.73, height * 0.22, 72, GUNITA_THEME.purplePale, 0.18);

  scene.add.circle(width * 0.73, height * 0.22, 96, GUNITA_THEME.purplePale, 0.05);
  scene.add.circle(width * 0.73, height * 0.22, 132, GUNITA_THEME.purpleLight, 0.03);
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

  }

  return lights;
}