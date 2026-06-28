import { Router } from "express";
import supabase from "../supabase.js";

const router = Router();

// Placeholder for GET /riddles
router.get("/", async (req, res) => {
  res.status(200).json({ message: "Get riddles working" });
});

// Placeholder for GET /riddles/:id
router.get("/:id", async (req, res) => {
  res.status(200).json({ message: `Get riddle ${req.params.id} working` });
});

// Placeholder for POST /riddles/verify
router.post("/verify", async (req, res) => {
  res.status(200).json({ message: "Verify riddle answer working" });
});

export default router;
