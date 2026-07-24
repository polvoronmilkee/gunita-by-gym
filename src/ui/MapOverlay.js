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
    
    this.handleShutdown = () => this.destroy();
    scene.events.once("shutdown", this.handleShutdown);
    scene.events.once("destroy", this.handleShutdown);
  }

  show(areaName, x = 0, y = 0) {
    this.title.textContent = `${areaName} MAP`;
    this.updateLocation(x, y);
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
    if (this.root) {
      this.root.remove();
      this.root = null;
    }
  }
}
