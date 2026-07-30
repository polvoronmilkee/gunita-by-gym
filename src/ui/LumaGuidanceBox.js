import "./lumaGuidanceBox.css";

export class LumaGuidanceBox {
  constructor() {
    this.container = document.createElement("div");
    this.container.className = "luma-guidance-container";

    // Header
    const header = document.createElement("div");
    header.className = "luma-guidance-header";
    
    const starLeft = document.createElement("span");
    starLeft.className = "star";
    starLeft.textContent = "✦";
    
    const title = document.createElement("h2");
    title.textContent = "LUMA'S GUIDANCE";
    
    const starRight = document.createElement("span");
    starRight.className = "star";
    starRight.textContent = "✦";

    header.appendChild(starLeft);
    header.appendChild(title);
    header.appendChild(starRight);

    // Separator
    const separator = document.createElement("div");
    separator.className = "luma-guidance-separator";

    // Objective
    this.objectiveContainer = document.createElement("div");
    this.objectiveContainer.className = "luma-guidance-objective";
    
    const diamond = document.createElement("span");
    diamond.className = "diamond";
    diamond.textContent = "♦";
    
    this.objectiveText = document.createElement("p");
    
    this.objectiveContainer.appendChild(diamond);
    this.objectiveContainer.appendChild(this.objectiveText);

    // Divider
    this.divider = document.createElement("div");
    this.divider.className = "luma-guidance-divider-line";

    // Hint / Quote
    this.hintText = document.createElement("div");
    this.hintText.className = "luma-guidance-hint";

    this.container.appendChild(header);
    this.container.appendChild(separator);
    this.container.appendChild(this.objectiveContainer);
    this.container.appendChild(this.divider);
    this.container.appendChild(this.hintText);

    document.getElementById("game-container")?.appendChild(this.container) || document.body.appendChild(this.container);
  }

  update(objectiveHTML, hintTextHTML = "") {
    this.objectiveText.innerHTML = objectiveHTML;
    
    if (hintTextHTML) {
      this.hintText.innerHTML = hintTextHTML;
      this.divider.style.display = "block";
      this.hintText.style.display = "block";
    } else {
      this.divider.style.display = "none";
      this.hintText.style.display = "none";
    }
  }

  show() {
    // Slight delay to allow CSS transitions if appended recently
    requestAnimationFrame(() => {
      this.container.classList.add("visible");
    });
  }

  hide() {
    this.container.classList.remove("visible");
  }
  
  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
