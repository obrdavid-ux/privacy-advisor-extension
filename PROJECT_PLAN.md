# Privacy & Terms Risk Advisor — Chrome Extension

## Project Plan

**Owner:** Dave
**Status:** Planning
**Target MVP:** 3 weeks from start

---

## Vision

A Chrome extension that lets any user click a button and instantly receive a plain-English privacy risk verdict for the site they're visiting — powered by the Privacy & Terms Risk Advisor prompt and the Anthropic API.

---

## Architecture

```
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│  Chrome Extension │────▶│  Backend Proxy       │────▶│  Anthropic API   │
│  (Manifest V3)   │◀────│  (Vercel/Cloudflare) │◀────│  (Claude Sonnet) │
│                  │     │                     │     │  + Web Search    │
│  - popup.html    │     │  - /api/analyze     │     │                  │
│  - popup.js      │     │  - rate limiting    │     │                  │
│  - service-worker│     │  - API key storage  │     │                  │
│  - cache layer   │     │  - response cache   │     │                  │
└──────────────────┘     └─────────────────────┘     └──────────────────┘
```

**Why a backend proxy?**
Chrome extensions ship source code to every user. Without a proxy, your Anthropic API key would be exposed in the extension bundle. The proxy also lets you add rate limiting, caching, and usage analytics.

---

## Phase Breakdown

### Phase 1 — Foundation (Week 1)

| Task | Hours | Deliverable |
|------|-------|-------------|
| Set up project repo (GitHub) | 0.5 | Repo with README |
| Create manifest.json with permissions | 0.5 | Working extension shell |
| Build popup HTML/CSS with verdict layout | 2 | Styled popup matching output format |
| Implement service worker (tab URL detection) | 1 | Active tab domain extraction |
| Create placeholder/loading states | 1 | Spinner, error, and empty states |
| **Phase 1 Total** | **5** | **Installable extension with UI** |

### Phase 2 — Backend + API Integration (Week 1–2)

| Task | Hours | Deliverable |
|------|-------|-------------|
| Set up Vercel project or Cloudflare Worker | 1 | Deployed endpoint |
| Build `/api/analyze` route | 2 | Accepts domain, returns verdict |
| Integrate Anthropic API with system prompt | 2 | Working Claude call with web search |
| Add response parsing (structured JSON) | 2 | Reliable verdict extraction |
| Add server-side caching (KV or file-based) | 1 | Skip re-analysis for known domains |
| **Phase 2 Total** | **8** | **Working end-to-end analysis** |

### Phase 3 — Integration + Polish (Week 2–3)

| Task | Hours | Deliverable |
|------|-------|-------------|
| Connect popup.js to backend | 1 | Live results in popup |
| Implement client-side cache (chrome.storage) | 1 | 7-day local cache |
| Error handling (network, API, parsing) | 2 | Graceful failures |
| Test across 20+ sites (big tech, small apps, sketchy) | 2 | Bug list resolved |
| Add user type selector (Adult/Teen/Child) | 1 | Dropdown in popup |
| Region auto-detection or selector | 0.5 | US vs EU/UK toggle |
| **Phase 3 Total** | **7.5** | **Polished MVP** |

### Phase 4 — Launch (Week 3)

| Task | Hours | Deliverable |
|------|-------|-------------|
| Create extension icons (16, 48, 128px) | 1 | Icon set |
| Write Chrome Web Store listing + screenshots | 1 | Store assets |
| Submit to Chrome Web Store | 0.5 | Published extension |
| Write LinkedIn launch post | 1 | Content marketing |
| **Phase 4 Total** | **3.5** | **Live in Chrome Web Store** |

**Grand Total: ~24 hours across 3 weeks**

---

## Cost Estimate

| Item | Cost | Frequency |
|------|------|-----------|
| Chrome Web Store registration | $5 | One-time |
| Anthropic API (Sonnet 4.5 + web search) | ~$0.02–0.05/analysis | Per use |
| Vercel Hobby plan | $0 | Monthly |
| Optional: Custom domain | $12 | Annual |
| **Launch cost** | **$5–17** | |
| **Monthly at 50 analyses/day** | **~$30–75** | Ongoing |

---

## API Prompt Strategy

The system prompt is the Privacy & Terms Risk Advisor (included in repo). The user message sent per analysis:

```
Analyze the privacy policy and terms of service for: {domain}

User type: {Adult | Teen 13-17 | Child under 13}
Region: {US | EU/UK}

Find the privacy policy and terms of service for this website, read them, and provide your assessment using the specified output format. Return your response as JSON matching the schema provided.
```

**Structured output:** To reliably parse Claude's response into the popup UI, append a JSON schema instruction to the prompt so the response is machine-parseable while keeping the human-readable format as a fallback.

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend host | Vercel (serverless) | Free tier, easy deploy, supports Edge |
| API model | Claude Sonnet 4.5 | Best cost/quality ratio for this task |
| Web search | Anthropic web search tool | Claude finds + reads the policy itself |
| Cache strategy | Server-side (Vercel KV) + client-side (chrome.storage) | Reduce cost and latency |
| Response format | JSON with HTML fallback | Reliable UI rendering |
| Auth | None for MVP; API key in Vercel env | Simplest path to launch |

---

## Post-MVP Roadmap

1. **Pre-cached top 500 sites** — Bundle results to eliminate API calls for popular domains
2. **Badge indicator** — Show 🟢🟡🔴 on the extension icon as you browse
3. **History view** — "Sites I've checked" dashboard
4. **Comparison mode** — Side-by-side two services (e.g., Zoom vs Teams)
5. **Enterprise version** — IT admin dashboard, bulk domain assessment, policy alerts
6. **Firefox/Edge ports** — Manifest V3 is cross-browser compatible with minor changes
7. **Auto-scan on navigation** — Optional mode that checks every site automatically

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Policy text not found via web search | Analysis fails | Fallback to common URL paths + manual scraping |
| Claude returns unstructured response | UI breaks | JSON schema enforcement + regex fallback parser |
| API costs spike from abuse | Budget overrun | Rate limiting per IP, daily cap, CAPTCHA if needed |
| Chrome Web Store rejection | Can't distribute | Follow Manifest V3 guidelines strictly, minimal permissions |
| Privacy policies change frequently | Stale results | 7-day cache TTL, manual refresh button |

---

## Open Questions (Need Your Input)

See `QUESTIONS.md` for decisions needed before development begins.
