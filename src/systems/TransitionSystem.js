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

  static shatteredGlassTransition(scene, onComplete) {
    const { width, height } = scene.scale;
    const camera = scene.cameras.main;

    // --- PHASE 1: FREEZE & SNAPSHOT ---
    scene.physics.pause();
    scene.sound.stopAll();

    if (!scene.textures.exists('crystal-spark')) {
      const g = scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 4, 4);
      g.generateTexture('crystal-spark', 4, 4);
      g.destroy();
    }

    // Capture screen snapshot
    const rt = scene.add.renderTexture(0, 0, width, height);
    rt.draw(scene.children, -camera.scrollX, -camera.scrollY);
    rt.saveTexture('screen-snapshot');
    rt.destroy();

    const screenCenterX = width / 2;
    const screenCenterY = height / 2;

    // Full snapshot covers live game
    const fullSnapshot = scene.add.sprite(screenCenterX, screenCenterY, 'screen-snapshot');
    fullSnapshot.setScrollFactor(0).setDepth(9998);

    const voidBg = scene.add.rectangle(screenCenterX, screenCenterY, width, height, 0x050510);
    voidBg.setScrollFactor(0).setDepth(9999).setVisible(false);

    // Keep black overlay on top of shards as it fades in (Depth 10005)
    const fadeBlack = scene.add.rectangle(screenCenterX, screenCenterY, width, height, 0x000000);
    fadeBlack.setScrollFactor(0).setDepth(10005).setAlpha(0).setVisible(false);

    scene.transitionVoidBg = voidBg;
    scene.transitionFadeBlack = fadeBlack;

    const cleanupOverlays = () => {
      if (voidBg && voidBg.active) voidBg.destroy();
      if (fadeBlack && fadeBlack.active) fadeBlack.destroy();
    };

    scene.events.once("shutdown", cleanupOverlays);
    scene.events.once("destroy", cleanupOverlays);

    const shards = [];
    const numShards = 16;
    const maxRadius = Math.max(width, height) * 1.5;

    for (let i = 0; i < numShards; i++) {
      const angle1 = (i / numShards) * Math.PI * 2;
      const angle2 = ((i + 1.2) / numShards) * Math.PI * 2;
      
      const x1 = screenCenterX + Math.cos(angle1) * maxRadius;
      const y1 = screenCenterY + Math.sin(angle1) * maxRadius;
      const x2 = screenCenterX + Math.cos(angle2) * maxRadius;
      const y2 = screenCenterY + Math.sin(angle2) * maxRadius;

      const shape = scene.make.graphics({ x: screenCenterX, y: screenCenterY });
      shape.fillStyle(0xffffff);
      shape.beginPath();
      
      const centerOffsetX = Phaser.Math.Between(-30, 30);
      const centerOffsetY = Phaser.Math.Between(-30, 30);

      shape.moveTo(centerOffsetX, centerOffsetY);
      shape.lineTo(x1 - screenCenterX, y1 - screenCenterY);
      shape.lineTo(x2 - screenCenterX, y2 - screenCenterY);
      shape.closePath();
      shape.fillPath();
      shape.setScrollFactor(0);

      const mask = shape.createGeometryMask();

      const shardBase = scene.add.sprite(screenCenterX, screenCenterY, 'screen-snapshot');
      shardBase.setScrollFactor(0).setMask(mask).setDepth(10000).setVisible(false);

      shards.push({ base: shardBase, maskShape: shape, angleCenter: (angle1 + angle2) / 2 });
    }

    // Glowing Spiderweb Faultlines
    const crack = scene.add.graphics();
    crack.setScrollFactor(0).setDepth(10001);
    crack.lineStyle(2, 0xd4b3ff, 1);
    crack.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.2, 0.2);
      let currX = screenCenterX;
      let currY = screenCenterY;
      crack.moveTo(currX, currY);
      for (let j = 0; j < 5; j++) {
        currX += Math.cos(angle + Phaser.Math.FloatBetween(-0.6, 0.6)) * (maxRadius / 5);
        currY += Math.sin(angle + Phaser.Math.FloatBetween(-0.6, 0.6)) * (maxRadius / 5);
        crack.lineTo(currX, currY);
      }
    }
    crack.strokePath();
    crack.lineStyle(6, 0x8a2be2, 0.6);
    crack.strokePath();
    crack.setAlpha(0);

    // --- PHASE 2: DRAW CRACKS ---
    scene.tweens.add({
      targets: crack,
      alpha: 1,
      duration: 400,
      ease: 'Stepped',
      easeParams: [4],
      onComplete: () => {
        
        // --- PHASE 3: SHAKE + QUICK IMPACT FLASH ---
        camera.shake(250, 0.03);
        camera.flash(150, 0, 255, 255); // Snappy 150ms flash hides the texture swap

        // Swap snapshot for shards
        fullSnapshot.destroy(); 
        crack.destroy();
        voidBg.setVisible(true);
        fadeBlack.setVisible(true);

        shards.forEach((s) => {
          s.base.setVisible(true);
        });

        // Particle explosion
        const emitter = scene.add.particles(screenCenterX, screenCenterY, 'crystal-spark', {
          speed: { min: 200, max: 700 },
          angle: { min: 0, max: 360 },
          scale: { start: 1.5, end: 0 },
          alpha: { start: 1, end: 0 },
          tint: [0xffffff, 0xceb2ff, 0x8a2be2],
          lifespan: 800,
          quantity: 60,
          blendMode: 'SCREEN',
          emitting: false
        });
        emitter.setScrollFactor(0).setDepth(10002);
        emitter.explode(60);

        // --- PHASE 4: CLEAN SHATTER EXPLOSION ---
        shards.forEach((shardData) => {
          const pushDist = Phaser.Math.Between(250, 600);
          const pushX = Math.cos(shardData.angleCenter) * pushDist;
          const pushY = Math.sin(shardData.angleCenter) * pushDist;

          scene.tweens.add({
            targets: [shardData.base, shardData.maskShape],
            x: `+=${pushX}`,
            y: `+=${pushY}`,
            scaleX: 1.1,
            scaleY: 1.1,
            alpha: 0,
            duration: 800,
            ease: 'Power2.easeOut'
          });
        });

        // Smooth transition to pure black
        scene.tweens.add({
          targets: fadeBlack,
          alpha: 1,
          duration: 700,
          ease: 'Sine.easeIn',
          onComplete: () => {
            // Clean up shard sprites & particle system
            shards.forEach((s) => {
              s.base.destroy();
              s.maskShape.destroy();
            });
            voidBg.destroy();
            emitter.destroy();

            if (scene.textures.exists('screen-snapshot')) {
              scene.textures.remove('screen-snapshot');
            }

            scene.transitionFadeBlack = fadeBlack;
            if (onComplete) onComplete();

            // Fade out and destroy transition fadeBlack so resuming scene is never stuck on black
            scene.tweens.add({
              targets: fadeBlack,
              alpha: 0,
              duration: 400,
              delay: 300,
              onComplete: () => {
                if (fadeBlack && fadeBlack.active) {
                  fadeBlack.destroy();
                }
                if (scene.transitionFadeBlack === fadeBlack) {
                  scene.transitionFadeBlack = null;
                }
                if (scene.physics && typeof scene.physics.resume === 'function') {
                  scene.physics.resume();
                }
              }
            });
          }
        });
      }
    });
  }
}