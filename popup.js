// ─── Configuration ───
// TODO: Replace with your deployed backend URL
const API_BASE_URL = 'https://your-backend.vercel.app';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── DOM References ───
const els = {
  currentSite: document.getElementById('currentSite'),
  controls: document.getElementById('controls'),
  userType: document.getElementById('userType'),
  region: document.getElementById('region'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  btnText: document.querySelector('.btn-text'),
  btnLoading: document.querySelector('.btn-loading'),
  loadingState: document.getElementById('loadingState'),
  errorState: document.getElementById('errorState'),
  errorMessage: document.getElementById('errorMessage'),
  retryBtn: document.getElementById('retryBtn'),
  results: document.getElementById('results'),
  verdictBanner: document.getElementById('verdictBanner'),
  verdictIcon: document.getElementById('verdictIcon'),
  verdictDecision: document.getElementById('verdictDecision'),
  verdictReason: document.getElementById('verdictReason'),
  riskLevel: document.getElementById('riskLevel'),
  factorTable: document.getElementById('factorTable').querySelector('tbody'),
  agreeingTo: document.getElementById('agreeingTo'),
  yourRights: document.getElementById('yourRights'),
  keyLimitsSection: document.getElementById('keyLimitsSection'),
  keyLimits: document.getElementById('keyLimits'),
  realCostSection: document.getElementById('realCostSection'),
  realCost: document.getElementById('realCost'),
  ifYouStay: document.getElementById('ifYouStay'),
  ifYouLeave: document.getElementById('ifYouLeave').querySelector('tbody'),
  refreshBtn: document.getElementById('refreshBtn'),
  copyBtn: document.getElementById('copyBtn'),
  cacheInfo: document.getElementById('cacheInfo'),
  cacheDate: document.getElementById('cacheDate'),
};

let currentDomain = null;
let lastResult = null;

// ─── Initialize ───
document.addEventListener('DOMContentLoaded', async () => {
  // Get current tab domain
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    try {
      const url = new URL(tab.url);
      currentDomain = url.hostname.replace(/^www\./, '');
      els.currentSite.textContent = currentDomain;
    } catch {
      els.currentSite.textContent = 'Unable to read URL';
    }
  }

  // Restore saved preferences
  const prefs = await chrome.storage.local.get(['userType', 'region']);
  if (prefs.userType) els.userType.value = prefs.userType;
  if (prefs.region) els.region.value = prefs.region;

  // Check cache for this domain
  if (currentDomain) {
    const cached = await getCachedResult(currentDomain);
    if (cached) {
      renderResults(cached.data);
      showCacheInfo(cached.timestamp);
    }
  }
});

// ─── Event Listeners ───
els.analyzeBtn.addEventListener('click', () => analyze(false));
els.retryBtn.addEventListener('click', () => analyze(false));
els.refreshBtn.addEventListener('click', () => analyze(true));
els.copyBtn.addEventListener('click', copyToClipboard);

// Save preferences on change
els.userType.addEventListener('change', () => {
  chrome.storage.local.set({ userType: els.userType.value });
});
els.region.addEventListener('change', () => {
  chrome.storage.local.set({ region: els.region.value });
});

// ─── Core Analysis ───
async function analyze(bypassCache = false) {
  if (!currentDomain) {
    showError('No valid website detected. Navigate to a site and try again.');
    return;
  }

  // Check cache (unless bypassing)
  if (!bypassCache) {
    const cached = await getCachedResult(currentDomain);
    if (cached) {
      renderResults(cached.data);
      showCacheInfo(cached.timestamp);
      return;
    }
  }

  showLoading();

  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain: currentDomain,
        userType: els.userType.value,
        region: els.region.value,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${response.status})`);
    }

    const data = await response.json();

    // Cache the result
    await cacheResult(currentDomain, data);

    renderResults(data);
  } catch (err) {
    console.error('Analysis failed:', err);
    showError(err.message || 'Failed to analyze this site. Please try again.');
  }
}

// ─── Rendering ───
function renderResults(data) {
  hideAllStates();
  els.results.classList.remove('hidden');
  lastResult = data;

  // Verdict banner
  const verdictMap = {
    recommended: { icon: '✅', class: 'recommended', label: 'Recommended' },
    caution: { icon: '⚠️', class: 'caution', label: 'Use with Caution' },
    avoid: { icon: '🚫', class: 'avoid', label: 'Avoid' },
  };

  const verdict = normalizeVerdict(data.verdict);
  const v = verdictMap[verdict] || verdictMap.caution;

  els.verdictBanner.className = `verdict-banner ${v.class}`;
  els.verdictIcon.textContent = v.icon;
  els.verdictDecision.textContent = v.label;
  els.verdictReason.textContent = data.reason || '';

  // Risk level
  const riskMap = {
    low: '🟢 Low Risk',
    medium: '🟡 Medium Risk',
    high: '🔴 High Risk',
  };
  els.riskLevel.textContent = riskMap[data.riskLevel?.toLowerCase()] || data.riskLevel || '';

  // Factor table
  els.factorTable.innerHTML = '';
  const factors = data.factors || {};
  const factorLabels = {
    dataCollection: 'Data collection',
    consentClarity: 'Consent clarity',
    optOutEffectiveness: 'Opt-out effectiveness',
    trackRecord: 'Track record',
    thirdPartySharing: 'Third-party / AI sharing',
    keyRisk: 'Key risk',
  };

  for (const [key, label] of Object.entries(factorLabels)) {
    const value = factors[key] || '—';
    const row = document.createElement('tr');
    row.innerHTML = `<td>${label}</td><td>${ratingBadge(value, key)}</td>`;
    els.factorTable.appendChild(row);
  }

  // Bullet lists
  renderBullets(els.agreeingTo, data.agreeingTo);
  renderBullets(els.yourRights, data.yourRights);

  // Key limits (optional section)
  if (data.keyLimits?.length) {
    els.keyLimitsSection.classList.remove('hidden');
    renderBullets(els.keyLimits, data.keyLimits);
  } else {
    els.keyLimitsSection.classList.add('hidden');
  }

  // Real cost (conditional)
  if (data.realCost) {
    els.realCostSection.classList.remove('hidden');
    els.realCost.textContent = data.realCost;
  } else {
    els.realCostSection.classList.add('hidden');
  }

  // If you stay
  renderBullets(els.ifYouStay, data.ifYouStay);

  // If you leave (table)
  els.ifYouLeave.innerHTML = '';
  const exitOptions = data.ifYouLeave || [];
  for (const opt of exitOptions) {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${opt.option || ''}</td><td>${opt.description || ''}</td>`;
    els.ifYouLeave.appendChild(row);
  }
}

