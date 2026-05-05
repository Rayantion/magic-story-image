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

## Tech Stack

- Vanilla HTML/CSS/JS (no frameworks)
- Drawing canvas with touch + mouse support
- i18n (zh-TW default, EN secondary)
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

## Security Note

The webhook URL is visible in the client-side JavaScript (`js/app.js`). This is **unavoidable** for a static client-side app — the browser must know the endpoint to send requests to. To mitigate abuse:

- Add **CORS** and **referer validation** on the n8n webhook node.
- Use **rate limiting** on the n8n instance.
- Never commit API keys or secrets to this repo.

## n8n Workflow Setup

The included `n8n-workflow.json` is ready to import into n8n. It uses two environment variables for the Ollama API connection:

| Variable | Description | Example |
|----------|-------------|---------|
| `OLLAMA_URL` | Ollama API endpoint | `https://ollama.com/api/generate` |
| `OLLAMA_API_KEY` | Your Ollama API key | `sk-...` |

### Option 1: n8n .env file

Create or edit `.env` in your n8n installation directory:

```env
OLLAMA_URL=https://ollama.com/api/generate
OLLAMA_API_KEY=your-ollama-api-key-here
```

Restart n8n after editing `.env`.

### Option 2: n8n UI (Variables)

In n8n, go to **Settings > Variables** and add:
- `OLLAMA_URL`
- `OLLAMA_API_KEY`

### Import the workflow

1. Open n8n
2. Click **Workflows > Import from File**
3. Select `n8n-workflow.json`
4. Activate the workflow

### Workflow flow

1. **Webhook** — Receives `image` (base64), `description`, and `language`
2. **Ollama Vision** — Describes the uploaded drawing using a vision model
3. **Ollama Story** — Writes a short text-to-image prompt based on the description
4. **Pollinations Image** — Generates the illustration via Pollinations.ai
5. **Return Response** — Sends the image URL back to the frontend

## File Structure

```
├── index.html          # Main page
├── css/
│   └── style.css       # Styles
├── js/
│   ├── app.js          # Main app logic
│   ├── canvas.js       # Drawing canvas + upload
│   └── i18n.js         # Translations
└── n8n-workflow.json   # Full n8n workflow (import-ready)
```
