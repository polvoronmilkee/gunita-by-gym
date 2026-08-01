import "./artifactClaimModal.css";

export const ARTIFACT_STORIES = {
  "fish-basket": {
    title: "Fish Basket",
    tagline: '"A Life Remembered"',
    imageSrc: "src/assets/grave1-elements/fragments-uncovered/fish-basket.png",
    artifactText: "A simple woven basket carried by Mang Tomas every morning before sunrise. To others it was just a tool. To his family, it meant another day with food on the table.",
    storyText: "Mang Tomas believed that honest work was a promise made every dawn. Before the village awoke, he would sail into the sea carrying nothing but hope, returning only through patience, perseverance, and faith.",
    filipinoValueTitle: "TIYAGA • SIPAG • PAGMAMAHAL SA PAMILYA",
    filipinoValueSub: "(Perseverance, Hard Work, & Love for Family)",
    filipinoValueDesc: "Hard work and perseverance build a better life, not only for oneself, but for those waiting at home.",
    reflection: '"He worked not for himself, but for those waiting at home."'
  },
  "weather-warning-flag": {
    title: "Red Weather Warning Flag",
    tagline: '"A Warning From The Waves"',
    imageSrc: "src/assets/grave1-elements/fragments-uncovered/weather-flag-warning.png",
    artifactText: "A faded red warning flag once raised along the shore whenever storms approached. Though small, it carried the weight of every fisherman's life.",
    storyText: "The elders always watched the sky before anyone set sail. Long before radios and weather forecasts, the sea itself gave warnings through the winds, clouds, and the raising of the red flag. Those who respected these signs returned home. Those who ignored them often became stories whispered by future generations.\n\nMang Tomas knew what the flag meant. Yet on one fateful morning, duty to his family became heavier than fear of the sea.",
    filipinoValueTitle: "PAGGALANG SA KALIKASAN",
    filipinoValueSub: "(Respect for Nature)",
    filipinoValueDesc: "Nature provides life, but it also demands humility. Wisdom begins by knowing when not to fight against it.",
    reflection: '"The strongest fishermen are not those who conquer the sea, but those who know when to wait."'
  },
  "red-flag": {
    title: "Red Weather Warning Flag",
    tagline: '"A Warning From The Waves"',
    imageSrc: "src/assets/grave1-elements/fragments-uncovered/weather-flag-warning.png",
    artifactText: "A faded red warning flag once raised along the shore whenever storms approached. Though small, it carried the weight of every fisherman's life.",
    storyText: "The elders always watched the sky before anyone set sail. Long before radios and weather forecasts, the sea itself gave warnings through the winds, clouds, and the raising of the red flag. Those who respected these signs returned home. Those who ignored them often became stories whispered by future generations.\n\nMang Tomas knew what the flag meant. Yet on one fateful morning, duty to his family became heavier than fear of the sea.",
    filipinoValueTitle: "PAGGALANG SA KALIKASAN",
    filipinoValueSub: "(Respect for Nature)",
    filipinoValueDesc: "Nature provides life, but it also demands humility. Wisdom begins by knowing when not to fight against it.",
    reflection: '"The strongest fishermen are not those who conquer the sea, but those who know when to wait."'
  },
  "rosary": {
    title: "Rosary",
    tagline: '"Anchor Of Faith"',
    imageSrc: "src/assets/grave1-elements/fragments-uncovered/rosary.png",
    artifactText: "A worn wooden rosary polished by countless prayers before every voyage.",
    storyText: "Before stepping into his boat, Mang Tomas would quietly bow his head, hold his rosary, and whisper a prayer for calm seas, safe passage, and the family waiting for him at home.\n\nFor many Filipino fishermen, faith was never a guarantee that nothing would go wrong—it was the courage to continue despite uncertainty.\n\nHis greatest strength was not found in his hands, but in the hope he carried within his heart.",
    filipinoValueTitle: "PANANAMPALATAYA",
    filipinoValueSub: "(Faith and Trust in God)",
    filipinoValueDesc: "Faith is not believing that storms will never come. It is believing that hope remains even when they do.",
    reflection: '"Before every journey, he entrusted what he could not control."'
  },
  "daughters-drawing": {
    title: "Daughter's Drawing",
    tagline: '"Love Beyond The Waves"',
    imageSrc: "src/assets/grave1-elements/fragments-uncovered/daughters-drawing.png",
    artifactText: "A child's crayon drawing carefully folded with love, showing a happy family beneath a bright sun.",
    storyText: "To everyone else, it was only a piece of paper.\n\nTo Mang Tomas, it was a reminder of why he endured sleepless mornings, aching muscles, and dangerous seas.\n\nEvery wave he crossed was for the smiles waiting for him at home.\n\nEven after years had passed, the drawing remained untouched—not because it was valuable, but because it carried the love of a daughter who believed her father could always find his way home.",
    filipinoValueTitle: "PAGMAMAHAL SA PAMILYA",
    filipinoValueSub: "(Love for Family)",
    filipinoValueDesc: "The greatest treasures are rarely made of gold. They are the people who wait for us, believe in us, and remember us.",
    reflection: '"The sea gave him a livelihood, but his family gave him a reason to return."'
  }
};

