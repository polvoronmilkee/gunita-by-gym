export const AUDIO_SETTINGS = {
  storageKey: "gunita-audio-settings",
  defaults: {
    musicEnabled: true,
    sfxEnabled: true,
  },
  volume: {
    music: 0.45,
    button: 0.8,
    dash: 0.65,
  },
  tracks: [
    {
      key: "bg-1",
      path: new URL("../assets/sounds/music/bg-1.mp3", import.meta.url).href,
    },
    {
      key: "bg-2",
      path: new URL("../assets/sounds/music/bg-2.mp3", import.meta.url).href,
    },
    {
      key: "campo-lunan",
      path: new URL("../assets/sounds/music/campo_lunan.mp3", import.meta.url).href,
    },
    {
      key: "village-v1",
      path: new URL("../assets/sounds/music/village_v1.mp3", import.meta.url).href,
    },
    {
      key: "forest-2",
      path: new URL("../assets/sounds/music/forest_2.mp3", import.meta.url).href,
    },
    {
      key: "chaotic-fragment",
      path: new URL("../assets/sounds/music/chaotic_fragment_1.mp3", import.meta.url).href,
    },
    {
      key: "fish-basket-boss",
      path: new URL("../assets/sounds/music/fish_basket_BOSS.mp3", import.meta.url).href,
    },
    {
      key: "storm-boss",
      path: new URL("../assets/sounds/music/storm_BOSSV2.mp3", import.meta.url).href,
    },
    {
      key: "rosary-boss",
      path: new URL("../assets/sounds/music/rosary_BOSS.mp3", import.meta.url).href,
    },
    {
      key: "fishermans-last-goodbye",
      path: new URL("../assets/sounds/music/fishermans_last_goodbye.mp3", import.meta.url).href,
    },
    {
      key: "daughters-letter-boss",
      path: new URL("../assets/sounds/music/daughters_letter_BOSS.mp3", import.meta.url).href,
    },
  ],
  sfx: {
    button: {
      key: "sfx-button",
      path: new URL(
        "../assets/sounds/sound-effects/button.mp3",
        import.meta.url,
      ).href,
    },
    dash: {
      key: "sfx-dash",
      path: new URL("../assets/sounds/sound-effects/dash.mp3", import.meta.url)
        .href,
    },
    rainAndThunder: {
      key: "sfx-rain-thunder",
      path: new URL(
        "../assets/sounds/sound-effects/rain-and-thunder.mp3",
        import.meta.url,
      ).href,
    },
  },
};
