// ─── Service Worker ───
// Handles background tasks for the Privacy Risk Advisor extension.
// Currently minimal — expand for badge icons, auto-scan, etc.

// Set default preferences on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['userType', 'region'], (result) => {
    if (!result.userType) chrome.storage.local.set({ userType: 'adult' });
    if (!result.region) chrome.storage.local.set({ region: 'US' });
  });
  console.log('Privacy Risk Advisor installed.');
});

// ─── Future: Badge Color Based on Cached Verdict ───
// Uncomment and expand when ready for post-MVP badge feature.
//
// chrome.tabs.onActivated.addListener(async (activeInfo) => {
//   const tab = await chrome.tabs.get(activeInfo.tabId);
//   if (!tab?.url) return;
//   try {
//     const domain = new URL(tab.url).hostname.replace(/^www\./, '');
//     const key = `cache_${domain}`;
//     const stored = await chrome.storage.local.get(key);
//     if (stored[key]) {
//       const verdict = stored[key].data.verdict?.toLowerCase() || '';
//       let color = '#9CA3AF'; // gray default
//       if (verdict.includes('recommend')) color = '#22C55E'; // green
//       else if (verdict.includes('caution')) color = '#EAB308'; // yellow
//       else if (verdict.includes('avoid')) color = '#EF4444'; // red
//       chrome.action.setBadgeBackgroundColor({ color, tabId: activeInfo.tabId });
//       chrome.action.setBadgeText({ text: ' ', tabId: activeInfo.tabId });
//     } else {
//       chrome.action.setBadgeText({ text: '', tabId: activeInfo.tabId });
//     }
//   } catch { /* ignore non-http tabs */ }
// });
