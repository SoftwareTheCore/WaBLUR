/* ==========================================================================
 * WaBLUR – Content Script
 * ==========================================================================
 * SECURITY NOTES:
 * - Runs in an ISOLATED WORLD (MV3 content scripts cannot access page JS).
 * - No data is ever transmitted outside the extension. All storage is local.
 * - DOM queries use safe selectors; no innerHTML or eval() is ever used.
 * - All user-supplied data (contact names) is compared with strict string
 *   equality after trimming. No regex or dynamic selectors are built from
 *   user input, preventing selector injection attacks.
 *
 * ARCHITECTURE:
 * - blur.css handles all visual blur via CSS classes on <html> and CSS vars.
 * - This script: reads settings → toggles classes → applies per-contact rules
 *   → handles keyboard shortcuts → announces state to screen readers.
 * - A MutationObserver watches for new chat rows (WhatsApp is a virtualized
 *   SPA) to apply per-contact rules to dynamically loaded elements.
 * ========================================================================== */

'use strict';

/**
 * Default configuration. Merged with stored settings on load.
 * SECURITY: Frozen to prevent accidental mutation of defaults.
 * @readonly
 */
const DEFAULT_CONFIG = Object.freeze({
  enabled: true,
  blurNames: true,
  blurPreviews: true,
  blurMessages: true,
  blurAvatars: true,
  blurMedia: true,
  blurIntensity: 8,          // pixels
  transitionDuration: 0.25,  // seconds
  hoverProximity: 0,         // pixels – extra hit area around blurred elements
  hoverDelay: 0,             // ms – delay before reveal (0 = instant CSS hover)
  whitelist: [],             // contact names never blurred
  blacklist: [],             // contact names always blurred (even if master off)
  tempRevealDuration: 3000,  // ms – how long temp reveal lasts
});

/** @type {typeof DEFAULT_CONFIG} */
let config = { ...DEFAULT_CONFIG };

/* --------------------------------------------------------------------------
 * Utility: Debounce
 * -------------------------------------------------------------------------- */

/**
 * Creates a debounced version of the given function.
 * @param {Function} fn - Function to debounce
 * @param {number} ms - Debounce interval in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

/* --------------------------------------------------------------------------
 * Settings Load & Sync
 * -------------------------------------------------------------------------- */

/**
 * Load settings from chrome.storage.local and apply them.
 * Called once on init and whenever storage changes.
 */
async function loadSettings() {
  try {
    const stored = await chrome.storage.local.get('wablurConfig');
    if (stored.wablurConfig) {
      config = { ...DEFAULT_CONFIG, ...stored.wablurConfig };
    }
  } catch (e) {
    // SECURITY: Fail-safe – if storage read fails, keep defaults (blur ON).
    // This ensures privacy is maintained even if storage is corrupted.
    console.warn('[WaBLUR] Failed to load settings, using defaults:', e.message);
  }
  applyConfigToDOM();
}

/**
 * Listen for storage changes (e.g., user toggling settings in popup/options).
 * This provides real-time sync between the popup and content script.
 */
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.wablurConfig) {
    config = { ...DEFAULT_CONFIG, ...changes.wablurConfig.newValue };
    applyConfigToDOM();
  }
});

/* --------------------------------------------------------------------------
 * DOM Class & Variable Application
 * -------------------------------------------------------------------------- */

/**
 * Applies the current config to <html> element classes and CSS custom properties.
 *
 * This is the SINGLE function that mutates the DOM based on settings. All other
 * blur behavior is CSS-only, driven by the classes/variables set here.
 *
 * SECURITY: No user-controlled strings are injected into HTML attributes or
 * innerHTML. We only toggle predefined class names and set numeric CSS variables.
 */
function applyConfigToDOM() {
  const html = document.documentElement;

  // Master toggle
  html.classList.toggle('wablur-disabled', !config.enabled);

  // Feature toggles – each adds a class that activates corresponding CSS rules.
  // blur.css uses selectors like html.wablur-names:not(.wablur-disabled) ...
  html.classList.toggle('wablur-names', config.blurNames);
  html.classList.toggle('wablur-previews', config.blurPreviews);
  html.classList.toggle('wablur-messages', config.blurMessages);
  html.classList.toggle('wablur-avatars', config.blurAvatars);

  // CSS custom properties – validated as numbers to prevent CSS injection.
  html.style.setProperty('--wablur-intensity', `${Number(config.blurIntensity) || 8}px`);
  html.style.setProperty('--wablur-transition-duration', `${Number(config.transitionDuration) || 0.25}s`);
  html.style.setProperty('--wablur-hover-proximity', `${Number(config.hoverProximity) || 0}px`);

  // Re-apply per-contact rules when config changes
  applyPerContactRules();

  // Announce to screen readers
  announceStateChange(
    config.enabled
      ? 'WaBLUR privacy blur is active'
      : 'WaBLUR privacy blur is disabled'
  );
}

/* --------------------------------------------------------------------------
 * Per-Contact Whitelist / Blacklist
 * -------------------------------------------------------------------------- */

