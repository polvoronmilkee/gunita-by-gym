import "./mapOverlay.css";

export class MapOverlay {
  constructor(scene) {
    this.scene = scene;
    
    this.root = document.createElement("div");
    this.root.className = "map-overlay hidden";
    
    this.modal = document.createElement("div");
    this.modal.className = "map-modal";
    
    this.titleContainer = document.createElement("div");
    this.titleContainer.className = "map-title-container";
    
    this.title = document.createElement("h2");
    this.title.textContent = "AREA MAP";
    
    this.titleContainer.appendChild(this.title);
    
    // Location display container (positioned at top right of the map modal box)
    this.locationBadge = document.createElement("div");
    this.locationBadge.className = "map-location-badge";
    this.locationBadge.innerHTML = `<span class="label">POS:</span> <span class="coords">X: 0 | Y: 0</span>`;
    
    this.modal.appendChild(this.titleContainer);
    this.modal.appendChild(this.locationBadge);

    this.root.appendChild(this.modal);
    
    const container = document.getElementById("game-container") || document.body;
    container.appendChild(this.root);
    
    this.handleResize = () => {
      if (!this.root.classList.contains("hidden")) {
        this.positionModal();
      }
    };
    window.addEventListener("resize", this.handleResize);

    this.handleShutdown = () => this.destroy();
    scene.events.once("shutdown", this.handleShutdown);
    scene.events.once("destroy", this.handleShutdown);
  }

  positionModal() {
    if (!this.scene || !this.scene.game || !this.scene.game.canvas) return;

    const canvas = this.scene.game.canvas;
    const canvasRect = canvas.getBoundingClientRect();
    const container = this.root.offsetParent || document.body;
    const containerRect = container.getBoundingClientRect();

    const scaleX = canvasRect.width / (this.scene.scale.width || 1280);
    const scaleY = canvasRect.height / (this.scene.scale.height || 720);

    const camera = this.scene.minimapCamera;
    const camX = camera ? camera.x : (1280 - 500) / 2;
    const camY = camera ? camera.y : (720 - 400) / 2;
    const camW = camera ? camera.width : 500;
    const camH = camera ? camera.height : 400;

    const modalLeft = (canvasRect.left - containerRect.left) + camX * scaleX;
    const modalTop = (canvasRect.top - containerRect.top) + camY * scaleY;
    const modalWidth = camW * scaleX;
    const modalHeight = camH * scaleY;

    this.modal.style.position = "absolute";
    this.modal.style.left = `${modalLeft}px`;
    this.modal.style.top = `${modalTop}px`;
    this.modal.style.width = `${modalWidth}px`;
    this.modal.style.height = `${modalHeight}px`;
    this.modal.style.boxSizing = "border-box";
  }

  show(areaName, x = 0, y = 0) {
    this.title.textContent = `${areaName} MAP`;
    this.updateLocation(x, y);
    this.positionModal();
    this.root.classList.remove("hidden");
  }

  updateLocation(x, y) {
    if (this.locationBadge) {
      const coordsElem = this.locationBadge.querySelector(".coords");
      if (coordsElem) {
        coordsElem.textContent = `X: ${Math.round(x)} | Y: ${Math.round(y)}`;
      }
    }
  }

  hide() {
    this.root.classList.add("hidden");
  }

  destroy() {
    if (this.handleResize) {
      window.removeEventListener("resize", this.handleResize);
    }
    if (this.root) {
      this.root.remove();
      this.root = null;
    }
  }
}
