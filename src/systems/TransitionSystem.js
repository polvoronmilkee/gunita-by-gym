import Phaser from "phaser";

export class TransitionSystem {
  static fadeToScene(scene, targetSceneKey, data = null, duration = 250) {
    if (!scene.cameras?.main) {
      scene.scene.start(targetSceneKey, data);
      return;
    }

    scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      scene.scene.start(targetSceneKey, data);
    });

    scene.cameras.main.fadeOut(duration, 0, 0, 0);
  }
}