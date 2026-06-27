import { Router } from "express";
import supabase from "../supabase.js";

const router = Router();

// Placeholder for GET /gamestate/:playerId
router.get("/:playerId", async (req, res) => {
  res.status(200).json({ message: "Get gamestate working" });
});

// Placeholder for PATCH /gamestate/:playerId
router.patch("/:playerId", async (req, res) => {
  res.status(200).json({ message: "Patch gamestate working" });
});

export default router;
