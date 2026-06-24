import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("Missing Supabase environment variables. Check your .env file.");
}

const supabase = createClient(supabaseUrl || "", supabaseKey || "");

app.use(cors());
app.use(express.json());

// API Routes
app.get("/api/status", (req, res) => {
  res.json({ status: "Server is running", timestamp: new Date() });
});

// Example route using Supabase
app.get("/api/data", async (req, res) => {
  try {
    // Example: const { data, error } = await supabase.from('your_table').select('*');
    res.json({ message: "Ready to connect to Supabase" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
