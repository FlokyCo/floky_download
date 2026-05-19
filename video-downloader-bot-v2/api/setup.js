// api/setup.js
// Visit this URL once after deploying to register the webhook with Telegram
// Example: https://your-app.vercel.app/api/setup

module.exports = async function handler(req, res) {
  const token = process.env.BOT_TOKEN;
  const webhookUrl = process.env.WEBHOOK_URL; // e.g. https://your-app.vercel.app/api/webhook

  if (!token || !webhookUrl) {
    return res.status(400).json({
      ok: false,
      error: "BOT_TOKEN and WEBHOOK_URL env variables must be set.",
    });
  }

  const url = `https://api.telegram.org/bot${token}/setWebhook`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ["message"],
      drop_pending_updates: true,
    }),
  });

  const data = await response.json();

  if (data.ok) {
    res.status(200).json({
      ok: true,
      message: `✅ Webhook set to: ${webhookUrl}`,
      telegram_response: data,
    });
  } else {
    res.status(500).json({
      ok: false,
      message: "❌ Failed to set webhook",
      telegram_response: data,
    });
  }
}
