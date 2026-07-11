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
  constructor(scene) {
    this.scene = scene;
    this.musicTracks = [];
    this.currentTrackIndex = 0;
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
    this.vinoMoveSfx = scene.sound.add(AUDIO_SETTINGS.sfx.vinoMove.key, {
      volume: AUDIO_SETTINGS.volume.vinoMove,
    });

    for (const track of AUDIO_SETTINGS.tracks) {
      this.musicTracks.push(
        scene.sound.add(track.key, {
          volume: AUDIO_SETTINGS.volume.music,
          loop: false,
        }),
      );
    }

    if (this.musicTracks.length > 0) {
      this.currentTrackIndex = persisted.trackIndex;
      if (this.musicEnabled) {
        this.playCurrentTrack();
      }
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
      trackIndex: this.currentTrackIndex,
    };

    try {
      window.localStorage.setItem(AUDIO_SETTINGS.storageKey, JSON.stringify(state));
    } catch {
      // Ignore storage failures in restricted/private contexts.
    }
  }

  playCurrentTrack() {
    if (!this.musicEnabled || this.musicTracks.length === 0 || this.isDestroyed) {
      return;
    }

    this.currentTrack = this.musicTracks[this.currentTrackIndex];
    if (!this.currentTrack || this.currentTrack.isPlaying) {
      return;
    }

    this.currentTrack.once("complete", this.handleTrackComplete, this);
    this.currentTrack.play();
  }

  handleTrackComplete() {
    if (!this.musicEnabled || this.musicTracks.length === 0 || this.isDestroyed) {
      return;
    }

    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.musicTracks.length;
    this.persistState();
    this.playCurrentTrack();
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

  playVinoMoveSfx() {
    if (!this.sfxEnabled || this.isDestroyed) {
      return;
    }
    this.vinoMoveSfx?.play();
  }

  destroy() {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;
    this.stopMusic();
    this.buttonSfx?.stop();
    this.dashSfx?.stop();
    this.vinoMoveSfx?.stop();
    this.currentTrack = null;
  }
}
