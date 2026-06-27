import { Router } from "express";
import supabase from "../supabase.js";

const router = Router();

// Placeholder for POST /players
router.post("/", async (req, res) => {
  res.status(200).json({ message: "Players route working" });
});

export default router;
