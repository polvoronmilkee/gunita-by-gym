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
    this.modal.appendChild(this.titleContainer);
    this.root.appendChild(this.modal);
    
    const container = document.getElementById("game-container") || document.body;
    container.appendChild(this.root);
    
    this.handleShutdown = () => this.destroy();
    scene.events.once("shutdown", this.handleShutdown);
    scene.events.once("destroy", this.handleShutdown);
  }

  show(areaName) {
    this.title.textContent = `${areaName} MAP`;
    this.root.classList.remove("hidden");
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