/**
 * Scans all visible chat rows and applies data-wablur-contact attributes
 * based on the whitelist/blacklist configuration.
 *
 * SECURITY: Contact names from user config are compared using strict string
 * equality after trimming and lowercasing. No regex, no dynamic CSS selectors,
 * no eval – prevents selector injection and ReDoS attacks.
 */
function applyPerContactRules() {
  // Normalize lists to lowercase trimmed Sets for O(1) lookup
  const whiteset = new Set(
    (config.whitelist || []).map(n => String(n).trim().toLowerCase()).filter(Boolean)
  );
  const blackset = new Set(
    (config.blacklist || []).map(n => String(n).trim().toLowerCase()).filter(Boolean)
  );

  if (whiteset.size === 0 && blackset.size === 0) {
    // Optimization: if both lists are empty, remove all markers
    document.querySelectorAll('[data-wablur-contact]').forEach(el => {
      el.removeAttribute('data-wablur-contact');
    });
    return;
  }

  // Find all chat rows in the sidebar using stable selectors
  const chatRows = document.querySelectorAll(
    '#pane-side [data-testid="cell-frame-container"]'
  );

  chatRows.forEach(row => {
    // Extract contact name from the title span
    // [data-testid="cell-frame-title"] > span[title] is the most stable path
    const nameEl =
      row.querySelector('[data-testid="cell-frame-title"] span[title]') ||
      row.querySelector('span[dir="auto"][title]');

    if (!nameEl) return;

    const name = (nameEl.getAttribute('title') || '').trim().toLowerCase();
    if (!name) return;

    if (whiteset.has(name)) {
      row.setAttribute('data-wablur-contact', 'whitelisted');
    } else if (blackset.has(name)) {
      row.setAttribute('data-wablur-contact', 'blacklisted');
    } else {
      row.removeAttribute('data-wablur-contact');
    }
  });
}

/** Debounced version for use with MutationObserver (200ms) */
const debouncedApplyPerContact = debounce(applyPerContactRules, 200);

/* --------------------------------------------------------------------------
 * MutationObserver – Watch for Dynamic Chat Rows
 *
 * WhatsApp Web is a React SPA with virtualized lists. The chat list and
 * message history only render visible items, so new rows appear on scroll.
 * We watch for DOM additions to apply per-contact rules to new rows.
 *
 * PERFORMANCE: We observe only #pane-side (chat list) with childList+subtree,
 * and debounce the handler to avoid excessive processing during fast scroll.
 * -------------------------------------------------------------------------- */

let sideObserver = null;

function startObserver() {
  // Wait for #pane-side to exist (WhatsApp SPA may not have rendered yet)
  const sidePanel = document.querySelector('#pane-side');
  if (!sidePanel) {
    setTimeout(startObserver, 1000);
    return;
  }

  sideObserver = new MutationObserver((mutations) => {
    // Only re-process if nodes were added (new chat rows rendered)
    const hasAdditions = mutations.some(m => m.addedNodes.length > 0);
    if (hasAdditions) {
      debouncedApplyPerContact();
    }
  });

  sideObserver.observe(sidePanel, {
    childList: true,
    subtree: true,
    // PERFORMANCE: We don't watch attributes or characterData – only structure
  });
}

/* --------------------------------------------------------------------------
 * Hover Delay (Optional JS Enhancement)
 *
 * If hoverDelay > 0, we overlay JS-driven reveal timing on top of CSS.
 * When hoverDelay is 0 (default), pure CSS :hover handles everything.
 *
 * PERFORMANCE: Event listeners use event delegation on container elements
 * (#pane-side, [data-testid="conversation-panel-messages"]) instead of
 * attaching per-element listeners.
 * -------------------------------------------------------------------------- */

const hoverDelayTimers = new WeakMap();

function setupHoverDelay() {
  if (config.hoverDelay <= 0) return;

  const selectors = [
    '#pane-side',
    '[data-testid="conversation-panel-messages"]',
    '#main',
  ];

  selectors.forEach(sel => {
    const container = document.querySelector(sel);
    if (!container) return;

    // Delegated mouseover – find the closest blurrable ancestor
    container.addEventListener('mouseover', (e) => {
      const target = e.target.closest(
        '[data-testid="cell-frame-container"], [role="row"], [role="gridcell"], [role="listitem"], [data-testid="msg-container"], .message-in, .message-out, [data-id*="false_"], [data-id*="true_"], [data-testid*="pinned"], [data-testid="pinned-message-banner"], [aria-label*="pinned" i], [aria-label*="disematkan" i], [data-testid="msg-image"], [data-testid="image-thumb"], [data-testid*="media"], img, video'
      );
      if (!target) return;

      // Clear any pending leave timer
      const existing = hoverDelayTimers.get(target);
      if (existing) clearTimeout(existing);

      // Delayed reveal
      const timer = setTimeout(() => {
        target.classList.add('wablur-revealed');
      }, config.hoverDelay);
      hoverDelayTimers.set(target, timer);
    }, { passive: true });

    // Delegated mouseout – immediately remove reveal
    container.addEventListener('mouseout', (e) => {
      const target = e.target.closest(
        '[data-testid="cell-frame-container"], [role="row"], [role="gridcell"], [role="listitem"], [data-testid="msg-container"], .message-in, .message-out, [data-id*="false_"], [data-id*="true_"], [data-testid*="pinned"], [data-testid="pinned-message-banner"], [aria-label*="pinned" i], [aria-label*="disematkan" i], [data-testid="msg-image"], [data-testid="image-thumb"], [data-testid*="media"], img, video'
      );
      if (!target) return;

      const existing = hoverDelayTimers.get(target);
      if (existing) clearTimeout(existing);

      target.classList.remove('wablur-revealed');
      hoverDelayTimers.delete(target);
    }, { passive: true });
  });
}

