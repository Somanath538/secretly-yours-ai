require('dotenv').config();
const express = require("express");
const path = require("path");
const crypto = require("crypto");
const OpenAI = require("openai");
const { createClient } = require("@libsql/client");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-this";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Create table
(async () => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_name TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  console.log("Turso DB Connected!");
})();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function requireAdmin(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (token !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

app.post("/api/messages", async (req, res) => {
  const { senderName, recipientName, message } = req.body;
  if (!senderName || !recipientName || !message) {
    return res.status(400).json({ error: "Missing fields" });
  }
  const result = await db.execute({
    sql: "INSERT INTO messages (sender_name, recipient_name, message) VALUES (?, ?, ?)",
    args: [senderName, recipientName, message],
  });
  res.json({ success: true, id: result.lastInsertRowid });
});

app.get("/api/admin/messages", requireAdmin, async (req, res) => {
  const result = await db.execute("SELECT id, sender_name AS senderName, recipient_name AS recipientName, message, created_at AS createdAt FROM messages ORDER BY id DESC");
  res.json(result.rows);
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));