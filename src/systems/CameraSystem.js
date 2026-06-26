export class CameraSystem {
  static configureMainCamera(scene, boundsWidth, boundsHeight) {
    scene.cameras.main.setBounds(0, 0, boundsWidth, boundsHeight);
    scene.physics.world.setBounds(0, 0, boundsWidth, boundsHeight);
    scene.cameras.main.roundPixels = true;
  }

  static follow(scene, target, lerp = 0.08) {
    scene.cameras.main.startFollow(target, true, lerp, lerp);
  }
}