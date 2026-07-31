import "./loadingScreen.css";

export class LoadingScreen {
  constructor(options = {}) {
    this.titleText = options.title ?? "Loading";
    this.subtitleText = options.subtitle ?? "Preparing...";
    this.hintText = options.hint ?? "Please wait";
    this.parent = options.parent ?? document.body;

    this.root = document.createElement("div");
    this.root.className = "gunita-loading-screen";
    this.root.setAttribute("aria-live", "polite");
    this.root.setAttribute("aria-busy", "true");

    this.title = document.createElement("div");
    this.title.className = "gunita-loading-screen__title";
    this.title.textContent = this.titleText;

    this.subtitle = document.createElement("div");
    this.subtitle.className = "gunita-loading-screen__subtitle";
    this.subtitle.textContent = this.subtitleText;

    this.bar = document.createElement("div");
    this.bar.className = "gunita-loading-screen__bar";
    this.bar.setAttribute("aria-hidden", "true");

    this.hint = document.createElement("div");
    this.hint.className = "gunita-loading-screen__hint";
    this.hint.textContent = this.hintText;

    this.root.append(this.title, this.subtitle, this.bar, this.hint);
    this.parent.appendChild(this.root);
    this.show();
  }

  setContent(options = {}) {
    if (options.title !== undefined) {
      this.setTitle(options.title);
    }

    if (options.subtitle !== undefined) {
      this.setSubtitle(options.subtitle);
    }

    if (options.hint !== undefined) {
      this.setHint(options.hint);
    }
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
    this.root.style.display = "flex";
    this.root.classList.remove("hidden");
    this.root.setAttribute("aria-busy", "true");
  }

  hide() {
    this.root.classList.add("hidden");
    this.root.setAttribute("aria-busy", "false");
    setTimeout(() => {
      if (this.root && this.root.classList.contains("hidden")) {
        this.root.style.display = "none";
      }
    }, 320);
  }

  destroy() {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.root?.remove();
  }
}