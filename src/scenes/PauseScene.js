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
            <div class="pm-btn-icon">🕮</div>
            <div class="pm-btn-body">
              <span class="pm-btn-title">SURVIVAL GUIDE</span>
              <span class="pm-btn-desc">Review lore, controls & game mechanics</span>
            </div>
          </button>

          <button class="pause-menu__btn" id="pm-music">
            <div class="pm-btn-icon">♫</div>
            <div class="pm-btn-body">
              <span class="pm-btn-title">BACKGROUND MUSIC</span>
              <span class="pm-btn-desc">Toggle ambience and soundtrack</span>
            </div>
            <span class="pm-status-badge ${musicEnabled ? "is-on" : ""}" id="pm-music-badge">${musicEnabled ? "ON" : "OFF" }</span>
          </button>

          <button class="pause-menu__btn" id="pm-sfx">
            <div class="pm-btn-icon">🕪</div>
            <div class="pm-btn-body">
              <span class="pm-btn-title">SOUND EFFECTS</span>
              <span class="pm-btn-desc">Toggle interaction and audio feedback</span>
            </div>
            <span class="pm-status-badge ${sfxEnabled ? "is-on" : ""}" id="pm-sfx-badge">${sfxEnabled ? "ON" : "OFF"}</span>
          </button>

          <button class="pause-menu__btn" id="pm-menu">
            <div class="pm-btn-icon">𖠿</div>
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
      if (this.root) {
        this.root.style.display = "none";
      }

      const isBulletHell = Boolean(
        this.parentScene && (this.parentScene.arena || this.parentScene.crystalEnemy || this.parentScene.soul)
      );

      const finishResume = () => {
        this.destroyMenu();
        this.scene.stop();
        if (this.parentScene) {
          if (this.parentScene.input && this.parentScene.input.keyboard) {
            this.parentScene.input.keyboard.resetKeys();
          }
          this.scene.resume(this.parentScene.scene.key);
          if (this.parentScene.physics && typeof this.parentScene.physics.resume === "function") {
            this.parentScene.physics.resume();
          }
        } else {
          this.scene.resume("CampoLunanScene");
        }
      };

      if (!isBulletHell) {
        finishResume();
        return;
      }

      const countdowns = ["3", "2", "1", "GO!"];
      let countIndex = 0;

      // Check if parent scene has an arena (bullet hell)
      let cx = 640;
      let cy = 360;
      if (this.parentScene && this.parentScene.arena && typeof this.parentScene.arena.x === "number" && typeof this.parentScene.arena.w === "number") {
        cx = this.parentScene.arena.x + this.parentScene.arena.w / 2;
        cy = this.parentScene.arena.y + this.parentScene.arena.h / 2;
      }

      // Create a premium retro countdown text
      const countdownText = this.add.text(cx, cy, "3", {
        font: "bold 96px 'Courier New', Courier, monospace",
        fill: "#f7e8c3",
        stroke: "#9c6c28",
        strokeThickness: 8
      }).setOrigin(0.5);

      countdownText.setShadow(3, 3, 'rgba(0, 0, 0, 0.6)', 2, false, true);

      const runCount = () => {
        if (countIndex < countdowns.length) {
          countdownText.setText(countdowns[countIndex]);
          countdownText.setScale(0.5);
          countdownText.setAlpha(0);

          this.tweens.add({
            targets: countdownText,
            scaleX: 1.2,
            scaleY: 1.2,
            alpha: 1,
            duration: 250,
            yoyo: true,
            hold: 500,
            ease: "Back.easeOut",
            onComplete: () => {
              countIndex++;
              setTimeout(runCount, 250);
            }
          });
          if (this.parentScene && this.parentScene.audioManager) {
            this.parentScene.audioManager.playHoverSfx?.();
          }
        } else {
          countdownText.destroy();
          finishResume();
        }
      };

      runCount();
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
      
      // Add loading state
      const titleSpan = menuBtn.querySelector(".pm-btn-title");
      if (titleSpan) {
        titleSpan.textContent = "SAVING...";
      }
      menuBtn.style.pointerEvents = "none";
      menuBtn.style.opacity = "0.7";
      
      if (this.parentScene) {
        if (typeof this.parentScene.saveProgress === "function") {
          await this.parentScene.saveProgress();
        }
        this.parentScene.scene.stop();
      }
      
      this.destroyMenu();
      this.scene.stop();
      window.returnToGunitaMenu?.();
    });

    // Global keyboard listener on window for 100% reliable input
    this.handleKeyDown = (e) => {
      if (!this.canInput) return;
      const key = e.key.toUpperCase();

      if (key === "ESCAPE" || key === "P") {
        e.preventDefault();
        e.stopPropagation();
        this.menuItems[0]?.click(); // Simulate clicking resume
        return;
      }

      if (key === "ARROWUP" || key === "W") {
        e.preventDefault();
        e.stopPropagation();
        this.selectedIndex--;
        if (this.selectedIndex < 0) this.selectedIndex = this.menuItems.length - 1;
        this.updateMenuSelection();
        if (this.parentScene && this.parentScene.audioManager) this.parentScene.audioManager.playHoverSfx?.();
      } else if (key === "ARROWDOWN" || key === "S") {
        e.preventDefault();
        e.stopPropagation();
        this.selectedIndex++;
        if (this.selectedIndex >= this.menuItems.length) this.selectedIndex = 0;
        this.updateMenuSelection();
        if (this.parentScene && this.parentScene.audioManager) this.parentScene.audioManager.playHoverSfx?.();
      } else if (key === "ENTER" || key === " " || key === "SPACE" || key === "SPACEBAR") {
        e.preventDefault();
        e.stopPropagation();
        this.menuItems[this.selectedIndex]?.click();
      }
    };

    window.addEventListener("keydown", this.handleKeyDown);

    // Blur any focused DOM element (like the pause button) so focus returns to the window
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }

    this.menuItems = [resumeBtn, guideBtn, musicBtn, sfxBtn, menuBtn];
    this.selectedIndex = 0;
    
    // Add hover listeners to sync index if mouse is used
    this.menuItems.forEach((btn, index) => {
      if (btn) {
        btn.addEventListener("pointerenter", () => {
          this.selectedIndex = index;
          this.updateMenuSelection();
        });
      }
    });
    
    this.updateMenuSelection();

    this.handleShutdown = () => this.destroyMenu();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.handleShutdown);

    this.canInput = false;
    setTimeout(() => {
      this.canInput = true;
    }, 200);
  }

  updateMenuSelection() {
    this.menuItems.forEach((btn, index) => {
      if (!btn) return;
      if (index === this.selectedIndex) {
        btn.classList.add("selected");
        btn.style.borderColor = "#f7e8c3";
        btn.style.color = "#ffffff";
        btn.style.backgroundColor = "#9c6c28";
      } else {
        btn.classList.remove("selected");
        btn.style.borderColor = "";
        btn.style.color = "";
        btn.style.backgroundColor = "";
      }
    });
  }

  update() {
    // Handled via window keydown listener
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
    if (this.handleKeyDown) {
      window.removeEventListener("keydown", this.handleKeyDown);
      this.handleKeyDown = null;
    }
    if (this.root) {
      this.root.remove();
      this.root = null;
    }
  }
}