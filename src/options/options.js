/* ==========================================================================
 * WaBLUR – Options Page Script
 * ==========================================================================
 * SECURITY NOTES:
 * - Runs in extension context with strict CSP.
 * - No eval(), no innerHTML with user data, no remote resources.
 * - Whitelist/blacklist input is sanitized: split by newline, trimmed,
 *   and stored as an array of plain strings.
 * - Textarea values are read via .value (not innerHTML).
 * ========================================================================== */

'use strict';

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

let config = { ...DEFAULT_CONFIG };

/* --------------------------------------------------------------------------
 * DOM Element References
 * -------------------------------------------------------------------------- */

const el = {
  masterToggle: document.getElementById('masterToggle'),
  blurNames: document.getElementById('blurNames'),
  blurPreviews: document.getElementById('blurPreviews'),
  blurMessages: document.getElementById('blurMessages'),
  blurAvatars: document.getElementById('blurAvatars'),
  blurMedia: document.getElementById('blurMedia'),
  blurIntensity: document.getElementById('blurIntensity'),
  intensityValue: document.getElementById('intensityValue'),
  transitionDuration: document.getElementById('transitionDuration'),
  transitionValue: document.getElementById('transitionValue'),
  hoverProximity: document.getElementById('hoverProximity'),
  proximityValue: document.getElementById('proximityValue'),
  hoverDelay: document.getElementById('hoverDelay'),
  delayValue: document.getElementById('delayValue'),
  tempRevealDuration: document.getElementById('tempRevealDuration'),
  tempRevealValue: document.getElementById('tempRevealValue'),
  whitelist: document.getElementById('whitelist'),
  blacklist: document.getElementById('blacklist'),
  saveBtn: document.getElementById('saveBtn'),
  resetBtn: document.getElementById('resetBtn'),
  saveStatus: document.getElementById('saveStatus'),
};

/* --------------------------------------------------------------------------
 * Load & Populate
 * -------------------------------------------------------------------------- */

async function loadAndPopulate() {
  try {
    const stored = await chrome.storage.local.get('wablurConfig');
    if (stored.wablurConfig) {
      config = { ...DEFAULT_CONFIG, ...stored.wablurConfig };
    }
  } catch (e) {
    console.warn('[WaBLUR Options] Failed to load settings:', e.message);
  }

  // Toggles
  el.masterToggle.checked = config.enabled;
  el.blurNames.checked = config.blurNames;
  el.blurPreviews.checked = config.blurPreviews;
  el.blurMessages.checked = config.blurMessages;
  el.blurAvatars.checked = config.blurAvatars;
  el.blurMedia.checked = config.blurMedia;

  // Sliders
  el.blurIntensity.value = config.blurIntensity;
  el.intensityValue.textContent = `${config.blurIntensity}px`;

  el.transitionDuration.value = config.transitionDuration;
  el.transitionValue.textContent = `${config.transitionDuration}s`;

  el.hoverProximity.value = config.hoverProximity;
  el.proximityValue.textContent = `${config.hoverProximity}px`;

  el.hoverDelay.value = config.hoverDelay;
  el.delayValue.textContent = `${config.hoverDelay}ms`;

  el.tempRevealDuration.value = config.tempRevealDuration;
  el.tempRevealValue.textContent = `${config.tempRevealDuration}ms`;

  // Textareas
  el.whitelist.value = (config.whitelist || []).join('\n');
  el.blacklist.value = (config.blacklist || []).join('\n');
}

/* --------------------------------------------------------------------------
 * Read Form Values
 *
 * SECURITY: Textarea values are split, trimmed, and filtered.
 * No regex or dynamic selectors are built from these values.
 * -------------------------------------------------------------------------- */

function readFormValues() {
  return {
    enabled: el.masterToggle.checked,
    blurNames: el.blurNames.checked,
    blurPreviews: el.blurPreviews.checked,
    blurMessages: el.blurMessages.checked,
    blurAvatars: el.blurAvatars.checked,
    blurMedia: el.blurMedia.checked,
    blurIntensity: parseInt(el.blurIntensity.value, 10) || 8,
    transitionDuration: parseFloat(el.transitionDuration.value) || 0.25,
    hoverProximity: parseInt(el.hoverProximity.value, 10) || 0,
    hoverDelay: parseInt(el.hoverDelay.value, 10) || 0,
    tempRevealDuration: parseInt(el.tempRevealDuration.value, 10) || 3000,
    // SECURITY: sanitize contact lists – trim, filter empty, deduplicate
    whitelist: [...new Set(
      el.whitelist.value
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)
    )],
    blacklist: [...new Set(
      el.blacklist.value
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)
    )],
  };
}

/* --------------------------------------------------------------------------
 * Save
 * -------------------------------------------------------------------------- */

async function saveConfig() {
  config = readFormValues();
  try {
    await chrome.storage.local.set({ wablurConfig: { ...config } });

    // Update badge
    chrome.runtime.sendMessage({
      action: 'update-badge',
      enabled: config.enabled,
    }).catch(() => {});

    showSaveStatus('✓ Settings saved');
  } catch (e) {
    showSaveStatus('✗ Failed to save');
    console.error('[WaBLUR Options] Save error:', e);
  }
}

function showSaveStatus(text) {
  el.saveStatus.textContent = text;
  el.saveStatus.classList.add('visible');
  setTimeout(() => {
    el.saveStatus.classList.remove('visible');
  }, 2500);
}

/* --------------------------------------------------------------------------
 * Reset
 * -------------------------------------------------------------------------- */

async function resetToDefaults() {
  if (!confirm('Reset all WaBLUR settings to defaults? This cannot be undone.')) {
    return;
  }

  config = { ...DEFAULT_CONFIG };

  try {
    await chrome.storage.local.set({ wablurConfig: { ...config } });
    loadAndPopulate();
    showSaveStatus('✓ Reset to defaults');

    chrome.runtime.sendMessage({
      action: 'update-badge',
      enabled: config.enabled,
    }).catch(() => {});
  } catch (e) {
    showSaveStatus('✗ Failed to reset');
  }
}

/* --------------------------------------------------------------------------
 * Real-time Slider Value Display
 * -------------------------------------------------------------------------- */

el.blurIntensity.addEventListener('input', () => {
  el.intensityValue.textContent = `${el.blurIntensity.value}px`;
});

el.transitionDuration.addEventListener('input', () => {
  el.transitionValue.textContent = `${el.transitionDuration.value}s`;
});

el.hoverProximity.addEventListener('input', () => {
  el.proximityValue.textContent = `${el.hoverProximity.value}px`;
});

el.hoverDelay.addEventListener('input', () => {
  el.delayValue.textContent = `${el.hoverDelay.value}ms`;
});

el.tempRevealDuration.addEventListener('input', () => {
  el.tempRevealValue.textContent = `${el.tempRevealDuration.value}ms`;
});

/* --------------------------------------------------------------------------
 * Button Handlers
 * -------------------------------------------------------------------------- */

el.saveBtn.addEventListener('click', saveConfig);
el.resetBtn.addEventListener('click', resetToDefaults);

/* --------------------------------------------------------------------------
 * Initialize
 * -------------------------------------------------------------------------- */

loadAndPopulate();

