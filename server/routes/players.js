import { Router } from "express";
import supabase from "../supabase.js";

const router = Router();

// POST /players - Create a new player, gamestate, and inventory
router.post("/", async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    // 1. Check if username is already taken
    const { data: existingPlayer, error: fetchError } = await supabase
      .from("players")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (existingPlayer) {
      return res.status(409).json({ error: "Username already taken" });
    }

    // 2. Insert new player
    const { data: player, error: playerError } = await supabase
      .from("players")
      .insert({ username })
      .select()
      .single();

    if (playerError) throw playerError;

    // 3. Create inventory for the player (centemos defaults to 0 in schema)
    const { data: inventory, error: inventoryError } = await supabase
      .from("inventory")
      .insert({ player_id: player.id })
      .select()
      .single();

    if (inventoryError) throw inventoryError;

    // 4. Create gamestate for the player with default coordinates (320, 360)
    const { error: gamestateError } = await supabase
      .from("gamestate")
      .insert({
        player_id: player.id,
        current_world: "Lunan",
        current_area: "Campo Lunan",
        position_x: 320,
        position_y: 360
      });

    if (gamestateError) throw gamestateError;

    // 5. Return player and inventory details
    res.status(200).json({
      id: player.id,
      username: player.username,
      inventory_id: inventory.id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /players - Returning player login (GET /players?username=)
router.get("/", async (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ error: "Username is required as a query parameter" });
  }

  try {
    // 1. Fetch player
    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("id, username")
      .eq("username", username)
      .maybeSingle();

    if (playerError) throw playerError;
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    // 2. Fetch player's inventory
    const { data: inventory, error: inventoryError } = await supabase
      .from("inventory")
      .select("id")
      .eq("player_id", player.id)
      .maybeSingle();

    if (inventoryError) throw inventoryError;
    if (!inventory) {
      return res.status(404).json({ error: "Inventory not found for player" });
    }

    // 3. Return player and inventory details
    res.status(200).json({
      id: player.id,
      username: player.username,
      inventory_id: inventory.id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
