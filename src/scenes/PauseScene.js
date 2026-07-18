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
        <div class="pause-menu__inner">
          <h2 class="pause-menu__title">=== PAUSED ===</h2>
          <div class="pause-menu__buttons">
            <button class="pause-menu__btn" id="pm-resume">RESUME</button>
            <button class="pause-menu__btn" id="pm-memory">MEMORIES</button>
            <button class="pause-menu__btn" id="pm-music">MUSIC: ${musicEnabled ? "ON" : "OFF"}</button>
            <button class="pause-menu__btn" id="pm-sfx">SFX: ${sfxEnabled ? "ON" : "OFF"}</button>
            <button class="pause-menu__btn" id="pm-menu">MAIN MENU</button>
          </div>
          <div class="pause-menu__footer">PRESS ESC TO RESUME</div>
        </div>
      </div>
    `;

    container.appendChild(this.root);

    // Bind event listeners
    const resumeBtn = this.root.querySelector("#pm-resume");
    const memoryBtn = this.root.querySelector("#pm-memory");
    const musicBtn = this.root.querySelector("#pm-music");
    const sfxBtn = this.root.querySelector("#pm-sfx");
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

    resumeBtn.addEventListener("click", handleResume);

    memoryBtn.addEventListener("click", () => {
      playClickSfx();
      this.destroyMenu();
      this.scene.stop();
      if (this.parentScene) {
        this.parentScene.scene.pause();
        this.parentScene.scene.launch("MemoryScene", { parentScene: this.parentScene });
      } else {
        this.scene.launch("MemoryScene");
      }
    });

    musicBtn.addEventListener("click", () => {
      playClickSfx();
      if (this.parentScene && this.parentScene.audioManager) {
        const enabled = this.parentScene.audioManager.toggleMusic();
        musicBtn.textContent = `MUSIC: ${enabled ? "ON" : "OFF"}`;
        if (this.parentScene.hud) {
          this.parentScene.hud.setMusicEnabled(enabled);
        }
      } else {
        musicEnabled = !musicEnabled;
        musicBtn.textContent = `MUSIC: ${musicEnabled ? "ON" : "OFF"}`;
        this.persistFallbackSettings(musicEnabled, sfxEnabled);
      }
    });

    sfxBtn.addEventListener("click", () => {
      playClickSfx();
      if (this.parentScene && this.parentScene.audioManager) {
        const enabled = this.parentScene.audioManager.toggleSfx();
        sfxBtn.textContent = `SFX: ${enabled ? "ON" : "OFF"}`;
        if (this.parentScene.hud) {
          this.parentScene.hud.setSfxEnabled(enabled);
        }
      } else {
        sfxEnabled = !sfxEnabled;
        sfxBtn.textContent = `SFX: ${sfxEnabled ? "ON" : "OFF"}`;
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