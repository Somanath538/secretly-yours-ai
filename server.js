require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@libsql/client');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-this";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// CRITICAL FIX FOR BIGINT
BigInt.prototype.toJSON = function() { return Number(this); };

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

(async () => {
  await db.execute(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_name TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  console.log("Turso DB Connected!");
})();

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  console.log("Admin try with token:", token ? "present" : "missing");
  if (token !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized: Wrong password" });
  }
  next();
}

app.post('/api/messages', async (req, res) => {
  try {
    const { senderName, recipientName, message } = req.body;
    if (!senderName || !recipientName || !message) return res.status(400).json({ error: "All fields required" });
    const result = await db.execute({ sql: "INSERT INTO messages (sender_name, recipient_name, message) VALUES (?, ?, ?)", args: [senderName, recipientName, message] });
    res.json({ success: true, id: Number(result.lastInsertRowId) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to save" });
  }
});

app.get('/api/admin/messages', requireAdmin, async (req, res) => {
  try {
    const result = await db.execute("SELECT id, sender_name AS senderName, recipient_name AS recipientName, message, created_at AS createdAt FROM messages ORDER BY id DESC");
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch" });
  }
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
