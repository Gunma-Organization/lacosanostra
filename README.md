# Telegram Link Remover Bot

Bot untuk padam mesej yang mengandungi link dalam group Telegram. Dibina untuk **Vercel** (serverless webhook, tiada dependency).

## Ciri
- Padam mesej dengan link (`http://`, `www.`, `t.me/`, pautan tersembunyi dalam teks, caption gambar/video)
- Padam juga bila mesej **diedit** untuk letak link
- Admin & owner group dikecualikan
- Senarai domain dibenarkan (whitelist) – pilihan
- Amaran auto-padam selepas beberapa saat – pilihan

## Cara setup

### 1. Cipta bot
1. Buka [@BotFather](https://t.me/BotFather) → `/newbot` → salin **token**.
2. (Disyorkan) `/setprivacy` → **Disable**, supaya bot nampak semua mesej.

### 2. Deploy ke Vercel
1. Push folder ini ke GitHub, kemudian **Add New Project** di Vercel dan import repo tersebut.
   (Atau guna `npm i -g vercel` lalu `vercel` dalam folder ini.)
2. Di **Settings → Environment Variables**, tambah:
   - `BOT_TOKEN`
   - `WEBHOOK_SECRET`
   - (pilihan) `ALLOWED_DOMAINS`, `WARN_ENABLED`, `WARN_DELETE_SECONDS`, `WARN_TEXT`
3. **Deploy** (atau Redeploy kalau tambah env selepas deploy).

### 3. Set webhook
Salin `.env.example` kepada `.env`, isi nilai sebenar, kemudian (Node 20+):

```bash
npm run set-webhook -- https://nama-projek.vercel.app
```

Atau tanpa terminal, buka URL ini dalam browser (tukar nilai):

```
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://nama-projek.vercel.app/api/webhook&secret_token=<WEBHOOK_SECRET>&allowed_updates=["message","edited_message"]
```

### 4. Tambah ke group
1. Tambah bot ke group.
2. Jadikan bot **admin** dengan kebenaran **Delete messages**.
3. Cuba hantar link guna akaun bukan admin.

## Semak status
- Buka `https://nama-projek.vercel.app/api/webhook` → sepatutnya keluar "Bot pemadam link aktif ✅".
- Semak webhook: `https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo`

## Nota
- Kalau link tak dipadam, biasanya bot belum jadi admin atau tiada kebenaran *Delete messages* (lihat log di Vercel).
- Bot tidak boleh padam mesej yang dihantar oleh admin group.
