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
    lumaSwish: {
      key: "sfx-luma-swish",
      path: new URL(
        "../assets/sounds/sound-effects/luma-swish.mp3",
        import.meta.url,
      ).href,
    },
  },
  dialogueVoices: [
    // {
    //   key: "dialogue-vino",
    //   path: new URL(
    //     "../assets/sounds/sound-effects/dialogue-sounds/vino.mp3",
    //     import.meta.url,
    //   ).href,
    // },
    {
      key: "dialogue-old-fisherman",
      path: new URL(
        "../assets/sounds/sound-effects/dialogue-sounds/old_fisherman.mp3",
        import.meta.url,
      ).href,
    },
    {
      key: "dialogue-young-fisherman",
      path: new URL(
        "../assets/sounds/sound-effects/dialogue-sounds/young_fisherman.mp3",
        import.meta.url,
      ).href,
    },
    {
      key: "dialogue-oldwife",
      path: new URL(
        "../assets/sounds/sound-effects/dialogue-sounds/oldwife.mp3",
        import.meta.url,
      ).href,
    },
    {
      key: "dialogue-debt-collector",
      path: new URL(
        "../assets/sounds/sound-effects/dialogue-sounds/debt_collector_v1.mp3",
        import.meta.url,
      ).href,
    },
    {
      key: "dialogue-old-daughter",
      path: new URL(
        "../assets/sounds/sound-effects/dialogue-sounds/old_daughter.mp3",
        import.meta.url,
      ).href,
    },
    {
      key: "dialogue-young-girl",
      path: new URL(
        "../assets/sounds/sound-effects/dialogue-sounds/young_girl.mp3",
        import.meta.url,
      ).href,
    },
    {
      key: "dialogue-sick-wife",
      path: new URL(
        "../assets/sounds/sound-effects/dialogue-sounds/sick_wife.mp3",
        import.meta.url,
      ).href,
    },
    {
      key: "dialogue-young-kid",
      path: new URL(
        "../assets/sounds/sound-effects/dialogue-sounds/young_kid.mp3",
        import.meta.url,
      ).href,
    },
  ],
};
