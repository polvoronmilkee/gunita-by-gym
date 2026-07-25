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
    vinoMove: 0.55,
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
    vinoMove: {
      key: "sfx-vino-move",
      path: new URL(
        "../assets/sounds/sound-effects/vino-move.mp3",
        import.meta.url,
      ).href,
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
