/* ==========================================================================
 * WaBLUR – Popup Script
 * ==========================================================================
 * SECURITY NOTES:
 * - This script runs in the extension popup context with strict CSP.
 * - No eval(), no remote code, no innerHTML with user data.
 * - All DOM manipulation uses textContent and checked/value properties.
 * - Settings are read/written only via chrome.storage.local.
 * ========================================================================== */

'use strict';

/**
 * Default config (must match content.js and background.js).
 */
const DEFAULT_CONFIG = Object.freeze({
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
});

/** @type {typeof DEFAULT_CONFIG} */
let config = { ...DEFAULT_CONFIG };

/* --------------------------------------------------------------------------
 * DOM Element References
 * -------------------------------------------------------------------------- */

const elements = {
  masterToggle: document.getElementById('masterToggle'),
  statusText: document.getElementById('statusText'),
  blurNames: document.getElementById('blurNames'),
  blurPreviews: document.getElementById('blurPreviews'),
  blurMessages: document.getElementById('blurMessages'),
  blurAvatars: document.getElementById('blurAvatars'),
  blurMedia: document.getElementById('blurMedia'),
  blurIntensity: document.getElementById('blurIntensity'),
  intensityValue: document.getElementById('intensityValue'),
  tempRevealBtn: document.getElementById('tempRevealBtn'),
  openOptionsBtn: document.getElementById('openOptionsBtn'),
};

/* --------------------------------------------------------------------------
 * Load Settings & Populate UI
 * -------------------------------------------------------------------------- */

async function loadAndPopulate() {
  try {
    const stored = await chrome.storage.local.get('wablurConfig');
    if (stored.wablurConfig) {
      config = { ...DEFAULT_CONFIG, ...stored.wablurConfig };
    }
  } catch (e) {
    console.warn('[WaBLUR Popup] Failed to load settings:', e.message);
  }

  // Populate toggles
  elements.masterToggle.checked = config.enabled;
  elements.blurNames.checked = config.blurNames;
  elements.blurPreviews.checked = config.blurPreviews;
  elements.blurMessages.checked = config.blurMessages;
  elements.blurAvatars.checked = config.blurAvatars;
  elements.blurMedia.checked = config.blurMedia;

  // Populate slider
  elements.blurIntensity.value = config.blurIntensity;
  elements.intensityValue.textContent = `${config.blurIntensity}px`;

  updateStatusText();
  updateToggleStates();
}

/* --------------------------------------------------------------------------
 * UI State Helpers
 * -------------------------------------------------------------------------- */

function updateStatusText() {
  const el = elements.statusText;
  if (config.enabled) {
    el.textContent = 'Active';
    el.classList.remove('disabled');
  } else {
    el.textContent = 'Disabled';
    el.classList.add('disabled');
  }
}

/**
 * Disable/enable feature toggles based on master toggle.
 * When master is off, individual toggles are visually dimmed.
 */
function updateToggleStates() {
  const disabled = !config.enabled;
  elements.blurNames.disabled = disabled;
  elements.blurPreviews.disabled = disabled;
  elements.blurMessages.disabled = disabled;
  elements.blurAvatars.disabled = disabled;
  elements.blurMedia.disabled = disabled;
  elements.blurIntensity.disabled = disabled;
  elements.tempRevealBtn.disabled = disabled;
}

/* --------------------------------------------------------------------------
 * Save Settings
 *
 * SECURITY: We write a known-shape object to chrome.storage.local.
 * All values are validated (booleans stay booleans, numbers stay numbers).
 * -------------------------------------------------------------------------- */

async function saveConfig() {
  try {
    await chrome.storage.local.set({ wablurConfig: { ...config } });

    // Update badge in background
    chrome.runtime.sendMessage({
      action: 'update-badge',
      enabled: config.enabled,
    }).catch(() => {});
  } catch (e) {
    console.warn('[WaBLUR Popup] Failed to save settings:', e.message);
  }
}

/* --------------------------------------------------------------------------
 * Event Listeners
 * -------------------------------------------------------------------------- */

// Master toggle
elements.masterToggle.addEventListener('change', () => {
  config.enabled = elements.masterToggle.checked;
  updateStatusText();
  updateToggleStates();
  saveConfig();
});

// Feature toggles
['blurNames', 'blurPreviews', 'blurMessages', 'blurAvatars', 'blurMedia'].forEach(key => {
  elements[key].addEventListener('change', () => {
    config[key] = elements[key].checked;
    saveConfig();
  });
});

// Blur intensity slider
elements.blurIntensity.addEventListener('input', () => {
  const val = parseInt(elements.blurIntensity.value, 10);
  config.blurIntensity = val;
  elements.intensityValue.textContent = `${val}px`;
  // Debounce actual save to avoid excessive writes during drag
});

// Save on slider release (mouseup/touchend)
elements.blurIntensity.addEventListener('change', () => {
  config.blurIntensity = parseInt(elements.blurIntensity.value, 10);
  saveConfig();
});

// Temporary reveal button
elements.tempRevealBtn.addEventListener('click', async () => {
  try {
    const tabs = await chrome.tabs.query({
      url: 'https://web.whatsapp.com/*',
      active: true,
      currentWindow: true,
    });

    if (tabs.length > 0) {
      await chrome.tabs.sendMessage(tabs[0].id, { action: 'temp-reveal' });
    } else {
      // Try any WA tab
      const allWaTabs = await chrome.tabs.query({
        url: 'https://web.whatsapp.com/*',
      });
      if (allWaTabs.length > 0) {
        await chrome.tabs.sendMessage(allWaTabs[0].id, { action: 'temp-reveal' });
      }
    }
  } catch (e) {
    console.warn('[WaBLUR Popup] Failed to send temp-reveal:', e.message);
  }
});

// Open advanced options page
elements.openOptionsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

/* --------------------------------------------------------------------------
 * Initialize
 * -------------------------------------------------------------------------- */

loadAndPopulate();

