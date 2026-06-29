import { Router } from "express";
import supabase from "../supabase.js";
import { OpenAI } from "openai";
import { validatePlayer } from "../middleware/validatePlayer.js";

const router = Router();

// Fallback riddles if OpenAI is not configured or fails
const FALLBACK_RIDDLES = {
  fisherman: [
    { question: "I have a spine, but no bones. I have scales, but no skin. What am I?", answer: "fish" },
    { question: "I am a path that moves, but I have no feet. I carry boats but have no arms. What am I?", answer: "a river" },
    { question: "Thrown out when you need it, pulled back when you don't. What am I?", answer: "anchor" }
  ]
};

const getFallbackRiddles = (characterId, totalRiddles) => {
  const list = FALLBACK_RIDDLES[characterId] || [
    { question: "The more of them you take, the more you leave behind. What are they?", answer: "footsteps" },
    { question: "I have keys but no locks. I have space but no room. You can enter but can't go outside. What am I?", answer: "keyboard" },
    { question: "What has hands but cannot clap?", answer: "clock" }
  ];
  return list.slice(0, totalRiddles);
};

// POST /riddles/generate - Generate riddles on area enter
router.post("/generate", async (req, res) => {
  const { player_id, character_id, total_riddles } = req.body;
  const count = parseInt(total_riddles, 10) || 3;

  if (!player_id || !character_id) {
    return res.status(400).json({ error: "Missing required fields (player_id, character_id)" });
  }

  try {
    // 1. Verify player exists first
    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("id")
      .eq("id", player_id)
      .maybeSingle();

    if (playerError) throw playerError;
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    // 2. Check if riddles already exist for this player and character
    const { data: existingRiddles, error: fetchError } = await supabase
      .from("riddles")
      .select("id, order_index, question")
      .eq("player_id", player_id)
      .eq("character_id", character_id)
      .order("order_index", { ascending: true });

    if (fetchError) throw fetchError;

    if (existingRiddles && existingRiddles.length > 0) {
      return res.status(200).json({ riddles: existingRiddles });
    }

    // 3. Generate new riddles (OpenAI or Fallback)
    let riddlesList = [];
    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });

        const prompt = `You are a creative writer for a game about historical Filipino figures. 
Generate exactly ${count} unique riddles for the character "${character_id}". 
The riddles should relate to this character's historical background, profession, or folklore in the Philippines.
Your output must be strictly JSON in the following format:
{
  "riddles": [
    {
      "question": "The riddle question text.",
      "answer": "A short 1-3 word answer (case-insensitive)."
    }
  ]
}`;

        const aiResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "system", content: prompt }],
          response_format: { type: "json_object" }
        });

        const parsed = JSON.parse(aiResponse.choices[0].message.content);
        if (parsed && Array.isArray(parsed.riddles)) {
          riddlesList = parsed.riddles.slice(0, count);
        }
      } catch (aiErr) {
        console.warn("OpenAI riddle generation failed, falling back to local list:", aiErr.message);
        riddlesList = getFallbackRiddles(character_id, count);
      }
    } else {
      console.log("OPENAI_API_KEY is not set, using local fallback riddles.");
      riddlesList = getFallbackRiddles(character_id, count);
    }

    // Ensure we have enough riddles
    if (riddlesList.length === 0) {
      riddlesList = getFallbackRiddles(character_id, count);
    }

    // 4. Save to DB
    const riddlesToInsert = riddlesList.map((r, idx) => ({
      player_id,
      character_id,
      question: r.question,
      answer: r.answer,
      order_index: idx + 1
    }));

    const { data: insertedRiddles, error: insertError } = await supabase
      .from("riddles")
      .insert(riddlesToInsert)
      .select("id, order_index, question");

    if (insertError) throw insertError;

    // Ensure returned riddles are sorted by order_index
    insertedRiddles.sort((a, b) => a.order_index - b.order_index);

    res.status(200).json({ riddles: insertedRiddles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /riddles/answer - Validate player answer
router.post("/answer", async (req, res) => {
  const { riddle_id, player_answer } = req.body;

  if (!riddle_id || player_answer === undefined) {
    return res.status(400).json({ error: "Missing required fields (riddle_id, player_answer)" });
  }

  try {
    const { data: riddle, error } = await supabase
      .from("riddles")
      .select("answer")
      .eq("id", riddle_id)
      .maybeSingle();

    if (error) throw error;
    if (!riddle) {
      return res.status(404).json({ error: "Riddle not found" });
    }

    // Normalize answer checking
    const normalize = (str) => str.toLowerCase().trim().replace(/^(a|an|the)\s+/, "");
    const isCorrect = normalize(player_answer) === normalize(riddle.answer);

    res.status(200).json({ correct: isCorrect });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /riddles/:playerId - Clear riddles on death
router.delete("/:playerId", validatePlayer, async (req, res) => {
  const { playerId } = req.params;

  try {
    const { error } = await supabase
      .from("riddles")
      .delete()
      .eq("player_id", playerId);

    if (error) throw error;

    res.status(200).json({ message: "Riddles cleared successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
