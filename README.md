# Magic Story Image

Draw a picture, get an AI illustration!

A kid-friendly website where children can draw or upload images, describe them, and receive AI-generated illustrations.

## Live Site

https://rayantion.github.io/magic-story-image/

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

See `n8n/response-template.json` for the n8n expression template.

## File Structure

```
├── index.html          # Main page
├── css/
│   └── style.css       # Styles
├── js/
│   ├── app.js          # Main app logic
│   ├── canvas.js       # Drawing canvas + upload
│   └── i18n.js         # Translations
└── n8n/
    └── response-template.json  # n8n webhook response template
```
