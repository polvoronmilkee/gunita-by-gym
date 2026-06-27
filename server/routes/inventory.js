import { Router } from "express";
import supabase from "../supabase.js";

const router = Router();

// Placeholder for GET /inventory/:playerId
router.get("/:playerId", async (req, res) => {
  res.status(200).json({ message: "Get inventory working" });
});

// Placeholder for POST /inventory/items
router.post("/items", async (req, res) => {
  res.status(200).json({ message: "Post inventory items working" });
});

// Placeholder for PATCH /inventory/centemos
router.patch("/centemos", async (req, res) => {
  res.status(200).json({ message: "Patch inventory centemos working" });
});

export default router;
