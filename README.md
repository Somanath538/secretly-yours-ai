# Secretly Yours 2.0 💌🤖

## What this version does

### Public
Share `/` with your group. Anyone can submit:
- Sender name
- Recipient name
- Unlimited-length message

### Private
Open `/admin.html` and log in with `ADMIN_PASSWORD`.
You get:
- Message vault
- Search
- Message count
- Recipient count
- AI chatbot that can answer questions about the stored messages

## Setup

Install Node.js 18+.

```bash
npm install
```

Copy `.env.example` to `.env` and set:

```text
OPENAI_API_KEY=your_key
ADMIN_PASSWORD=your_strong_password
```

The API key must remain on the server; do not put it in browser JavaScript. OpenAI recommends server-side environment variables for API keys. See the official docs:
https://platform.openai.com/docs/quickstart/make-your-first-api-request

Then:

```bash
npm start
```

Open:
- Public: http://localhost:3000/
- Private vault: http://localhost:3000/admin.html

## Production security

Before sharing publicly:
1. Use HTTPS.
2. Use a strong admin password.
3. Put the app behind a proper persistent database for production if your host does not provide persistent disk.
4. Add rate limiting / CAPTCHA to the public submission endpoint to reduce spam.
5. Consider replacing the simple in-memory admin session with a proper auth/session store for multi-instance hosting.
6. Tell submitters that their messages are stored and may be processed by the AI assistant.

## AI privacy

The chatbot sends the message vault plus your question to the configured AI provider. Only use this feature when you have the right to process the submitted messages.
