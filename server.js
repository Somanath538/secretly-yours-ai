const express = require("express");
const path = require("path");
const crypto = require("crypto");
const Database = require("better-sqlite3");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-this-password";

const db = new Database(process.env.DB_PATH || "messages.db");
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_name TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

const sessions = new Set();

function requireAdmin(req, res, next) {
  const token = req.get("x-admin-token");
  if (!token || !sessions.has(token)) return res.status(401).json({ error: "Unauthorized" });
  next();
}

app.post("/api/messages", (req, res) => {
  const sender = String(req.body.senderName || "").trim();
  const recipient = String(req.body.recipientName || "").trim();
  const message = String(req.body.message || "").trim();
  if (!sender || !recipient || !message) {
    return res.status(400).json({ error: "Please fill in all three fields." });
  }
  const result = db.prepare(`
    INSERT INTO messages (sender_name, recipient_name, message)
    VALUES (?, ?, ?)
  `).run(sender, recipient, message);
  res.json({ ok: true, id: result.lastInsertRowid });
});

app.post("/api/admin/login", (req, res) => {
  const password = String(req.body.password || "");
  const expected = Buffer.from(ADMIN_PASSWORD);
  const received = Buffer.from(password);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return res.status(401).json({ error: "Wrong password." });
  }
  const token = crypto.randomBytes(32).toString("hex");
  sessions.add(token);
  res.json({ ok: true, token });
});

app.post("/api/admin/logout", requireAdmin, (req, res) => {
  sessions.delete(req.get("x-admin-token"));
  res.json({ ok: true });
});

app.get("/api/admin/messages", requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT id, sender_name AS senderName,
           recipient_name AS recipientName,
           message, created_at AS createdAt
    FROM messages ORDER BY id DESC
  `).all();
  res.json(rows);
});

app.post("/api/admin/chat", requireAdmin, async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: "AI is not configured. Add OPENAI_API_KEY on the server." });
    }

    const question = String(req.body.question || "").trim();
    if (!question) return res.status(400).json({ error: "Ask the AI something." });

    const rows = db.prepare(`
      SELECT id, sender_name AS senderName,
             recipient_name AS recipientName,
             message, created_at AS createdAt
      FROM messages ORDER BY id DESC
    `).all();

    const context = rows.length
      ? rows.map((m, i) =>
          `MESSAGE ${i + 1}\nFrom: ${m.senderName}\nTo: ${m.recipientName}\nMessage: ${m.message}\nReceived: ${m.createdAt}`
        ).join("\n\n---\n\n")
      : "There are currently no messages.";

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.2",
      instructions:
        "You are the private AI assistant for a confession website. " +
        "You are speaking only to the authenticated site owner. " +
        "Answer questions using the supplied message vault. " +
        "Do not invent messages or facts. When quoting a message, preserve its wording. " +
        "Be warm, playful and concise. Never reveal the admin password or API key. " +
        "If asked for a summary, identify patterns carefully and label interpretations as interpretations.",
      input:
        "PRIVATE MESSAGE VAULT:\n\n" + context +
        "\n\nOWNER'S QUESTION:\n" + question
    });

    res.json({ ok: true, answer: response.output_text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "The AI had a tiny emotional breakdown. Try again." });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`Secretly Yours is running on http://localhost:${PORT}`));