function getArtifactData(key) {
  if (ARTIFACT_STORIES[key]) return ARTIFACT_STORIES[key];
  const cleanTitle = key ? key.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : "Memory Artifact";
  return {
    title: cleanTitle,
    tagline: '"A Restored Memory"',
    imageSrc: `src/assets/grave1-elements/fragments-uncovered/${key}.png`,
    artifactText: "An old artifact rediscovered amidst the echoes of time.",
    storyText: "Every artifact carries a slice of history, waiting for someone to remember the soul who left it behind.",
    filipinoValueTitle: "GUNITA AT PAG-ASA",
    filipinoValueSub: "(Memory & Hope)",
    filipinoValueDesc: "Remembering our past gives meaning to our present and lights our path forward.",
    reflection: '"To remember is to keep their legacy alive."'
  };
}

export function showArtifactClaimModal(artifactKey, onContinue, audioManager = null) {
  const data = getArtifactData(artifactKey);

  const overlay = document.createElement("div");
  overlay.className = "artifact-modal-overlay";

  const card = document.createElement("div");
  card.className = "artifact-modal-card";

  card.innerHTML = `
    <div class="artifact-modal__header">
      <div class="artifact-modal__badge">
        <span class="artifact-modal__badge-icon">❖</span>
        <span>MEMORY RESTORED</span>
        <span class="artifact-modal__badge-icon">❖</span>
      </div>
      <div class="artifact-modal__divider">
        <div class="artifact-modal__divider-line"></div>
        <span class="artifact-modal__divider-diamond">✦</span>
        <div class="artifact-modal__divider-line"></div>
      </div>
      <h1 class="artifact-modal__title">${data.title}</h1>
      <p class="artifact-modal__tagline">${data.tagline}</p>
    </div>

    <div class="artifact-modal-scroll-body">
      <div class="artifact-modal__hero">
        <div class="artifact-modal__img-container">
          <span class="artifact-modal__corner-accent artifact-modal__corner-accent--tl">❖</span>
          <span class="artifact-modal__corner-accent artifact-modal__corner-accent--tr">❖</span>
          <span class="artifact-modal__corner-accent artifact-modal__corner-accent--bl">❖</span>
          <span class="artifact-modal__corner-accent artifact-modal__corner-accent--br">❖</span>
          <img class="artifact-modal__img" src="${data.imageSrc}" alt="${data.title}" />
        </div>
      </div>

      <div class="artifact-modal__section artifact-modal__section--artifact">
        <div class="artifact-modal__section-label">❖ Artifact</div>
        <p class="artifact-modal__section-text">${data.artifactText}</p>
      </div>

      <div class="artifact-modal__section artifact-modal__section--story">
        <div class="artifact-modal__section-label">❖ Story</div>
        <p class="artifact-modal__section-text">${data.storyText}</p>
      </div>

      <div class="artifact-modal__value-card">
        <div class="artifact-modal__value-badge">❖ FILIPINO VALUE REFLECTED</div>
        <div class="artifact-modal__value-title">${data.filipinoValueTitle}</div>
        ${data.filipinoValueSub ? `<div class="artifact-modal__value-sub">${data.filipinoValueSub}</div>` : ''}
        <p class="artifact-modal__value-desc">${data.filipinoValueDesc}</p>
      </div>

      <div class="artifact-modal__reflection">
        <p class="artifact-modal__quote">${data.reflection}</p>
      </div>
    </div>

    <div class="artifact-modal__footer">
      <button class="artifact-modal__continue-btn" id="artifact-continue-btn">
        <span>✧</span>
        <span>CONTINUE</span>
        <span>✧</span>
      </button>
    </div>
  `;

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const continueBtn = card.querySelector("#artifact-continue-btn");
  if (continueBtn) {
    continueBtn.focus();
  }

  const cleanup = () => {
    document.removeEventListener("keydown", keydownHandler);
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  };

  let canClose = false;
  setTimeout(() => {
    canClose = true;
  }, 1500);

  const handleContinue = () => {
    if (!canClose) return;
    try {
      if (audioManager && typeof audioManager.playButtonSfx === "function") {
        audioManager.playButtonSfx();
      }
    } catch (e) {
      console.warn("Audio error in modal continue:", e);
    }
    cleanup();
    if (onContinue) onContinue();
  };

  const keydownHandler = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleContinue();
    }
  };

  document.addEventListener("keydown", keydownHandler);
  if (continueBtn) {
    continueBtn.addEventListener("click", handleContinue);
  }
}
