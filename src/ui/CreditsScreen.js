import "./creditsScreen.css";

/**
 * CreditsScreen — Full-screen movie-style auto-scrolling credits overlay.
 * 
 * Flow:
 * 1. Fades to black
 * 2. Shows "Thank You For Playing Our Demo" for a few seconds
 * 3. Auto-scrolls credits (title, art cards, team, special thanks)
 * 4. When scroll finishes, auto-transitions to Campo Lunan
 */
export class CreditsScreen {
  constructor({ onFinished, audioManager }) {
    this.onFinished = onFinished;
    this.audioManager = audioManager;
    this.overlay = null;
    this.destroyed = false;
    this._build();
  }

  _build() {
    // ---- Root overlay ----
    this.overlay = document.createElement("div");
    this.overlay.className = "credits-overlay";

    // ---- "Thank You" splash ----
    this.thankYou = document.createElement("div");
    this.thankYou.className = "credits-thank-you";
    this.thankYou.innerHTML = `
      <h1>THANK YOU FOR<br/>PLAYING OUR DEMO</h1>
      <p>Gunita — A Story of Memory and Legacy</p>
    `;
    this.overlay.appendChild(this.thankYou);

    // ---- Scrolling credits viewport ----
    this.viewport = document.createElement("div");
    this.viewport.className = "credits-scroll-viewport";

    this.track = document.createElement("div");
    this.track.className = "credits-scroll-track";

    // Build all credit sections
    this._buildCreditsContent();

    this.viewport.appendChild(this.track);
    this.overlay.appendChild(this.viewport);

    // Mount to DOM
    const container = document.getElementById("game-container") || document.body;
    container.appendChild(this.overlay);
  }

  _buildCreditsContent() {
    // ---- GUNITA Title ----
    this._addSection(`
      <h1 class="credits-title-gunita">GUNITA</h1>
      <div class="credits-divider"></div>
      <p class="credits-subtitle">A Story of Memory and Legacy</p>
      <p class="credits-tagline">"Every memory we carry forward is a gift to the future."</p>
    `);

    // ---- Art Card: Fish Basket ----
    this._addArtCard(
      "src/assets/grave1-elements/bullet-scenes/fish-basket.png",
      "The Fish Basket — Symbol of Honest Work"
    );

    // ---- Art Card: Rosary ----
    this._addArtCard(
      "src/assets/grave1-elements/bullet-scenes/rosary.png",
      "The Rosary — Symbol of Faith"
    );

    // ---- Art Card: Red Warning Flag ----
    this._addArtCard(
      "src/assets/grave1-elements/bullet-scenes/red-warning-flag.png",
      "The Warning Flag — Respect for Nature"
    );

    // ---- Art Card: Daughter's Drawing ----
    this._addArtCard(
      "src/assets/grave1-elements/bullet-scenes/daughters-drawing.png",
      "The Daughter's Drawing — Love of Family"
    );

    this._addDividerWide();

    // ---- Art Card: Final Conclusion ----
    this._addArtCard(
      "src/assets/grave1-elements/bullet-scenes/final-conclusion.png",
      "The Last Fisherman — Mang Tomas"
    );

    this._addDividerWide();

    // ---- TEAM ----
    this._addSection(`
      <h2 class="credits-team-header">✦ THE TEAM ✦</h2>

      <div class="credits-member">
        <p class="credits-member-name">Gian Gamir Umadhay</p>
        <p class="credits-member-role">Lead Developer &amp; Sound Designer</p>
      </div>

      <div class="credits-member">
        <p class="credits-member-name">Sophia Marielle Mendoza</p>
        <p class="credits-member-role">Storyboard &amp; UI/UX Designer</p>
      </div>

      <div class="credits-member">
        <p class="credits-member-name">Yna Chloe Veñegas</p>
        <p class="credits-member-role">Art &amp; Sprite Artist</p>
      </div>
    `);

    this._addDividerWide();

    // ---- SPECIAL THANKS ----
    this._addSection(`
      <h2 class="credits-thanks-header">✦ SPECIAL THANKS ✦</h2>
      <p class="credits-thanks-item">Our Professors & Mentors</p>
      <p class="credits-thanks-item">The Phaser.js Community</p>
      <p class="credits-thanks-item">Filipino Heritage & Culture</p>
      <p class="credits-thanks-item">And to every player who carries<br/>these memories forward</p>
    `);

    this._addDividerWide();

    // ---- BUILT WITH ----
    this._addSection(`
      <h2 class="credits-thanks-header">✦ BUILT WITH ✦</h2>
      <p class="credits-thanks-item">Phaser 3 Game Engine</p>
      <p class="credits-thanks-item">Tiled Map Editor</p>
      <p class="credits-thanks-item">Vite Build System</p>
    `);

    this._addDividerWide();

    // ---- FINAL MESSAGE ----
    this._addSection(`
      <div class="credits-final">
        <p class="credits-final-msg">"Ang hindi marunong lumingon sa pinanggalingan<br/>ay hindi makakarating sa paroroonan."</p>
        <div class="credits-divider"></div>
        <p class="credits-final-sub">Those who do not look back to where they came from<br/>will never reach their destination.</p>
      </div>
    `);

    // ---- GUNITA logo again at the end ----
    this._addSection(`
      <h1 class="credits-title-gunita" style="font-size: 1.8rem;">GUNITA</h1>
      <p class="credits-tagline">© 2026</p>
    `);
  }

