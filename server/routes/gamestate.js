import { Router } from "express";
import supabase from "../supabase.js";
import { validatePlayer } from "../middleware/validatePlayer.js";

const router = Router();

// GET /gamestate/:playerId - Load game state
router.get("/:playerId", validatePlayer, async (req, res) => {
  const { playerId } = req.params;

  try {
    const { data: gamestate, error } = await supabase
      .from("gamestate")
      .select("current_world, current_area, position_x, position_y")
      .eq("player_id", playerId)
      .maybeSingle();

    if (error) throw error;
    if (!gamestate) {
      return res.status(404).json({ error: "Gamestate not found" });
    }

    res.status(200).json(gamestate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /gamestate/:playerId - Save game state
router.patch("/:playerId", validatePlayer, async (req, res) => {
  const { playerId } = req.params;
  const { current_world, current_area, position_x, position_y } = req.body;

  try {
    const { data: gamestate, error } = await supabase
      .from("gamestate")
      .update({
        current_world,
        current_area,
        position_x,
        position_y,
        updated_at: new Date().toISOString()
      })
      .eq("player_id", playerId)
      .select("current_world, current_area, position_x, position_y, updated_at")
      .single();

    if (error) throw error;

    res.status(200).json(gamestate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
