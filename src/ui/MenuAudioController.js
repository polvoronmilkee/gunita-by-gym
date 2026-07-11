import { AUDIO_SETTINGS } from "../utils/audioSettings.js";

const clampIndex = (value, max) => {
  if (!Number.isFinite(value) || value < 0 || value >= max) {
    return 0;
  }
  return Math.floor(value);
};

export class MenuAudioController {
  constructor({ musicButton, sfxButton } = {}) {
    this.musicButton = musicButton;
    this.sfxButton = sfxButton;
    this.currentTrackIndex = 0;
    this.currentTrack = null;
    this.audioUnlocked = false;

    const persisted = this.readPersistedState();
    this.musicEnabled = persisted.musicEnabled;
    this.sfxEnabled = persisted.sfxEnabled;
    this.currentTrackIndex = persisted.trackIndex;

    this.musicTracks = AUDIO_SETTINGS.tracks.map((track) => {
      const audio = new Audio(track.path);
      audio.preload = "auto";
      audio.volume = AUDIO_SETTINGS.volume.music;
      audio.loop = false;
      return audio;
    });

    this.buttonSfx = new Audio(AUDIO_SETTINGS.sfx.button.path);
    this.buttonSfx.preload = "auto";
    this.buttonSfx.volume = AUDIO_SETTINGS.volume.button;

    this.handleTrackEnded = () => {
      this.currentTrackIndex = (this.currentTrackIndex + 1) % this.musicTracks.length;
      this.persistState();
      this.playCurrentTrack();
    };

    this.currentTrack = this.musicTracks[this.currentTrackIndex] ?? null;
    this.currentTrack?.addEventListener("ended", this.handleTrackEnded);

    this.bindUi();
    this.bindUnlockHandlers();
    this.syncButtonLabels();
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
      // Ignore storage write failures.
    }
  }

  bindUi() {
    this.musicButton?.addEventListener("click", () => {
      this.playButtonSfx();
      this.toggleMusic();
    });

    this.sfxButton?.addEventListener("click", () => {
      this.playButtonSfx();
      this.toggleSfx();
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const clickedMenuControl = target.closest(
        ".menu-btn, .gunita-modal__btn, .gunita-modal__btn--confirm-centered, .gunita-modal__close-x, .gunita-modal__cancel-link",
      );

      if (!clickedMenuControl) {
        return;
      }

      this.playButtonSfx();
    });
  }

  bindUnlockHandlers() {
    const unlockAudio = () => {
      if (this.audioUnlocked) {
        return;
      }

      this.audioUnlocked = true;
      if (this.musicEnabled) {
        this.playCurrentTrack();
      }

      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };

    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
  }

  syncButtonLabels() {
    if (this.sfxButton) {
      this.sfxButton.textContent = this.sfxEnabled ? "🔊" : "🔇";
      this.sfxButton.setAttribute(
        "aria-label",
        this.sfxEnabled ? "Sound effects on" : "Sound effects off",
      );
      this.sfxButton.title = this.sfxEnabled ? "SFX ON" : "SFX OFF";
    }

    if (this.musicButton) {
      this.musicButton.textContent = this.musicEnabled ? "🎵" : "🔇";
      this.musicButton.setAttribute(
        "aria-label",
        this.musicEnabled ? "Music on" : "Music off",
      );
      this.musicButton.title = this.musicEnabled ? "MUSIC ON" : "MUSIC OFF";
    }
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    this.persistState();
    this.syncButtonLabels();

    if (!this.musicEnabled) {
      this.stopMusic();
    } else if (this.audioUnlocked) {
      this.playCurrentTrack();
    }
  }

  toggleSfx() {
    this.sfxEnabled = !this.sfxEnabled;
    this.persistState();
    this.syncButtonLabels();
  }

  playCurrentTrack() {
    if (!this.musicEnabled || this.musicTracks.length === 0) {
      return;
    }

    const nextTrack = this.musicTracks[this.currentTrackIndex] ?? this.musicTracks[0];
    if (!nextTrack) {
      return;
    }

    if (this.currentTrack && this.currentTrack !== nextTrack) {
      this.currentTrack.pause();
      this.currentTrack.currentTime = 0;
      this.currentTrack.removeEventListener("ended", this.handleTrackEnded);
    }

    this.currentTrack = nextTrack;
    this.currentTrack.addEventListener("ended", this.handleTrackEnded);

    this.currentTrack.play().catch(() => {
      // Browser autoplay policies can block play until user gesture.
    });
  }

  stopMusic() {
    if (!this.currentTrack) {
      return;
    }

    this.currentTrack.pause();
    this.currentTrack.currentTime = 0;
  }

  resumeMusicIfEnabled() {
    if (!this.musicEnabled || !this.audioUnlocked) {
      return;
    }

    this.playCurrentTrack();
  }

  playButtonSfx() {
    if (!this.sfxEnabled) {
      return;
    }

    this.buttonSfx.pause();
    this.buttonSfx.currentTime = 0;
    this.buttonSfx.play().catch(() => {
      // No-op on blocked playback.
    });
  }
}