  _addSection(html) {
    const section = document.createElement("div");
    section.className = "credits-section";
    section.innerHTML = html;
    this.track.appendChild(section);
  }

  _addArtCard(src, caption) {
    const section = document.createElement("div");
    section.className = "credits-section";
    section.innerHTML = `
      <div class="credits-art-card">
        <img src="${src}" alt="${caption}" loading="lazy" />
        <div class="art-caption">${caption}</div>
      </div>
    `;
    this.track.appendChild(section);
  }

  _addDividerWide() {
    const div = document.createElement("div");
    div.className = "credits-divider-wide";
    this.track.appendChild(div);
  }

  /**
   * Start the credits sequence.
   */
  start() {
    if (this.destroyed) return;

    // Play finale music
    if (this.audioManager) {
      try {
        this.audioManager.stopMusic();
        this.audioManager.playTrack("finale-fisherman");
      } catch (e) {
        console.warn("[CreditsScreen] Audio error:", e);
      }
    }

    // Step 1: Fade overlay to black
    requestAnimationFrame(() => {
      this.overlay.classList.add("visible");
    });

    // Step 2: Show "Thank You" splash after fade completes
    setTimeout(() => {
      if (this.destroyed) return;
      this.thankYou.classList.add("visible");
    }, 1800);

    // Step 3: Fade out "Thank You", then start scrolling credits
    setTimeout(() => {
      if (this.destroyed) return;
      this.thankYou.classList.remove("visible");
    }, 6000);

    setTimeout(() => {
      if (this.destroyed) return;
      this._startScroll();
    }, 8000);
  }

  _startScroll() {
    this.viewport.classList.add("visible");

    // Calculate the total scroll distance
    // Need to wait a frame for layout
    requestAnimationFrame(() => {
      const trackHeight = this.track.scrollHeight;
      const viewportHeight = this.viewport.clientHeight;
      const scrollDistance = trackHeight;

      // Scroll speed: ~40px per second (slow, cinematic)
      const durationSeconds = scrollDistance / 40;

      this.track.style.setProperty("--scroll-distance", `-${scrollDistance}px`);
      this.track.style.animation = `credits-scroll-up ${durationSeconds}s linear forwards`;

      // When scroll finishes, auto-transition
      this.track.addEventListener("animationend", () => {
        this._finish();
      }, { once: true });
    });
  }

  _finish() {
    if (this.destroyed) return;

    // Fade out overlay
    this.overlay.style.transition = "opacity 2s ease-out";
    this.overlay.style.opacity = "0";

    setTimeout(() => {
      this.destroy();
      if (this.onFinished) this.onFinished();
    }, 2200);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
  }
}
