# 🎬 Video Downloader Telegram Bot

A simple Telegram bot that downloads videos from **YouTube**, **Instagram**, **TikTok**, and **Twitter/X** — deployed as a serverless function on Vercel.

---

## How It Works

- Uses **Cobalt API** (`cobalt.tools`) — free, no API key required
- Runs as a **Vercel serverless function** with a Telegram webhook
- Supports: YouTube (+ Shorts), Instagram (Reels, posts), TikTok, Twitter/X

---

## 🚀 Deployment Steps

### 1. Create Your Bot

1. Open Telegram and message **@BotFather**
2. Send `/newbot` and follow the prompts
3. Copy your **bot token** (looks like `123456:ABCdef...`)

---

### 2. Deploy to Vercel

#### Option A — Vercel CLI (recommended)

```bash
npm i -g vercel      # install CLI if not already
vercel               # login and deploy
```

Follow the prompts. When asked about settings, use defaults.

#### Option B — GitHub + Vercel Dashboard

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Deploy

---

### 3. Set Environment Variables

In your Vercel project dashboard → **Settings → Environment Variables**, add:

| Key | Value |
|-----|-------|
| `BOT_TOKEN` | Your token from BotFather |
| `WEBHOOK_URL` | `https://YOUR-APP.vercel.app/api/webhook` |

Replace `YOUR-APP` with your actual Vercel subdomain.

Then **redeploy** so the variables take effect.

---

### 4. Register the Webhook

Visit this URL in your browser (just once):

```
https://YOUR-APP.vercel.app/api/setup
```

You should see:
```json
{ "ok": true, "message": "✅ Webhook set to: https://..." }
```

That's it! Your bot is live. 🎉

---

## 🧪 Testing

Send your bot any of these and it should reply with the video:

- `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- `https://www.tiktok.com/@user/video/...`
- `https://www.instagram.com/reel/...`

---

## 📁 Project Structure

```
├── api/
│   ├── webhook.js   # Telegram webhook handler (main bot logic)
│   └── setup.js     # One-time webhook registration endpoint
├── vercel.json      # Vercel config (30s timeout for downloads)
├── package.json
└── .env.example     # Copy to .env.local for local dev
```

---

## ⚠️ Limitations

- Telegram bots can only send videos up to **50MB**. Larger videos will be sent as a direct download link instead.
- Cobalt API is a free public service — occasional rate limits may occur.
- Private Instagram posts require login and are not supported.