function renderBullets(el, items) {
  el.innerHTML = '';
  if (!items?.length) return;
  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item;
    el.appendChild(li);
  }
}

function ratingBadge(value, key) {
  if (key === 'keyRisk') return `<strong>${escapeHtml(value)}</strong>`;

  const lower = value.toLowerCase();
  let cls = 'moderate';
  if (['low', 'clear', 'strong', 'clean', 'minimal', 'none'].some(w => lower.includes(w))) cls = 'good';
  if (['extensive', 'poor', 'weak', 'high'].some(w => lower.includes(w))) cls = 'bad';

  return `<span class="rating-badge ${cls}">${escapeHtml(value)}</span>`;
}

function normalizeVerdict(v) {
  if (!v) return 'caution';
  const lower = v.toLowerCase().replace(/[^a-z]/g, '');
  if (lower.includes('recommend')) return 'recommended';
  if (lower.includes('avoid')) return 'avoid';
  return 'caution';
}

// ─── State Management ───
function showLoading() {
  hideAllStates();
  els.analyzeBtn.disabled = true;
  els.btnText.classList.add('hidden');
  els.btnLoading.classList.remove('hidden');
  els.loadingState.classList.remove('hidden');
}

function showError(message) {
  hideAllStates();
  els.errorMessage.textContent = message;
  els.errorState.classList.remove('hidden');
}

function hideAllStates() {
  els.loadingState.classList.add('hidden');
  els.errorState.classList.add('hidden');
  els.results.classList.add('hidden');
  els.cacheInfo.classList.add('hidden');
  els.analyzeBtn.disabled = false;
  els.btnText.classList.remove('hidden');
  els.btnLoading.classList.add('hidden');
}

function showCacheInfo(timestamp) {
  const date = new Date(timestamp);
  els.cacheDate.textContent = date.toLocaleDateString();
  els.cacheInfo.classList.remove('hidden');
}

// ─── Caching ───
async function getCachedResult(domain) {
  const key = `cache_${domain}`;
  const stored = await chrome.storage.local.get(key);
  if (!stored[key]) return null;

  const { data, timestamp } = stored[key];
  if (Date.now() - timestamp > CACHE_TTL_MS) {
    await chrome.storage.local.remove(key);
    return null;
  }

  return { data, timestamp };
}

async function cacheResult(domain, data) {
  const key = `cache_${domain}`;
  await chrome.storage.local.set({
    [key]: { data, timestamp: Date.now() },
  });
}

// ─── Copy to Clipboard ───
async function copyToClipboard() {
  if (!lastResult) return;

  const text = formatAsText(lastResult);
  try {
    await navigator.clipboard.writeText(text);
    els.copyBtn.textContent = '✓ Copied';
    setTimeout(() => { els.copyBtn.textContent = '📋 Copy'; }, 2000);
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    els.copyBtn.textContent = '✓ Copied';
    setTimeout(() => { els.copyBtn.textContent = '📋 Copy'; }, 2000);
  }
}

function formatAsText(data) {
  const lines = [];
  lines.push(`Privacy Risk Advisor — ${currentDomain}`);
  lines.push(`Verdict: ${data.verdict}`);
  lines.push(`Reason: ${data.reason}`);
  lines.push(`Risk Level: ${data.riskLevel}`);
  lines.push('');
  lines.push('What You\'re Agreeing To:');
  (data.agreeingTo || []).forEach(b => lines.push(`  • ${b}`));
  lines.push('');
  lines.push('Your Rights:');
  (data.yourRights || []).forEach(b => lines.push(`  • ${b}`));
  if (data.ifYouStay?.length) {
    lines.push('');
    lines.push('If You Stay:');
    data.ifYouStay.forEach(b => lines.push(`  • ${b}`));
  }
  lines.push('');
  lines.push('⚠️ This summary is not legal advice.');
  return lines.join('\n');
}

// ─── Utilities ───
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
