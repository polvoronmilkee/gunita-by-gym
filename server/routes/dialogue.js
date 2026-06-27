import { Router } from "express";
import supabase from "../supabase.js";

const router = Router();

// Placeholder for POST /dialogue
router.post("/", async (req, res) => {
  res.status(200).json({ message: "Dialogue working" });
});

export default router;
