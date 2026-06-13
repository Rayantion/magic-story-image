# Magic Story Image

Draw a picture, get an AI illustration!

A kid-friendly website where children can draw or upload images, describe them, and receive AI-generated illustrations.

## Live Site

https://msi.jieren.my.id

## How It Works

1. **Draw or Upload** — Use the drawing canvas or upload an image
2. **Describe** — Write what you want the AI to create
3. **Generate** — Click the button and the canvas clears so you can draw another while waiting
4. **Gallery** — Generated images appear in a scrollable gallery below

## Architecture

```
Browser (msi.jieren.my.id)
  │
  │ POST /webhook (image base64 + description + language)
  ▼
n8n Workflow (n8n.rayantion.me)
  │
  ├─ Ollama Vision  → describes the drawing
  ├─ Ollama Story   → writes text-to-image prompt
  └─ Pollinations   → generates image using Flux model (Bearer token stored in n8n credential)
        │
        │ { "imageUrl": "https://..." }
        ▼
Browser renders image from URL
```

API keys (Pollinations pollen token) live **only** in n8n as encrypted credentials — never in client code.

## Tech Stack

- Vanilla HTML/CSS/JS (no frameworks)
- Drawing canvas with touch + mouse support
- i18n (zh-TW default, EN secondary)
- IndexedDB gallery cache (up to 20 generations)
- Async webhook to n8n for image generation

## Webhook Integration

**Endpoint:** `POST https://n8n.rayantion.me/webhook/e98c0572-0b47-40c9-b830-db97d4676521/`

**Request body:**
```json
{
  "image": "base64-png-string",
  "description": "A dragon flying over a rainbow castle",
  "language": "zh-TW"
}
```

**Expected response:**
```json
{
  "imageUrl": "https://image.pollinations.ai/prompt/..."
}
```

## n8n Workflow Setup

### 1. Import the workflow

1. Open n8n → **Workflows > Import from File**
2. Select `n8n-workflow.json`

### 2. Set Ollama credentials

| Variable | Description | Example |
|----------|-------------|---------|
| `OLLAMA_URL` | Ollama API endpoint | `https://your-ollama-host/api/generate` |
| `OLLAMA_API_KEY` | Your Ollama API key | `sk-...` |

Add via **Settings > Variables** in n8n, or in your n8n `.env` file. Restart n8n after editing `.env`.

### 3. Set Pollinations credential (pollen token)

1. Get a pollen token at https://enter.pollinations.ai/
2. In n8n, go to **Settings > Credentials > New Credential > HTTP Header Auth**
3. Name it `Pollinations Bearer`
4. Set **Name** = `Authorization`, **Value** = `Bearer YOUR_TOKEN_HERE`
5. In the workflow's Pollinations HTTP Request node, select this credential
6. **Never paste the token into any file or commit it to git**

### 4. Activate the workflow

Toggle the workflow to **Active**.

### Workflow nodes

1. **Webhook** — Receives `image` (base64), `description`, `language`
2. **Ollama Vision** — Describes the drawing using a vision model
3. **Ollama Story** — Writes a children's book text-to-image prompt
4. **Pollinations HTTP Request** — Calls `https://gen.pollinations.ai/image/{prompt}?model=flux` with Bearer auth
5. **Return Response** — Sends `{ "imageUrl": "..." }` back to the browser

## File Structure

```
├── index.html          # Main page
├── css/
│   └── style.css       # Styles
├── js/
│   ├── app.js          # Main app logic (webhook consumer, gallery)
│   ├── canvas.js       # Drawing canvas + upload
│   └── i18n.js         # Translations (zh-TW, EN)
└── n8n-workflow.json   # Full n8n workflow (import-ready)
```

## Security Note

The webhook URL is visible in client-side JavaScript — unavoidable for a static site. Mitigations:

- Add **CORS** and **referer validation** on the n8n webhook node
- Use **rate limiting** on the n8n instance
- All API keys/tokens must be stored as **n8n credentials only** — never in code or git

See [SECURITY.md](SECURITY.md) for the full security policy.

## CHANGELOG

### 2026-06-13
- **Security:** Removed hardcoded Pollinations pollen token from client code; rewrote git history to purge leaked key; moved Pollinations call to n8n server-side with encrypted credential
- **UX:** Added tap-to-retry placeholder when Pollinations returns 402 throttle error
- **Perf:** Lazy-load AI images in gallery to respect Pollinations concurrent request limits
- **Fix:** Correct n8n array payload unwrapping `[{...}]` format
