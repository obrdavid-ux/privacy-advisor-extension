# 🛡️ Privacy Risk Advisor — Chrome Extension

Instant privacy risk verdicts for any website. Click the extension, get a plain-English assessment of the site's privacy policy powered by AI.

## Project Structure

```
privacy-advisor-extension/
├── manifest.json          # Chrome extension config
├── popup.html             # Extension popup UI
├── popup.js               # UI logic, API calls, caching
├── styles.css             # Popup styles
├── service-worker.js      # Background service worker
├── icons/                 # Extension icons (16, 48, 128px)
│
├── backend/               # Vercel serverless backend
│   ├── api/
│   │   └── analyze.js     # /api/analyze endpoint
│   ├── package.json
│   ├── vercel.json
│   └── .env.example
│
├── PROJECT_PLAN.md        # Full project plan and timeline
└── QUESTIONS.md           # Open decisions to make
```

## Quick Start

### 1. Deploy the Backend

```bash
cd backend
cp .env.example .env.local
# Edit .env.local and add your Anthropic API key

npm install -g vercel   # if not installed
vercel login
vercel deploy
```

Note your deployment URL (e.g., `https://privacy-advisor-backend.vercel.app`).

### 2. Configure the Extension

Edit `popup.js` line 3 — replace the API_BASE_URL:

```javascript
const API_BASE_URL = 'https://your-actual-deployment.vercel.app';
```

### 3. Create Icons

Create PNG icons at 16×16, 48×48, and 128×128 pixels. Place them in `icons/` as:
- `icon16.png`
- `icon48.png`
- `icon128.png`

### 4. Load in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `privacy-advisor-extension/` directory (not the backend folder)
5. Click the extension icon on any website

## How It Works

1. You click the extension icon on any site
2. The popup reads the current tab's domain
3. Checks local cache (7-day TTL) for an existing result
4. If no cache, calls the backend proxy at `/api/analyze`
5. Backend sends the domain + your prompt to Claude Sonnet with web search enabled
6. Claude finds the privacy policy, reads it, returns a structured JSON verdict
7. Extension renders the verdict in the popup and caches it

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key (set in Vercel dashboard) |

## Cost

- ~$0.02–0.05 per analysis (Claude Sonnet + web search)
- Vercel Hobby tier: free
- Caching reduces repeat analysis costs to zero

## License

Private — not yet licensed for distribution.
