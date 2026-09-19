// Bot Telegram: padam mesej yang mengandungi link (Vercel serverless webhook)

const TOKEN = process.env.BOT_TOKEN;
const SECRET = process.env.WEBHOOK_SECRET;

// Domain yang dibenarkan, contoh: "youtube.com,github.com"
const ALLOWED_DOMAINS = (process.env.ALLOWED_DOMAINS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// Hantar amaran selepas padam? (default: ya)
const WARN_ENABLED = (process.env.WARN_ENABLED || "true").toLowerCase() !== "false";
// Padam amaran selepas N saat (0 = jangan padam)
const WARN_DELETE_SECONDS = Number(process.env.WARN_DELETE_SECONDS || 5);
// Guna {user} untuk mention pengguna
const WARN_TEXT =
  process.env.WARN_TEXT || "⚠️ {user}, link tidak dibenarkan dalam group ini.";

const API = `https://api.telegram.org/bot${TOKEN}`;

async function tg(method, params = {}) {
  const r = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return r.json();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const escapeHtml = (s = "") =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Ambil semua link dalam mesej (text atau caption)
function extractLinks(msg) {
  const text = msg.text ?? msg.caption ?? "";
  const entities = msg.entities ?? msg.caption_entities ?? [];
  const links = [];

  for (const e of entities) {
    if (e.type === "url") {
      links.push(text.substring(e.offset, e.offset + e.length));
    } else if (e.type === "text_link" && e.url) {
      links.push(e.url);
    }
  }

  // Fallback regex (untuk link yang Telegram tak tandakan sebagai entity)
  const re = /\b(?:https?:\/\/|www\.|t\.me\/|telegram\.me\/)[^\s]+/gi;
  const found = text.match(re);
  if (found) links.push(...found);

  return links;
}

function getHost(link) {
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(link) ? link : `http://${link}`;
    return new URL(withScheme).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isAllowed(link) {
  if (!ALLOWED_DOMAINS.length) return false;
  const host = getHost(link);
  if (!host) return false;
  return ALLOWED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

// Ada link yang tidak dibenarkan?
function hasBlockedLink(msg) {
  const links = extractLinks(msg);
  return links.some((l) => !isAllowed(l));
}

async function isAdmin(chatId, userId) {
  const r = await tg("getChatMember", { chat_id: chatId, user_id: userId });
  return r.ok && ["creator", "administrator"].includes(r.result.status);
}

async function handleMessage(msg) {
  const chat = msg.chat;

  // /start dalam private chat
  if (chat.type === "private") {
    if ((msg.text || "").startsWith("/start")) {
      // Dapatkan username bot (guna env BOT_USERNAME kalau ada, jika tidak getMe)
      let username = process.env.BOT_USERNAME;
      if (!username) {
        const me = await tg("getMe");
        username = me.ok ? me.result.username : "";
      }
      username = (username || "").replace(/^@/, "");

      const payload = {
        chat_id: chat.id,
        text:
          "Olla amigos\n\n" +
          "Tekan butang di bawah untuk tambah saya ke group anda. " +
          "Saya akan padam mesej yang mengandungi link (admin dikecualikan).\n\n" +
          "Pastikan saya dijadikan admin dengan kebenaran \"Delete messages\".",
      };

      if (username) {
        payload.reply_markup = {
          inline_keyboard: [
            [
              {
                text: "🪭",
                url: `https://t.me/${username}?startgroup=start&admin=delete_messages`,
              },
            ],
          ],
        };
      }

      await tg("sendMessage", payload);
    }
    return;
  }

  if (chat.type !== "group" && chat.type !== "supergroup") return;

  // Abaikan mesej yang tiada link
  if (!hasBlockedLink(msg)) return;

  // Kecualikan: admin tanpa nama (anonymous), auto-forward dari channel
  if (msg.sender_chat && msg.sender_chat.id === chat.id) return;
  if (msg.is_automatic_forward) return;

  // Kecualikan admin / owner
  if (msg.from && (await isAdmin(chat.id, msg.from.id))) return;

  // Padam mesej
  const del = await tg("deleteMessage", {
    chat_id: chat.id,
    message_id: msg.message_id,
  });
  if (!del.ok) {
    console.error("Gagal padam mesej:", del.description);
    return; // biasanya bot bukan admin / tiada kebenaran
  }

  // Amaran (pilihan)
  if (WARN_ENABLED && msg.from) {
    const name = escapeHtml(msg.from.first_name || "Pengguna");
    const mention = `<a href="tg://user?id=${msg.from.id}">${name}</a>`;
    const text = WARN_TEXT.replace(/\\n/g, "\n").replace("{user}", mention);

    const sent = await tg("sendMessage", {
      chat_id: chat.id,
      text,
      parse_mode: "HTML",
      disable_notification: true,
    });

    if (sent.ok && WARN_DELETE_SECONDS > 0) {
      await sleep(WARN_DELETE_SECONDS * 1000);
      await tg("deleteMessage", {
        chat_id: chat.id,
        message_id: sent.result.message_id,
      });
    }
  }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(200).send("Bot pemadam link aktif ✅");
  }

  if (SECRET && req.headers["x-telegram-bot-api-secret-token"] !== SECRET) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const update = req.body || {};
    const msg = update.message || update.edited_message;
    if (msg) await handleMessage(msg);
  } catch (err) {
    console.error("Ralat:", err);
  }

  // Sentiasa balas 200 supaya Telegram tidak cuba hantar semula
  return res.status(200).json({ ok: true });
};