import { Router } from "express";
import supabase from "../supabase.js";
import { validatePlayer } from "../middleware/validatePlayer.js";

const router = Router();

// GET /inventory/:playerId - Load inventory
router.get("/:playerId", validatePlayer, async (req, res) => {
  const { playerId } = req.params;

  try {
    // 1. Fetch player's inventory record (centemos)
    const { data: inventory, error: invError } = await supabase
      .from("inventory")
      .select("id, centemos")
      .eq("player_id", playerId)
      .maybeSingle();

    if (invError) throw invError;
    if (!inventory) {
      return res.status(404).json({ error: "Inventory not found" });
    }

    // 2. Fetch inventory items
    const { data: items, error: itemsError } = await supabase
      .from("inventory_items")
      .select("item_key, item_type, acquired_at")
      .eq("inventory_id", inventory.id);

    if (itemsError) throw itemsError;

    res.status(200).json({
      centemos: inventory.centemos,
      items: items || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /inventory/items - Add echo on area clear
router.post("/items", async (req, res) => {
  const { inventory_id, item_key, item_type } = req.body;
  
  if (!inventory_id || !item_key || !item_type) {
    return res.status(400).json({ error: "Missing required fields (inventory_id, item_key, item_type)" });
  }

  try {
    // 1. Check if the item already exists in this inventory
    const { data: existingItem, error: fetchError } = await supabase
      .from("inventory_items")
      .select("id")
      .eq("inventory_id", inventory_id)
      .eq("item_key", item_key)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (existingItem) {
      return res.status(409).json({ error: "Echo already collected" });
    }

    // 2. Insert item
    const { data: newItem, error: insertError } = await supabase
      .from("inventory_items")
      .insert({
        inventory_id,
        item_key,
        item_type
      })
      .select("id, item_key, item_type, acquired_at")
      .single();

    if (insertError) throw insertError;

    res.status(200).json(newItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /inventory/centemos - Update currency
router.patch("/centemos", async (req, res) => {
  const { inventory_id, centemos } = req.body;

  if (!inventory_id || centemos === undefined) {
    return res.status(400).json({ error: "Missing required fields (inventory_id, centemos)" });
  }

  const centemosVal = parseInt(centemos, 10);
  if (isNaN(centemosVal) || centemosVal < 0) {
    return res.status(400).json({ error: "Centemos must be a non-negative integer" });
  }

  try {
    const { data: updatedInventory, error: updateError } = await supabase
      .from("inventory")
      .update({ centemos: centemosVal })
      .eq("id", inventory_id)
      .select("id, centemos")
      .single();

    if (updateError) throw updateError;

    res.status(200).json(updatedInventory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
