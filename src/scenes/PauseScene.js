import Phaser from "phaser";
import "../ui/pauseMenu.css";

export class PauseScene extends Phaser.Scene {
  constructor() {
    super("PauseScene");
  }

  init(data) {
    this.parentScene = data?.parentScene;
  }

  create() {
    // Dim the background using Phaser
    this.bgDim = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.4);

    // Read audio state
    let musicEnabled = true;
    let sfxEnabled = true;

    if (this.parentScene && this.parentScene.audioManager) {
      musicEnabled = this.parentScene.audioManager.musicEnabled;
      sfxEnabled = this.parentScene.audioManager.sfxEnabled;
    } else {
      // Fallback: read from localStorage
      try {
        const raw = window.localStorage.getItem("gunita-audio-settings");
        if (raw) {
          const parsed = JSON.parse(raw);
          musicEnabled = parsed.musicEnabled !== false;
          sfxEnabled = parsed.sfxEnabled !== false;
        }
      } catch (e) {
        console.warn(e);
      }
    }

    // Render pause menu DOM element
    const container = document.getElementById("game-container") || document.body;
    this.root = document.createElement("div");
    this.root.className = "pause-menu-overlay";

    this.root.innerHTML = `
      <div class="pause-menu">
        <div class="pause-menu__header">
          <h2 class="pause-menu__title">❚❚ JOURNEY PAUSED</h2>
          <button class="pause-menu__close-btn" id="pm-close" aria-label="Resume game">✕</button>
        </div>
        <div class="pause-menu__divider"><span>✦</span></div>
        <div class="pause-menu__buttons">
          <button class="pause-menu__btn" id="pm-resume">
            <div class="pm-btn-icon">▶</div>
            <div class="pm-btn-body">
              <span class="pm-btn-title">RESUME JOURNEY</span>
              <span class="pm-btn-desc">Continue exploring the memory world</span>
            </div>
          </button>

          <button class="pause-menu__btn" id="pm-guide">
            <div class="pm-btn-icon">📖</div>
            <div class="pm-btn-body">
              <span class="pm-btn-title">ECHO ARCHIVE</span>
              <span class="pm-btn-desc">Review lore, controls & game mechanics</span>
            </div>
          </button>

          <button class="pause-menu__btn" id="pm-music">
            <div class="pm-btn-icon">🎵</div>
            <div class="pm-btn-body">
              <span class="pm-btn-title">BACKGROUND MUSIC</span>
              <span class="pm-btn-desc">Toggle ambience and soundtrack</span>
            </div>
            <span class="pm-status-badge ${musicEnabled ? "is-on" : ""}" id="pm-music-badge">${musicEnabled ? "ON" : "OFF"}</span>
          </button>

          <button class="pause-menu__btn" id="pm-sfx">
            <div class="pm-btn-icon">🔊</div>
            <div class="pm-btn-body">
              <span class="pm-btn-title">SOUND EFFECTS</span>
              <span class="pm-btn-desc">Toggle interaction and audio feedback</span>
            </div>
            <span class="pm-status-badge ${sfxEnabled ? "is-on" : ""}" id="pm-sfx-badge">${sfxEnabled ? "ON" : "OFF"}</span>
          </button>

          <button class="pause-menu__btn" id="pm-menu">
            <div class="pm-btn-icon">🏠</div>
            <div class="pm-btn-body">
              <span class="pm-btn-title">RETURN TO MAIN MENU</span>
              <span class="pm-btn-desc">Save and leave the current memory</span>
            </div>
          </button>
        </div>
        <div class="pause-menu__footer">"Every memory waits for someone to listen."</div>
      </div>
    `;

    container.appendChild(this.root);

    // Bind event listeners
    const closeBtn = this.root.querySelector("#pm-close");
    const resumeBtn = this.root.querySelector("#pm-resume");
    const guideBtn = this.root.querySelector("#pm-guide");
    const musicBtn = this.root.querySelector("#pm-music");
    const musicBadge = this.root.querySelector("#pm-music-badge");
    const sfxBtn = this.root.querySelector("#pm-sfx");
    const sfxBadge = this.root.querySelector("#pm-sfx-badge");
    const menuBtn = this.root.querySelector("#pm-menu");

