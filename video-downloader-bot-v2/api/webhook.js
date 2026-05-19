// api/webhook.js
// Telegram bot webhook handler — deployed on Vercel serverless

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

// Cobalt API — free, no key needed, supports YouTube/Instagram/TikTok
const COBALT_API = "https://cobalt.tools/api/json";

// Detect which platform the link belongs to
function detectPlatform(url) {
  if (/youtube\.com|youtu\.be/.test(url)) return "YouTube";
  if (/instagram\.com/.test(url)) return "Instagram";
  if (/tiktok\.com/.test(url)) return "TikTok";
  if (/twitter\.com|x\.com/.test(url)) return "Twitter/X";
  return null;
}

// Extract first URL from a message
function extractUrl(text) {
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}

// Call Cobalt API to get the direct download link
async function getDownloadUrl(url) {
  const res = await fetch(COBALT_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      url,
      vCodec: "h264",
      vQuality: "720",
      aFormat: "mp3",
      isAudioOnly: false,
      disableMetadata: false,
    }),
  });

  if (!res.ok) throw new Error(`Cobalt API error: ${res.status}`);
  return await res.json();
}

// Send a text message to the user
async function sendMessage(chatId, text, replyToMessageId = null) {
  const body = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };
  if (replyToMessageId) body.reply_to_message_id = replyToMessageId;

  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Send a video by URL to the user
async function sendVideo(chatId, videoUrl, caption, replyToMessageId = null) {
  const body = {
    chat_id: chatId,
    video: videoUrl,
    caption,
    parse_mode: "HTML",
    supports_streaming: true,
  };
  if (replyToMessageId) body.reply_to_message_id = replyToMessageId;

  const res = await fetch(`${TELEGRAM_API}/sendVideo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}

// Send an audio file (for audio-only responses)
async function sendAudio(chatId, audioUrl, caption, replyToMessageId = null) {
  const body = {
    chat_id: chatId,
    audio: audioUrl,
    caption,
    parse_mode: "HTML",
  };
  if (replyToMessageId) body.reply_to_message_id = replyToMessageId;

  await fetch(`${TELEGRAM_API}/sendAudio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Send a "typing..." action so user sees the bot is working
async function sendChatAction(chatId, action = "upload_video") {
  await fetch(`${TELEGRAM_API}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action }),
  });
}

// Handle /start command
async function handleStart(chatId, firstName) {
  const text =
    `👋 Hey <b>${firstName}</b>! I'm your video downloader bot.\n\n` +
    `Just send me a link from:\n` +
    `▶️ YouTube\n` +
    `📸 Instagram\n` +
    `🎵 TikTok\n` +
    `🐦 Twitter / X\n\n` +
    `And I'll download the video for you! 🚀`;
  await sendMessage(chatId, text);
}

// Handle /help command
async function handleHelp(chatId) {
  const text =
    `<b>How to use:</b>\n\n` +
    `1. Copy a video link from YouTube, Instagram, TikTok, or Twitter\n` +
    `2. Paste it here and send\n` +
    `3. I'll fetch and send you the video\n\n` +
    `<b>Supported platforms:</b>\n` +
    `▶️ YouTube (including Shorts)\n` +
    `📸 Instagram (Reels, posts)\n` +
    `🎵 TikTok\n` +
    `🐦 Twitter / X\n\n` +
    `⚠️ Note: Videos over 50MB may not send due to Telegram limits.`;
  await sendMessage(chatId, text);
}

// Main message handler
async function handleMessage(message) {
  const chatId = message.chat.id;
  const text = message.text || "";
  const messageId = message.message_id;
  const firstName = message.from?.first_name || "there";

  // Handle commands
  if (text.startsWith("/start")) return handleStart(chatId, firstName);
  if (text.startsWith("/help")) return handleHelp(chatId);

  // Extract URL from message
  const url = extractUrl(text);
  if (!url) {
    await sendMessage(
      chatId,
      "Please send me a video link from YouTube, Instagram, TikTok, or Twitter. 🔗",
      messageId
    );
    return;
  }

  const platform = detectPlatform(url);
  if (!platform) {
    await sendMessage(
      chatId,
      "❌ Unsupported link. I only support YouTube, Instagram, TikTok, and Twitter/X.",
      messageId
    );
    return;
  }

  // Let user know we're working on it
  await sendMessage(chatId, `⏳ Fetching your ${platform} video...`, messageId);
  await sendChatAction(chatId, "upload_video");

  try {
    const result = await getDownloadUrl(url);

    // Cobalt returns different statuses: stream, redirect, picker, error
    if (result.status === "error" || result.status === "rate-limit") {
      const errMsg =
        result.status === "rate-limit"
          ? "⚠️ Rate limit reached. Please wait a moment and try again."
          : `❌ Couldn't download this video.\n<i>${result.text || "Unknown error"}</i>`;
      await sendMessage(chatId, errMsg, messageId);
      return;
    }

    // "picker" means multiple items (e.g. Instagram carousel) — send first one
    if (result.status === "picker") {
      const first = result.picker?.[0];
      if (!first?.url) {
        await sendMessage(chatId, "❌ Couldn't extract video from this post.", messageId);
        return;
      }
      const caption = `✅ Downloaded from ${platform}`;
      const sent = await sendVideo(chatId, first.url, caption, messageId);
      if (!sent) {
        await sendMessage(
          chatId,
          `✅ Here's your direct download link:\n${first.url}`,
          messageId
        );
      }
      return;
    }

    // "stream" or "redirect" — single video URL
    const downloadUrl = result.url;
    if (!downloadUrl) {
      await sendMessage(chatId, "❌ No download URL returned. Try a different link.", messageId);
      return;
    }

    const caption = `✅ Downloaded from ${platform}`;

    // Try sending as video; if it fails (e.g. too large), send link
    await sendChatAction(chatId, "upload_video");
    const sent = await sendVideo(chatId, downloadUrl, caption, messageId);

    if (!sent) {
      // Fallback: send direct link
      await sendMessage(
        chatId,
        `✅ Video ready! Direct link (tap to download):\n${downloadUrl}`,
        messageId
      );
    }
  } catch (err) {
    console.error("Download error:", err);
    await sendMessage(
      chatId,
      "❌ Something went wrong. Please try again or try a different link.",
      messageId
    );
  }
}

// Vercel serverless function entry point
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true, message: "Bot is running!" });
  }

  try {
    const update = req.body;

    // Only handle regular messages for now
    if (update.message) {
      await handleMessage(update.message);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(200).json({ ok: true }); // Always return 200 to Telegram
  }
}
