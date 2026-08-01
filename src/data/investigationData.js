export const investigationPhases = {
  1: {
    targetNpc: "npc-old-fisherman",
    areaName: "Forest",
    areaCenter: { x: 533, y: 1888 },
    areaRadius: 250,
    objective: "Learn where the Old Fisherman is.",
    hint: "Interact with NPCs to learn<br/>where the Old Fisherman is.<br/><br/>Check the map by pressing TAB.",
    clueNpcs: [
      { key: "man-searching", id: "inv_1_wrong1", speaker: "Woodsman", isCorrect: false, dialogue: "I've been looking for good lumber, but I haven't seen an old fisherman in this forest. The sea is far from here.", offsetX: 98, offsetY: -98 },
      { key: "man-talking", id: "inv_1_wrong2", speaker: "Traveler", isCorrect: false, dialogue: "A fisherman? Here? You must be lost. There are no fish among the trees.", offsetX: 11, offsetY: 134 },
      { key: "man-searching", id: "inv_1_correct", speaker: "Villager", isCorrect: true, dialogue: "Ah, the old fisherman! He never leaves the sea. You'll find him waiting by the North Eastern Pier.", offsetX: -210, offsetY: -55 }
    ],
    revealObjective: "Find the Old Fisherman.",
    revealHint: "He awaits at the North<br/>Eastern Pier."
  },
  2: {
    targetNpc: "npc-young-fisherman",
    areaName: "Beach",
    areaCenter: { x: 2215, y: 2007 },
    areaRadius: 330,
    objective: "Learn where the Young Fisherman is.",
    hint: "Interact with NPCs to learn<br/>where the Young Fisherman is.<br/><br/>Check the map by pressing TAB.",
    clueNpcs: [
      { key: "girl-waving-front", id: "inv_2_wrong1", speaker: "Village Girl", isCorrect: false, dialogue: "I'm just watching the waves! I haven't seen a young fisherman today.", offsetX: -254, offsetY: 50 },
      { key: "boy-waving-front", id: "inv_2_wrong2", speaker: "Village Boy", isCorrect: false, dialogue: "Fisherman? I don't know any. I'm just playing by the water!", offsetX: 289, offsetY: 37 },
      { key: "man-talking", id: "inv_2_correct", speaker: "Sailor", isCorrect: true, dialogue: "The young fisherman? Yes, he went South-East to check the warning flags. Better hurry before the storm.", offsetX: 52, offsetY: 94 }
    ],
    revealObjective: "Find the Young Fisherman.",
    revealHint: "He went South-East to<br/>check the warning flags."
  },
  3: {
    targetNpc: "npc-sick-wife",
    areaName: "Market",
    areaCenter: { x: 2810, y: 1185 },
    areaRadius: 350,
    objective: "Learn where Mang Tomas' Wife is.",
    hint: "Interact with NPCs to learn<br/>where his wife is.<br/><br/>Check the map by pressing TAB.",
    clueNpcs: [
      { key: "villager-woman", id: "inv_3_wrong1", speaker: "Market Vendor", isCorrect: false, dialogue: "Mang Tomas' wife? She hasn't been to the market in a long time. She's been very sick.", offsetX: -283, offsetY: 104 },
      { key: "woman-searching", id: "inv_3_wrong2", speaker: "Villager", isCorrect: false, dialogue: "I'm looking for herbs... perhaps for Mang Tomas' wife? But I don't know where she is.", offsetX: 308, offsetY: -101 },
      { key: "man-talking", id: "inv_3_correct", speaker: "Merchant", isCorrect: true, dialogue: "Mang Tomas' wife? She is resting in their family home. It's the house with the wooden stairs nearby.", offsetX: -92, offsetY: -88 }
    ],
    revealObjective: "Speak with Mang Tomas'<br/>wife.",
    revealHint: "She is resting in the<br/>family home."
  },
  4: {
    targetNpc: "npc-daughter",
    areaName: "School",
    areaCenter: { x: 1815, y: 1698 },
    areaRadius: 280,
    objective: "Learn where Mang Tomas' Daughter is.",
    hint: "Interact with NPCs to learn<br/>where the daughter is.<br/><br/>Check the map by pressing TAB.",
    clueNpcs: [
      { key: "boy-jumping-front", id: "inv_4_wrong1", speaker: "School Boy", isCorrect: false, dialogue: "Yay! Recess! I haven't seen her, she usually draws by herself.", offsetX: 125, offsetY: -62 },
      { key: "girl-waving-front", id: "inv_4_wrong2", speaker: "School Girl", isCorrect: false, dialogue: "Hi! We're playing! She didn't want to join us today.", offsetX: 54, offsetY: 77 },
      { key: "girl-jumping-front", id: "inv_4_correct", speaker: "Playmate", isCorrect: true, dialogue: "Mang Tomas' daughter? She took her crayons and went to the playground just outside the school!", offsetX: -24, offsetY: -244 }
    ],
    revealObjective: "Find Mang Tomas'<br/>daughter.",
    revealHint: "She is drawing in the<br/>playground."
  },
  5: {
    targetNpc: "npc-mang-tomas",
    areaName: "Abandoned Village",
    areaCenter: { x: 3635, y: 2727 },
    areaRadius: 260,
    objective: "Learn where Mang Tomas is.",
    hint: "Interact with NPCs to learn<br/>where Mang Tomas is.<br/><br/>Check the map by pressing TAB.",
    clueNpcs: [
      { key: "woman-searching", id: "inv_5_wrong1", speaker: "Lost Soul", isCorrect: false, dialogue: "So many memories shattered... I cannot find my own, let alone Mang Tomas.", offsetX: -84, offsetY: -145 },
      { key: "man-searching", id: "inv_5_wrong2", speaker: "Wanderer", isCorrect: false, dialogue: "This village is empty. The ones who stayed are just waiting to be forgotten. I haven't seen Mang Tomas.", offsetX: -211, offsetY: 67 },
      { key: "woman-searching", id: "inv_5_correct", speaker: "Old Villager", isCorrect: true, dialogue: "Mang Tomas? He waits where the light used to guide him. He is at the lighthouse in the abandoned village.", offsetX: 18, offsetY: 184 }
    ],
    revealObjective: "Find Mang Tomas.",
    revealHint: "He can be found in the<br/>lighthouse of the abandoned<br/>village."
  }
};
