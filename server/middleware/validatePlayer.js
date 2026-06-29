import supabase from "../supabase.js";

export async function validatePlayer(req, res, next) {
  const playerId = req.params.playerId || req.body.player_id;
  
  if (!playerId) {
    return res.status(400).json({ error: "Player ID is required" });
  }
  
  try {
    const { data: player, error } = await supabase
      .from("players")
      .select("id")
      .eq("id", playerId)
      .maybeSingle();
      
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }
    
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