    const playClickSfx = () => {
      if (this.parentScene && this.parentScene.audioManager) {
        this.parentScene.audioManager.playButtonSfx();
      }
    };

    const handleResume = () => {
      playClickSfx();
      this.destroyMenu();
      this.scene.stop();
      if (this.parentScene) {
        this.scene.resume(this.parentScene.scene.key);
      } else {
        this.scene.resume("CampoLunanScene");
      }
    };

    closeBtn.addEventListener("click", handleResume);
    resumeBtn.addEventListener("click", handleResume);

    guideBtn.addEventListener("click", () => {
      playClickSfx();
      if (typeof window.showSurvivalGuide === "function") {
        window.showSurvivalGuide();
      } else if (this.parentScene) {
        this.destroyMenu();
        this.scene.stop();
        this.parentScene.scene.pause();
        this.parentScene.scene.launch("MemoryScene", { parentScene: this.parentScene });
      }
    });

    musicBtn.addEventListener("click", () => {
      playClickSfx();
      if (this.parentScene && this.parentScene.audioManager) {
        const enabled = this.parentScene.audioManager.toggleMusic();
        if (musicBadge) {
          musicBadge.textContent = enabled ? "ON" : "OFF";
          musicBadge.classList.toggle("is-on", enabled);
        }
        if (this.parentScene.hud) {
          this.parentScene.hud.setMusicEnabled(enabled);
        }
      } else {
        musicEnabled = !musicEnabled;
        if (musicBadge) {
          musicBadge.textContent = musicEnabled ? "ON" : "OFF";
          musicBadge.classList.toggle("is-on", musicEnabled);
        }
        this.persistFallbackSettings(musicEnabled, sfxEnabled);
      }
    });

    sfxBtn.addEventListener("click", () => {
      playClickSfx();
      if (this.parentScene && this.parentScene.audioManager) {
        const enabled = this.parentScene.audioManager.toggleSfx();
        if (sfxBadge) {
          sfxBadge.textContent = enabled ? "ON" : "OFF";
          sfxBadge.classList.toggle("is-on", enabled);
        }
        if (this.parentScene.hud) {
          this.parentScene.hud.setSfxEnabled(enabled);
        }
      } else {
        sfxEnabled = !sfxEnabled;
        if (sfxBadge) {
          sfxBadge.textContent = sfxEnabled ? "ON" : "OFF";
          sfxBadge.classList.toggle("is-on", sfxEnabled);
        }
        this.persistFallbackSettings(musicEnabled, sfxEnabled);
      }
    });

    menuBtn.addEventListener("click", async () => {
      playClickSfx();
      this.destroyMenu();
      this.scene.stop();
      if (this.parentScene) {
        this.parentScene.scene.stop();
        if (typeof this.parentScene.saveProgress === "function") {
          await this.parentScene.saveProgress();
        }
      }
      window.returnToGunitaMenu?.();
    });

    // Keyboard controls for ESC and P key resume
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.pKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);

    this.handleShutdown = () => this.destroyMenu();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.handleShutdown);
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.escKey) || Phaser.Input.Keyboard.JustDown(this.pKey)) {
      this.destroyMenu();
      this.scene.stop();
      if (this.parentScene) {
        this.scene.resume(this.parentScene.scene.key);
      } else {
        this.scene.resume("CampoLunanScene");
      }
    }
  }

  persistFallbackSettings(musicEnabled, sfxEnabled) {
    try {
      const state = { musicEnabled, sfxEnabled, trackIndex: 0 };
      window.localStorage.setItem("gunita-audio-settings", JSON.stringify(state));
    } catch (e) {
      console.warn(e);
    }
  }

  destroyMenu() {
    if (this.root) {
      this.root.remove();
      this.root = null;
    }
  }
}