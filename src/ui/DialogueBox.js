import Phaser from "phaser";
import "./dialogueBox.css";

const PORTRAIT_MAP = {
  "OLD FISHERMAN": "src/assets/grave1-elements/characters/old-fisherman-id.png",
  "FISHERMAN": "src/assets/grave1-elements/characters/old-fisherman-id.png",
  "YOUNG FISHERMAN": "src/assets/grave1-elements/characters/young-fisherman.png",
  "OLD WIFE": "src/assets/grave1-v2/more-characters/sick-wife.png",
  "SICK WIFE": "src/assets/grave1-v2/more-characters/sick-wife.png",
  "DEBT COLLECTOR": "src/assets/grave1-elements/characters/debt-collector.png",
  "DAUGHTER": "src/assets/grave1-elements/characters/school-girl.png",
  "VILLAGER": "src/assets/grave1-elements/characters/random-guy.png",
};

export class DialogueBox {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.onComplete = options.onComplete ?? (() => {});

    // Determine Theme (default to obsidian in CampoLunanScene or when requested)
    const isObsidian = options.theme === "obsidian" || 
                       options.theme === "campo-lunan" || 
                       scene?.scene?.key === "CampoLunanScene";

    // Root container
    this.root = document.createElement("div");
    this.root.className = `gunita-dialogue ${isObsidian ? "gunita-dialogue--obsidian" : ""}`;

    // Gothic motifs for obsidian theme
    if (isObsidian) {
      const leftMotif = document.createElement("div");
      leftMotif.className = "gunita-dialogue__gothic-motif gunita-dialogue__gothic-motif--left";
      leftMotif.textContent = "🦇";
      const rightMotif = document.createElement("div");
      rightMotif.className = "gunita-dialogue__gothic-motif gunita-dialogue__gothic-motif--right";
      rightMotif.textContent = "🦇";
      this.root.appendChild(leftMotif);
      this.root.appendChild(rightMotif);
    }

    // Corner structures (Rivets and Anchors)
    const corners = [
      { class: "tl", anchor: false },
      { class: "tr", anchor: true },
      { class: "bl", anchor: false },
      { class: "br", anchor: true }
    ];
    corners.forEach(c => {
      const cornerEl = document.createElement("div");
      cornerEl.className = `gunita-dialogue__corner gunita-dialogue__corner--${c.class}`;
      const rivet = document.createElement("span");
      rivet.className = "gunita-dialogue__rivet";
      cornerEl.appendChild(rivet);
      if (c.anchor && !isObsidian) {
        const anchor = document.createElement("span");
        anchor.className = "gunita-dialogue__anchor";
        anchor.textContent = "⚓";
        cornerEl.appendChild(anchor);
      }
      this.root.appendChild(cornerEl);
    });

    // Speaker Name Badge
    this.nameContainer = document.createElement("div");
    this.nameContainer.className = "gunita-dialogue__name-container";
    this.nameTag = document.createElement("div");
    this.nameTag.className = "gunita-dialogue__name";
    this.nameTag.textContent = options.speaker ?? "Vino";
    this.nameContainer.appendChild(this.nameTag);
    this.root.appendChild(this.nameContainer);

    // Inner Container
    this.innerBorder = document.createElement("div");
    this.innerBorder.className = "gunita-dialogue__inner";

    // Portrait Container
    this.portraitFrame = document.createElement("div");
    this.portraitFrame.className = "gunita-dialogue__portrait-frame";
    this.portraitImg = document.createElement("img");
    this.portraitImg.className = "gunita-dialogue__portrait-img";
    this.portraitFrame.appendChild(this.portraitImg);
    this.innerBorder.appendChild(this.portraitFrame);

    // Content Box
    this.contentBox = document.createElement("div");
    this.contentBox.className = "gunita-dialogue__content";

    // Message Text
    this.messageText = document.createElement("div");
    this.messageText.className = "gunita-dialogue__message";
    this.contentBox.appendChild(this.messageText);

    this.innerBorder.appendChild(this.contentBox);

    // Next Indicator
    this.nextIndicator = document.createElement("div");
    this.nextIndicator.className = "gunita-dialogue__next";
    this.nextIndicator.textContent = "◆";
    this.innerBorder.appendChild(this.nextIndicator);

    this.root.appendChild(this.innerBorder);

    // Mount to DOM
    const container = document.getElementById("game-container") || document.body;
    container.appendChild(this.root);

    this.isTyping = false;
    this.fullFormattedText = "";
    this.typewriterInterval = null;

