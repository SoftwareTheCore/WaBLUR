/* ==========================================================================
 * WaBLUR – Background Service Worker (MV3)
 * ==========================================================================
 * SECURITY NOTES:
 * - This service worker has NO access to page DOM.
 * - It handles global keyboard shortcuts (chrome.commands) and relays
 *   toggle/reveal messages to the content script.
 * - No external network requests are made.
 * - No data is collected or transmitted.
 *
 * ARCHITECTURE:
 * - Listens for chrome.commands (keyboard shortcuts defined in manifest).
 * - Relays commands to the active WhatsApp Web tab's content script.
 * - Manages extension icon badge to show ON/OFF state.
 * ========================================================================== */

'use strict';

/**
 * Find the active WhatsApp Web tab and send a message to it.
 *
 * SECURITY: We query only tabs matching our host_permission pattern.
 * This ensures we never accidentally message an unrelated tab.
 *
 * @param {Object} message - Message to send to the content script
 * @returns {Promise<any>} Response from the content script
 */
async function sendToWhatsAppTab(message) {
  const tabs = await chrome.tabs.query({
    url: 'https://web.whatsapp.com/*',
    active: true,
    currentWindow: true,
  });

  // If no active WA tab in current window, try any WA tab
  let targetTabs = tabs;
  if (targetTabs.length === 0) {
    targetTabs = await chrome.tabs.query({
      url: 'https://web.whatsapp.com/*',
    });
  }

  if (targetTabs.length === 0) {
    console.warn('[WaBLUR] No WhatsApp Web tab found');
    return null;
  }

  try {
    return await chrome.tabs.sendMessage(targetTabs[0].id, message);
  } catch (e) {
    console.warn('[WaBLUR] Failed to send message to tab:', e.message);
    return null;
  }
}

/* --------------------------------------------------------------------------
 * Chrome Commands (Global Keyboard Shortcuts)
 * -------------------------------------------------------------------------- */

chrome.commands.onCommand.addListener(async (command) => {
  switch (command) {
    case 'toggle-blur':
      const response = await sendToWhatsAppTab({ action: 'toggle-blur' });
      if (response) {
        updateBadge(response.enabled);
      }
      break;

    case 'temp-reveal':
      await sendToWhatsAppTab({ action: 'temp-reveal' });
      break;

    default:
      break;
  }
});

/* --------------------------------------------------------------------------
 * Badge Management
 *
 * Shows a small badge on the extension icon to indicate ON/OFF state.
 * -------------------------------------------------------------------------- */

/**
 * Update the extension badge to reflect blur state.
 * @param {boolean} enabled - Whether blur is currently enabled
 */
function updateBadge(enabled) {
  chrome.action.setBadgeText({
    text: enabled ? 'ON' : 'OFF',
  });
  chrome.action.setBadgeBackgroundColor({
    color: enabled ? '#4CAF50' : '#9E9E9E',
  });
}

/* --------------------------------------------------------------------------
 * Installation & Update Handlers
 * -------------------------------------------------------------------------- */

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Set default config on first install
    const DEFAULT_CONFIG = {
      enabled: true,
      blurNames: true,
      blurPreviews: true,
      blurMessages: true,
      blurAvatars: true,
      blurMedia: true,
      blurIntensity: 8,
      transitionDuration: 0.25,
      hoverProximity: 0,
      hoverDelay: 0,
      whitelist: [],
      blacklist: [],
      tempRevealDuration: 3000,
    };

    await chrome.storage.local.set({ wablurConfig: DEFAULT_CONFIG });
    updateBadge(true);

    console.log('[WaBLUR] Extension installed with default config');
  } else if (details.reason === 'update') {
    // On update, merge new defaults with existing config
    const stored = await chrome.storage.local.get('wablurConfig');
    if (stored.wablurConfig) {
      const DEFAULT_CONFIG = {
        enabled: true,
        blurNames: true,
        blurPreviews: true,
        blurMessages: true,
        blurAvatars: true,
        blurMedia: true,
        blurIntensity: 8,
        transitionDuration: 0.25,
        hoverProximity: 0,
        hoverDelay: 0,
        whitelist: [],
        blacklist: [],
        tempRevealDuration: 3000,
      };
      const merged = { ...DEFAULT_CONFIG, ...stored.wablurConfig };
      await chrome.storage.local.set({ wablurConfig: merged });
      updateBadge(merged.enabled);
    }
    console.log('[WaBLUR] Extension updated');
  }
});

/* --------------------------------------------------------------------------
 * Startup – Restore badge state
 * -------------------------------------------------------------------------- */

chrome.runtime.onStartup.addListener(async () => {
  const stored = await chrome.storage.local.get('wablurConfig');
  if (stored.wablurConfig) {
    updateBadge(stored.wablurConfig.enabled);
  }
});

/* --------------------------------------------------------------------------
 * Message from popup requesting status
 * -------------------------------------------------------------------------- */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.action === 'update-badge') {
    updateBadge(message.enabled);
    sendResponse({ ok: true });
  }
  return true;
});

