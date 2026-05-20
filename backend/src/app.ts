import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pollRoutes from "./routes/pollRoutes";

// Load environment variables
dotenv.config();

const app = express();

// Configure Middlewares
app.use(cors({
  origin: "http://localhost:5173", // Allow requests from our frontend development dev server
  credentials: true
}));

app.use(express.json());

// Routes
app.use("/api/polls", pollRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

export default app;
