import Phaser from "phaser";

export class SceneManager {
  constructor(sceneClasses = []) {
    this.sceneClasses = sceneClasses;
    this.game = null;
  }

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

  build() {
    return this.sceneClasses;
  }

  bindGame(game) {
    this.game = game;
  }

  start(sceneKey, data) {
    this.game?.scene.start(sceneKey, data);
  }

  launch(sceneKey, data) {
    this.game?.scene.launch(sceneKey, data);
  }

  pause(sceneKey) {
    this.game?.scene.pause(sceneKey);
  }

  resume(sceneKey, data) {
    this.game?.scene.resume(sceneKey, data);
    if (data) {
      this.game?.scene.sendToBack(sceneKey);
    }
  }

  switch(fromSceneKey, toSceneKey, data) {
    this.game?.scene.stop(fromSceneKey);
    this.game?.scene.start(toSceneKey, data);
  }
}