    // Initial setup
    if (options.text) {
      this.showText(options.speaker ?? "Vino", options.text ?? "", this.onComplete, options.portrait, options.theme);
    }

    // Click handler: if typing, complete instantly; if finished, trigger onComplete
    const handleAdvance = (e) => {
      if (this.root.style.display === "none") return;
      if (e) e.stopPropagation();
      if (this.isTyping) {
        this.finishTypewriter();
      } else {
        if (this.onComplete) this.onComplete();
      }
    };

    this.root.addEventListener("click", handleAdvance);

    // Global Key Listener for Space / Enter / E when dialogue is active
    this.keydownHandler = (e) => {
      if (this.root.style.display === "none") return;
      if (e.key === " " || e.key === "Enter" || e.key === "e" || e.key === "E") {
        e.preventDefault();
        e.stopPropagation();
        handleAdvance();
      }
    };
    document.addEventListener("keydown", this.keydownHandler);

    // Scene cleanup
    this.handleShutdown = () => this.destroy();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown);
    scene.events.once(Phaser.Scenes.Events.DESTROY, this.handleShutdown);
  }

  showText(speaker, text, onComplete = null, portrait = null, theme = null) {
    this.nameTag.textContent = speaker || "Vino";

    const isObsidian = theme === "obsidian" || 
                       theme === "campo-lunan" || 
                       this.root.classList.contains("gunita-dialogue--obsidian");

    // Resolve portrait
    let portraitSrc = portrait;
    if (!portraitSrc && speaker) {
      const cleanSpeaker = speaker.toUpperCase();
      for (const [key, path] of Object.entries(PORTRAIT_MAP)) {
        if (cleanSpeaker.includes(key)) {
          portraitSrc = path;
          break;
        }
      }
    }

    if (portraitSrc) {
      this.portraitImg.src = portraitSrc;
      // Portraits disabled per user request
      this.portraitFrame.style.display = "none";
    } else {
      this.portraitFrame.style.display = "none";
    }

    // Format text with keyword highlights (*keyword* or common keywords)
    let formattedText = (text || "").replace(/\*(.*?)\*/g, '<span class="highlight">$1</span>');

    // Auto-highlight key phrases in ethereal blue/cyan
    const blueKeywords = ["Fisherman", "Mangingisda", "Grave I", "Grave 1", "Campo Lunan", "The Last Fisherman", "Memory"];
    blueKeywords.forEach(kw => {
      const regex = new RegExp(`\\b(${kw})\\b`, "g");
      formattedText = formattedText.replace(regex, `<span class="highlight-blue">$1</span>`);
    });

    this.fullFormattedText = formattedText;
    this.root.style.display = "block";
    if (onComplete) {
      this.onComplete = onComplete;
    }

    this.startTypewriter(formattedText);
  }

  startTypewriter(formattedText) {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }

    // Split HTML string by tags so we don't break HTML tags during letter-by-letter output
    const tokens = formattedText.split(/(<[^>]*>)/g);
    let totalChars = 0;
    tokens.forEach(tok => {
      if (!tok.startsWith("<")) {
        totalChars += tok.length;
      }
    });

    if (totalChars === 0) {
      this.messageText.innerHTML = formattedText;
      this.isTyping = false;
      this.nextIndicator.style.opacity = "1";
      return;
    }

    this.isTyping = true;
    this.nextIndicator.style.opacity = "0.3";
    let currentCharCount = 0;

    const renderStep = () => {
      let output = "";
      let remaining = currentCharCount;

      for (let i = 0; i < tokens.length; i++) {
        const tok = tokens[i];
        if (tok.startsWith("<")) {
          output += tok;
        } else {
          if (remaining >= tok.length) {
            output += tok;
            remaining -= tok.length;
          } else if (remaining > 0) {
            output += tok.substring(0, remaining);
            remaining = 0;
          }
        }
      }

      this.messageText.innerHTML = output;

      if (currentCharCount >= totalChars) {
        this.finishTypewriter();
      } else {
        currentCharCount++;
      }
    };

    renderStep();
    this.typewriterInterval = setInterval(renderStep, 18);
  }

  finishTypewriter() {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }
    this.messageText.innerHTML = this.fullFormattedText;
    this.isTyping = false;
    this.nextIndicator.style.opacity = "1";
  }

  hide() {
    this.finishTypewriter();
    this.root.style.display = "none";
    this.onComplete = null; // Clear callback to prevent stale spacebar spamming
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.finishTypewriter();
    if (this.keydownHandler) {
      document.removeEventListener("keydown", this.keydownHandler);
    }
    this.root?.remove();
  }
}
