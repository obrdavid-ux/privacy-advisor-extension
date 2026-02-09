// ─── Backend: Vercel Serverless Function ───
// Deploy this as /api/analyze.js in a Vercel project.
//
// Setup:
// 1. Create a new Vercel project (or `npx vercel init`)
// 2. Add ANTHROPIC_API_KEY to Vercel environment variables
// 3. Place this file at /api/analyze.js
// 4. Deploy with `vercel deploy`

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5-20250514';

// The Privacy & Terms Risk Advisor system prompt
const SYSTEM_PROMPT = `You are a Privacy & Terms Risk Advisor for everyday users. Your job is to translate dense privacy policies and terms of service into a short, clear, consumer-friendly summary that helps users make informed decisions.

You will be given a domain name, a user type, and a region. Use web search to find the site's Privacy Policy and Terms of Service, then analyze them.

CRITICAL: You must respond ONLY with valid JSON matching this exact schema. No markdown, no explanation outside the JSON.

{
  "verdict": "Recommended" | "Use with caution" | "Avoid",
  "reason": "One sentence explaining why",
  "riskLevel": "Low" | "Medium" | "High",
  "factors": {
    "dataCollection": "Low" | "Moderate" | "Extensive",
    "consentClarity": "Clear" | "Mixed" | "Poor",
    "optOutEffectiveness": "Strong" | "Limited" | "Weak",
    "trackRecord": "Clean" | "Mixed" | "Poor",
    "thirdPartySharing": "Minimal" | "Moderate" | "Extensive",
    "keyRisk": "string describing key risk or None"
  },
  "agreeingTo": ["bullet 1", "bullet 2", "bullet 3"],
  "yourRights": ["bullet 1", "bullet 2"],
  "keyLimits": ["bullet 1"] or [],
  "realCost": "string or null",
  "ifYouStay": ["step 1", "step 2"],
  "ifYouLeave": [
    { "option": "Full exit", "description": "..." },
    { "option": "Partial", "description": "..." },
    { "option": "Passive", "description": "..." }
  ]
}

VERDICT CRITERIA:
- "Recommended": Data collection limited to core function, clear consent, no major breaches, minimal third-party sharing, no surveillance business model.
- "Use with caution": Collects more than necessary but has opt-outs, some dark patterns, minor regulatory issues, shares with ad networks but allows opt-out.
- "Avoid": Extensive collection with weak/no opt-out, major unresolved breach, sells data to brokers, malware-like behavior, deceptive practices.

RULES:
- Hard limit: 350 words equivalent across all fields
- Bullets must be <15 words each, one idea per bullet
- Cite regulatory history (fines, breaches) with dates when relevant
- Key risk is required — use "None" if no unusual risk
- No rhetorical questions or editorial framing`;

// ─── Simple in-memory rate limiting ───
const rateLimits = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 20; // requests per IP per hour

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimits.get(ip);

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimits.set(ip, { windowStart: now, count: 1 });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) return false;

  record.count++;
  return true;
}

// ─── Main Handler ───
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*'); // TODO: restrict to extension ID in production
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limiting
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
  }

  // Validate input
  const { domain, userType = 'adult', region = 'US' } = req.body || {};

  if (!domain || typeof domain !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid domain' });
  }

  // Sanitize domain
  const cleanDomain = domain.replace(/[^a-zA-Z0-9.-]/g, '').toLowerCase();
  if (!cleanDomain || cleanDomain.length > 253) {
    return res.status(400).json({ error: 'Invalid domain format' });
  }

  // Map user type to prompt language
  const userTypeMap = {
    adult: 'Adult',
    teen: 'Teen (13–17)',
    child: 'Child (under 13) — address the parent as the audience',
  };

  const userMessage = `Analyze the privacy policy and terms of service for: ${cleanDomain}

User type: ${userTypeMap[userType] || 'Adult'}
Region: ${region}

Find the privacy policy and terms of service for this website using web search, read them thoroughly, and provide your assessment as JSON.`;

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
          },
        ],
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Anthropic API error:', response.status, errBody);
      return res.status(502).json({ error: 'Analysis service unavailable' });
    }

    const result = await response.json();

    // Extract text from response (may have multiple content blocks due to tool use)
    const textContent = result.content
      ?.filter((block) => block.type === 'text')
      ?.map((block) => block.text)
      ?.join('') || '';

    // Parse JSON from response
    let parsed;
    try {
      // Try direct parse first
      parsed = JSON.parse(textContent);
    } catch {
      // Try extracting JSON from markdown code block
      const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1].trim());
      } else {
        // Last resort: find first { to last }
        const start = textContent.indexOf('{');
        const end = textContent.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
          parsed = JSON.parse(textContent.substring(start, end + 1));
        } else {
          throw new Error('No JSON found in response');
        }
      }
    }

    // Validate required fields
    if (!parsed.verdict || !parsed.factors) {
      return res.status(502).json({ error: 'Incomplete analysis received' });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Analysis failed. Please try again.' });
  }
}
