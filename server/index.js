import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Import Routes
import playersRouter from "./routes/players.js";
import gamestateRouter from "./routes/gamestate.js";
import inventoryRouter from "./routes/inventory.js";
import riddlesRouter from "./routes/riddles.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// Health Check Endpoint
app.get("/", (req, res) => {
  res.status(200).json({ status: "Server is running", timestamp: new Date() });
});

// Mount Routes
app.use("/players", playersRouter);
app.use("/gamestate", gamestateRouter);
app.use("/inventory", inventoryRouter);
app.use("/riddles", riddlesRouter);

// Start Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
