// Guna: node --env-file=.env scripts/set-webhook.js https://nama-projek.vercel.app
const TOKEN = process.env.BOT_TOKEN;
const SECRET = process.env.WEBHOOK_SECRET;
const baseUrl = (process.argv[2] || process.env.VERCEL_URL || "").replace(/\/$/, "");

if (!TOKEN || !baseUrl) {
  console.error("Sila set BOT_TOKEN dan beri URL Vercel.\nContoh: node --env-file=.env scripts/set-webhook.js https://nama-projek.vercel.app");
  process.exit(1);
}

const url = `${baseUrl.startsWith("http") ? baseUrl : "https://" + baseUrl}/api/webhook`;

(async () => {
  const body = {
    url,
    allowed_updates: ["message", "edited_message"],
    drop_pending_updates: true,
  };
  if (SECRET) body.secret_token = SECRET;

  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  console.log("Webhook:", url);
  console.log(await r.json());
})();