/* --------------------------------------------------------------------------
 * Message Handling – Communication with Background / Popup
 *
 * SECURITY: We validate message structure and verify sender identity before
 * processing. Only messages with known 'action' values are handled.
 * -------------------------------------------------------------------------- */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // SECURITY: Verify the message originates from our own extension
  if (sender.id !== chrome.runtime.id) return;

  // Validate message shape
  if (!message || typeof message.action !== 'string') return;

  switch (message.action) {
    case 'toggle-blur':
      config.enabled = !config.enabled;
      persistConfig();
      applyConfigToDOM();
      sendResponse({ enabled: config.enabled });
      break;

    case 'temp-reveal':
      temporaryReveal();
      sendResponse({ ok: true });
      break;

    case 'get-status':
      sendResponse({ enabled: config.enabled, config: { ...config } });
      break;

    case 'reload-config':
      loadSettings().then(() => sendResponse({ ok: true }));
      return true; // async response

    default:
      // SECURITY: Silently ignore unknown actions
      break;
  }

  return true;
});

/* --------------------------------------------------------------------------
 * Temporary Reveal
 *
 * Adds wablur-temp-reveal class to <html> that overrides all blur rules.
 * Automatically removed after config.tempRevealDuration milliseconds.
 * User can press Escape to cancel early.
 * -------------------------------------------------------------------------- */

let tempRevealTimer = null;

function temporaryReveal() {
  const html = document.documentElement;
  html.classList.add('wablur-temp-reveal');

  if (tempRevealTimer) clearTimeout(tempRevealTimer);

  tempRevealTimer = setTimeout(() => {
    html.classList.remove('wablur-temp-reveal');
    tempRevealTimer = null;
    announceStateChange('WaBLUR temporary reveal ended');
  }, config.tempRevealDuration || 3000);

  announceStateChange('WaBLUR temporarily revealing all content');
}

/* --------------------------------------------------------------------------
 * Config Persistence Helper
 * -------------------------------------------------------------------------- */

async function persistConfig() {
  try {
    // SECURITY: We only write our own config key, never touching other storage
    await chrome.storage.local.set({ wablurConfig: { ...config } });
  } catch (e) {
    console.warn('[WaBLUR] Failed to persist config:', e.message);
  }
}

/* --------------------------------------------------------------------------
 * In-Page Keyboard Listener
 *
 * Handles Escape to cancel temporary reveal. Global hotkeys (Alt+Shift+B/R)
 * are handled by the background service worker via chrome.commands.
 * -------------------------------------------------------------------------- */

document.addEventListener('keydown', (e) => {
  if (
    e.key === 'Escape' &&
    document.documentElement.classList.contains('wablur-temp-reveal')
  ) {
    document.documentElement.classList.remove('wablur-temp-reveal');
    if (tempRevealTimer) {
      clearTimeout(tempRevealTimer);
      tempRevealTimer = null;
    }
    announceStateChange('WaBLUR temporary reveal cancelled');
  }
}, { passive: true });

/* --------------------------------------------------------------------------
 * ARIA Announcements (Accessibility)
 *
 * Creates a visually hidden live region that announces blur state changes
 * to screen readers, ensuring keyboard/AT users know when blur toggles.
 * -------------------------------------------------------------------------- */

function announceStateChange(message) {
  let announcer = document.getElementById('wablur-announcer');

  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'wablur-announcer';
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    // Visually hidden but accessible to screen readers
    Object.assign(announcer.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: '0',
    });
    // SECURITY: appendChild is safe – we control the element entirely
    document.body.appendChild(announcer);
  }

  // SECURITY: textContent is used instead of innerHTML to prevent XSS
  announcer.textContent = message;
}

/* --------------------------------------------------------------------------
 * Initialization
 * -------------------------------------------------------------------------- */

async function init() {
  await loadSettings();
  startObserver();

  // Setup optional hover delay if configured
  if (config.hoverDelay > 0) {
    setupHoverDelay();
  }

  console.log(
    `[WaBLUR] Content script initialized. Blur: ${config.enabled ? 'ON' : 'OFF'}`
  );
}

// Launch – run_at: document_idle should ensure DOM is ready, but be safe
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
