const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();

const requiredEnv = ["MONGODB_URI", "JWT_SECRET"];
const missingEnv = requiredEnv.filter((k) => !process.env[k]);
if (missingEnv.length > 0) {
  console.error(`Missing required env vars: ${missingEnv.join(", ")}`);
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: "1mb" }));

const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS origin not allowed"));
    },
  })
);

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, required: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["majdi", "ali"], default: "ali" },
    agents: [{ type: String }],
  },
  { timestamps: true }
);

const CardSchema = new mongoose.Schema(
  {
    agentName: { type: String, required: true, trim: true },
    cardNo: { type: Number, required: true, min: 1 },
    month: { type: String, required: true },
    date: { type: String, default: "" },
    auditor: { type: String, default: "" },
    ticketId: { type: String, default: "" },
    ticketType: { type: String, default: "Inquiry" },
    channel: { type: String, default: "Live Chat" },
    criticals: { type: Object, default: {} },
    criticalNotes: { type: Object, default: {} },
    scores: { type: Object, default: {} },
    notes: { type: Object, default: {} },
    scorePercent: { type: Number, default: 100 },
    createdBy: { type: String, default: "" },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

CardSchema.index({ agentName: 1, cardNo: 1, month: 1 }, { unique: true });

const User = mongoose.model("User", UserSchema);
const Card = mongoose.model("Card", CardSchema);

function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function isValidMonth(month) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month || "");
}

function sanitizeText(value, max = 250) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

function validateLoginPayload(body) {
  const username = sanitizeText(body?.username, 50);
  const password = String(body?.password ?? "");
  if (!username || !password || password.length > 200) return null;
  return { username, password };
}

function validateCardPayload(body) {
  const agentName = sanitizeText(body?.agentName, 120);
  const month = sanitizeText(body?.month, 7);
  const cardNo = Number(body?.cardNo);
  if (!agentName || !isValidMonth(month) || !Number.isInteger(cardNo) || cardNo < 1 || cardNo > 100) {
    return null;
  }

  return {
    agentName,
    month,
    cardNo,
    date: sanitizeText(body?.date, 20),
    auditor: sanitizeText(body?.auditor, 80),
    ticketId: sanitizeText(body?.ticketId, 120),
    ticketType: sanitizeText(body?.ticketType, 80),
    channel: sanitizeText(body?.channel, 40),
    criticals: typeof body?.criticals === "object" && body?.criticals ? body.criticals : {},
    criticalNotes: typeof body?.criticalNotes === "object" && body?.criticalNotes ? body.criticalNotes : {},
    scores: typeof body?.scores === "object" && body?.scores ? body.scores : {},
    notes: typeof body?.notes === "object" && body?.notes ? body.notes : {},
    scorePercent: Number(body?.scorePercent ?? 100),
  };
}

async function seedUsers() {
  if (process.env.NODE_ENV === "production") return;
  const allowSeed = process.env.SEED_DEFAULT_USERS === "true";
  if (!allowSeed) return;

  const count = await User.countDocuments();
  if (count === 0) {
    await User.create([
      {
        username: "majdi",
        password: await bcrypt.hash("majdi2025", 10),
        role: "majdi",
        agents: ["Abdulrahman Al Ahmadi", "Ahmad Badokhen", "Ahmad Thawban", "Hawa Baomer"],
      },
      {
        username: "ali",
        password: await bcrypt.hash("ali2025", 10),
        role: "ali",
        agents: ["Maher Bawafed", "Mohammad Al Yazidi", "Salman Basawad", "Seham Alakbari", "Somayya Al Akbari"],
      },
    ]);
    console.log("Users seeded");
  }
}

seedUsers().catch((err) => console.error("Seed error:", err));

app.post("/api/login", async (req, res) => {
  try {
    const payload = validateLoginPayload(req.body);
    if (!payload) return res.status(400).json({ error: "Invalid login payload" });

    const user = await User.findOne({ username: payload.username });
    if (!user || !(await bcrypt.compare(payload.password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role, agents: user.agents },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    return res.json({ token, username: user.username, role: user.role, agents: user.agents });
  } catch (error) {
    return res.status(500).json({ error: "Login failed" });
  }
});

app.get("/api/agents", auth, (req, res) => {
  res.json({ agents: req.user.agents || [] });
});

app.post("/api/cards", auth, async (req, res) => {
  try {
    const payload = validateCardPayload(req.body);
    if (!payload) return res.status(400).json({ error: "Invalid card payload" });

    const card = await Card.findOneAndUpdate(
      { agentName: payload.agentName, cardNo: payload.cardNo, month: payload.month },
      { ...payload, createdBy: req.user.username, updatedAt: new Date() },
      { upsert: true, new: true, runValidators: true }
    );
    return res.json(card);
  } catch (error) {
    return res.status(500).json({ error: "Failed to save card" });
  }
});

app.get("/api/cards/:agentName/:month", auth, async (req, res) => {
  try {
    const agentName = sanitizeText(decodeURIComponent(req.params.agentName), 120);
    const month = sanitizeText(req.params.month, 7);
    if (!isValidMonth(month)) return res.status(400).json({ error: "Invalid month format" });
    if (!req.user.agents.includes(agentName) && req.user.role !== "majdi") {
      return res.status(403).json({ error: "Access denied" });
    }
    const cards = await Card.find({ agentName, month }).sort("cardNo");
    return res.json(cards);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch cards" });
  }
});

app.get("/api/dashboard/:month", auth, async (req, res) => {
  try {
    const month = sanitizeText(req.params.month, 7);
    if (!isValidMonth(month)) return res.status(400).json({ error: "Invalid month format" });

    const agents = req.user.role === "majdi" ? req.user.agents : req.user.agents;
    const summary = await Card.aggregate([
      { $match: { agentName: { $in: agents }, month } },
      {
        $group: {
          _id: "$agentName",
          avgScore: { $avg: "$scorePercent" },
          cardCount: { $sum: 1 },
          cards: { $push: { cardNo: "$cardNo", score: "$scorePercent", ticketId: "$ticketId", date: "$date" } },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    return res.json(summary);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch dashboard" });
  }
});

app.get("/", (req, res) => res.json({ status: "Jisr QA API running" }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
