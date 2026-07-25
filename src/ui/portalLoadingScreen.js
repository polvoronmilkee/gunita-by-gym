import "./portalLoadingScreen.css";

export class PortalLoadingScreen {
  constructor(options = {}) {
    this.titleText = options.title ?? "PORTADA";
    this.subtitleText = options.subtitle ?? "Entering Memory";
    this.hintText =
      options.hint ??
      "Crossing the veil between Campo Lunan and forgotten memories...";

    this.parent = options.parent ?? document.body;

    this.root = document.createElement("div");
    this.root.className = "gunita-portal-loading-screen";
    this.root.setAttribute("aria-live", "polite");
    this.root.setAttribute("aria-busy", "true");

    this.title = document.createElement("div");
    this.title.className = "gunita-portal-loading-screen__title";
    this.title.textContent = this.titleText;

    this.subtitle = document.createElement("div");
    this.subtitle.className = "gunita-portal-loading-screen__subtitle";
    this.subtitle.textContent = this.subtitleText;

    // Portal
    this.portal = document.createElement("div");
    this.portal.className = "gunita-portal-loading-screen__portal";

    this.outerRing = document.createElement("div");
    this.outerRing.className = "portal-ring outer";

    this.middleRing = document.createElement("div");
    this.middleRing.className = "portal-ring middle";

    this.innerRing = document.createElement("div");
    this.innerRing.className = "portal-ring inner";

    this.core = document.createElement("div");
    this.core.className = "portal-core";

    this.portal.append(
      this.outerRing,
      this.middleRing,
      this.innerRing,
      this.core
    );

    this.hint = document.createElement("div");
    this.hint.className = "gunita-portal-loading-screen__hint";
    this.hint.textContent = this.hintText;

    // Particles Container
    this.particlesContainer = document.createElement("div");
    this.particlesContainer.className = "portal-particles-container";
    
    for (let i = 0; i < 3; i++) {
      const layer = document.createElement("div");
      layer.className = "particle-layer";
      this.particlesContainer.appendChild(layer);
    }

    this.root.append(
      this.particlesContainer,
      this.title,
      this.subtitle,
      this.portal,
      this.hint
    );

    this.parent.appendChild(this.root);

    this.show();
  }

  setContent(options = {}) {
    if (options.title !== undefined) this.setTitle(options.title);
    if (options.subtitle !== undefined) this.setSubtitle(options.subtitle);
    if (options.hint !== undefined) this.setHint(options.hint);
  }

  setTitle(text) {
    this.title.textContent = text;
  }

  setSubtitle(text) {
    this.subtitle.textContent = text;
  }

  setHint(text) {
    this.hint.textContent = text;
  }

  show() {
    this.root.classList.remove("hidden");
    this.root.setAttribute("aria-busy", "true");
  }

  hide() {
    this.root.classList.add("hidden");
    this.root.setAttribute("aria-busy", "false");
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.root.remove();
  }
}