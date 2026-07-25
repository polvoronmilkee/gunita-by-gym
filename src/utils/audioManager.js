import Phaser from "phaser";
import { AUDIO_SETTINGS } from "./audioSettings.js";

const clampIndex = (value, max) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value >= max) {
    return 0;
  }
  return Math.floor(value);
};

export class AudioManager {
  constructor(scene, defaultTrackKey = null) {
    this.scene = scene;
    this.musicTracks = {};
    this.currentTrackKey = defaultTrackKey;
    this.currentTrack = null;
    this.isDestroyed = false;

    const persisted = this.readPersistedState();
    this.musicEnabled = persisted.musicEnabled;
    this.sfxEnabled = persisted.sfxEnabled;

    this.buttonSfx = scene.sound.add(AUDIO_SETTINGS.sfx.button.key, {
      volume: AUDIO_SETTINGS.volume.button,
    });
    this.dashSfx = scene.sound.add(AUDIO_SETTINGS.sfx.dash.key, {
      volume: AUDIO_SETTINGS.volume.dash,
    });

    for (const track of AUDIO_SETTINGS.tracks) {
      if (scene.sound.get(track.key) || scene.cache.audio.has(track.key)) {
        this.musicTracks[track.key] = scene.sound.add(track.key, {
          volume: AUDIO_SETTINGS.volume.music,
          loop: true,
        });
      }
    }

    if (defaultTrackKey && this.musicTracks[defaultTrackKey]) {
      this.currentTrackKey = defaultTrackKey;
    } else if (AUDIO_SETTINGS.tracks.length > 0) {
      const fallbackTrack = AUDIO_SETTINGS.tracks[clampIndex(persisted.trackIndex, AUDIO_SETTINGS.tracks.length)];
      if (fallbackTrack) {
        this.currentTrackKey = fallbackTrack.key;
      }
    }

    if (this.musicEnabled && this.currentTrackKey) {
      this.playTrack(this.currentTrackKey);
    }

    this.handleShutdown = () => this.destroy();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown);
    scene.events.once(Phaser.Scenes.Events.DESTROY, this.handleShutdown);
  }

  readPersistedState() {
    const fallback = {
      musicEnabled: AUDIO_SETTINGS.defaults.musicEnabled,
      sfxEnabled: AUDIO_SETTINGS.defaults.sfxEnabled,
      trackIndex: 0,
    };

    try {
      const raw = window.localStorage.getItem(AUDIO_SETTINGS.storageKey);
      if (!raw) {
        return fallback;
      }

      const parsed = JSON.parse(raw);
      return {
        musicEnabled:
          typeof parsed.musicEnabled === "boolean"
            ? parsed.musicEnabled
            : fallback.musicEnabled,
        sfxEnabled:
          typeof parsed.sfxEnabled === "boolean"
            ? parsed.sfxEnabled
            : fallback.sfxEnabled,
        trackIndex: clampIndex(parsed.trackIndex, AUDIO_SETTINGS.tracks.length),
      };
    } catch {
      return fallback;
    }
  }

  persistState() {
    const state = {
      musicEnabled: this.musicEnabled,
      sfxEnabled: this.sfxEnabled,
      trackKey: this.currentTrackKey,
    };

    try {
      window.localStorage.setItem(
        AUDIO_SETTINGS.storageKey,
        JSON.stringify(state),
      );
    } catch {
      // Ignore storage failures in restricted/private contexts.
    }
  }

  playTrack(key) {
    if (!key || this.isDestroyed) {
      return;
    }

    this.currentTrackKey = key;

    if (!this.musicEnabled) {
      return;
    }

    if (this.currentTrack && this.currentTrack.isPlaying) {
      if (this.currentTrack.key === key) {
        return;
      }
      this.currentTrack.stop();
    }

    this.currentTrack = this.musicTracks[key];
    if (this.currentTrack) {
      this.currentTrack.play({ loop: true, volume: AUDIO_SETTINGS.volume.music });
    }
  }

  playCurrentTrack() {
    if (this.currentTrackKey) {
      this.playTrack(this.currentTrackKey);
    }
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    this.persistState();

    if (!this.musicEnabled) {
      this.stopMusic();
    } else {
      this.playCurrentTrack();
    }

    return this.musicEnabled;
  }

  toggleSfx() {
    this.sfxEnabled = !this.sfxEnabled;
    this.persistState();
    return this.sfxEnabled;
  }

  stopMusic() {
    if (this.currentTrack && this.currentTrack.isPlaying) {
      this.currentTrack.stop();
    }
  }

  playButtonSfx() {
    if (!this.sfxEnabled || this.isDestroyed) {
      return;
    }
    this.buttonSfx?.play();
  }

  playDashSfx() {
    if (!this.sfxEnabled || this.isDestroyed) {
      return;
    }
    this.dashSfx?.play();
  }


  playRainThunder() {
    if (!this.sfxEnabled || this.isDestroyed) {
      return;
    }
    if (!this.rainThunderSfx) {
      if (this.scene.cache.audio.has(AUDIO_SETTINGS.sfx.rainAndThunder.key)) {
        this.rainThunderSfx = this.scene.sound.add(
          AUDIO_SETTINGS.sfx.rainAndThunder.key,
          {
            volume: 0.6,
            loop: true,
          },
        );
      }
    }
    if (this.rainThunderSfx && !this.rainThunderSfx.isPlaying) {
      this.rainThunderSfx.play();
    }
  }

  stopRainThunder() {
    if (this.rainThunderSfx && this.rainThunderSfx.isPlaying) {
      this.rainThunderSfx.stop();
    }
  }

  destroy() {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;
    this.stopMusic();
    this.buttonSfx?.stop();
    this.dashSfx?.stop();
    this.rainThunderSfx?.stop();
    this.currentTrack = null;
  }
}
