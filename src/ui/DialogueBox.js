import Phaser from "phaser";
import "./dialogueBox.css";

export class DialogueBox {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.onComplete = options.onComplete ?? (() => {});

    // Create the container (root) element
    this.root = document.createElement("div");
    this.root.className = "gunita-dialogue";

    // Create the inner double border decoration
    this.innerBorder = document.createElement("div");
    this.innerBorder.className = "gunita-dialogue__inner";

    // Speaker Name Tag (placed outside/on the border like retro RPGs)
    this.nameTag = document.createElement("div");
    this.nameTag.className = "gunita-dialogue__name";
    this.nameTag.textContent = options.speaker ?? "Vino";

    // Dialogue text element
    this.messageText = document.createElement("div");
    this.messageText.className = "gunita-dialogue__message";
    this.messageText.textContent = options.text ?? "This is a placeholder dialogue text.";

    // Pulse next indicator
    this.nextIndicator = document.createElement("div");
    this.nextIndicator.className = "gunita-dialogue__next";
    this.nextIndicator.innerHTML = "&#9662;"; // small downward triangle

    // Assemble structure
    this.innerBorder.append(this.nameTag, this.messageText, this.nextIndicator);
    this.root.append(this.innerBorder);

    // Mount it directly into the game container to avoid camera scaling/positioning issues
    const container = document.getElementById("game-container") || document.body;
    container.appendChild(this.root);

    // Add click event to advance dialogue
    this.root.addEventListener("click", () => {
      this.onComplete();
    });

    // Cleanup listeners
    this.handleShutdown = () => this.destroy();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown);
    scene.events.once(Phaser.Scenes.Events.DESTROY, this.handleShutdown);
  }

  showText(speaker, text, onComplete = null) {
    this.nameTag.textContent = speaker;
    this.messageText.textContent = text;
    this.root.style.display = "block";
    if (onComplete) {
      this.onComplete = onComplete;
    }
  }

  hide() {
    this.root.style.display = "none";
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.domElement?.destroy();
    this.root?.remove();
  }
}
