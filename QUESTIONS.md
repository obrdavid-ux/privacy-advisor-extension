# Open Questions — Decisions Needed

Answer these before (or during) development. They're ordered by priority — the first few block progress.

---

## 🔴 Blocking — Need Before Coding

### 1. Anthropic API Key
Do you already have an Anthropic API account with billing set up? If not, sign up at https://console.anthropic.com. You'll need a funded account to use Sonnet + web search.

- [ ] I have an API key ready
- [ ] I need to set one up

### 2. Backend Hosting Preference
Where do you want the proxy backend to live?

- [ ] **Vercel** (recommended — free tier, easy GitHub deploys, serverless functions)
- [ ] **Cloudflare Workers** (alternative — also free tier, edge-based, slightly more setup)
- [ ] **Other** (specify: _______________)

### 3. Do You Want User Authentication?
For MVP, the extension would be open — anyone who installs it can use it (hitting your API bill). Options:

- [ ] **No auth (MVP)** — Accept the risk, add rate limiting per IP
- [ ] **Simple API key per user** — Users enter their own Anthropic key in settings
- [ ] **Free tier + paid tier** — X free analyses/day, then require sign-up

### 4. GitHub Repo
- [ ] **Public repo** — Open source, great for portfolio visibility
- [ ] **Private repo** — Keep code proprietary

---

## 🟡 Important — Need Before Launch

### 5. Extension Name & Branding
What should the extension be called? Ideas:

- [ ] Privacy Risk Advisor
- [ ] PolicyCheck
- [ ] PrivacyGrade
- [ ] TrustScore
- [ ] Other: _______________

### 6. Default User Type
What should the default user type be when someone clicks the button?

- [ ] Adult (most common, simplest)
- [ ] Ask every time (adds a step)
- [ ] Remember last selection

### 7. Default Region
- [ ] Auto-detect from browser locale
- [ ] Default to US (your primary audience)
- [ ] Always ask

### 8. Cache Duration
How long should a cached result be valid before re-analyzing?

- [ ] 7 days (recommended — balances freshness and cost)
- [ ] 30 days (cheaper, but policies change)
- [ ] 24 hours (expensive, but always current)

---

## 🟢 Nice to Have — Can Decide Later

### 9. Analytics
Do you want to track which domains are analyzed most? (Useful for pre-caching and content ideas.)

- [ ] Yes — add simple server-side logging
- [ ] No — keep it zero-tracking (on-brand for a privacy tool)

### 10. Content Integration
Should each analysis have a "Share on LinkedIn" button built in? This could feed your thought leadership series directly.

- [ ] Yes — generate a pre-formatted post
- [ ] No — I'll craft posts manually

### 11. Badge Icon
Should the extension icon change color (🟢🟡🔴) based on the last-analyzed site?

- [ ] Yes — adds visual value, but requires `activeTab` monitoring
- [ ] No — keep it simple for MVP

### 12. Monetization Path
Long-term, how do you want to handle costs if this gets popular?

- [ ] Keep it free, absorb API costs (portfolio piece)
- [ ] Freemium — free analyses/day, paid plan for more
- [ ] Enterprise licensing — sell to IT teams
- [ ] Sponsorship/donations model
