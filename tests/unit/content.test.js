/* ==========================================================================
 * WaBLUR – Unit Tests
 * ==========================================================================
 * These tests verify the core logic of the content script in isolation.
 * They can be run with any test runner (Jest, Mocha, Vitest, etc.)
 *
 * Since the content script runs in a browser context, these tests mock
 * the chrome.* APIs and DOM as needed.
 *
 * SETUP: npm install --save-dev jest jsdom
 *        npx jest tests/unit/content.test.js
 * ========================================================================== */

'use strict';

/* --------------------------------------------------------------------------
 * Mock Setup
 * -------------------------------------------------------------------------- */

// Mock chrome.storage.local
const mockStorage = {};
const chromeStorageMock = {
  local: {
    get: jest.fn((key) => {
      return Promise.resolve(
        typeof key === 'string' ? { [key]: mockStorage[key] } : {}
      );
    }),
    set: jest.fn((data) => {
      Object.assign(mockStorage, data);
      return Promise.resolve();
    }),
  },
  onChanged: {
    addListener: jest.fn(),
  },
};

// Mock chrome.runtime
const chromeRuntimeMock = {
  id: 'test-extension-id',
  onMessage: {
    addListener: jest.fn(),
  },
  sendMessage: jest.fn(() => Promise.resolve()),
};

// Mock chrome.tabs
const chromeTabsMock = {
  query: jest.fn(() => Promise.resolve([])),
  sendMessage: jest.fn(() => Promise.resolve()),
};

// Assemble global chrome mock
global.chrome = {
  storage: chromeStorageMock,
  runtime: chromeRuntimeMock,
  tabs: chromeTabsMock,
  action: {
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn(),
  },
};

/* --------------------------------------------------------------------------
 * Test: Default Config
 * -------------------------------------------------------------------------- */

describe('DEFAULT_CONFIG', () => {
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

  test('has all expected keys', () => {
    const expectedKeys = [
      'enabled', 'blurNames', 'blurPreviews', 'blurMessages',
      'blurAvatars', 'blurMedia', 'blurIntensity', 'transitionDuration',
      'hoverProximity', 'hoverDelay', 'whitelist', 'blacklist',
      'tempRevealDuration',
    ];
    expect(Object.keys(DEFAULT_CONFIG).sort()).toEqual(expectedKeys.sort());
  });

  test('all boolean defaults are true (privacy-first)', () => {
    expect(DEFAULT_CONFIG.enabled).toBe(true);
    expect(DEFAULT_CONFIG.blurNames).toBe(true);
    expect(DEFAULT_CONFIG.blurPreviews).toBe(true);
    expect(DEFAULT_CONFIG.blurMessages).toBe(true);
    expect(DEFAULT_CONFIG.blurAvatars).toBe(true);
    expect(DEFAULT_CONFIG.blurMedia).toBe(true);
  });

  test('numeric defaults are positive', () => {
    expect(DEFAULT_CONFIG.blurIntensity).toBeGreaterThan(0);
    expect(DEFAULT_CONFIG.transitionDuration).toBeGreaterThan(0);
    expect(DEFAULT_CONFIG.tempRevealDuration).toBeGreaterThan(0);
  });

  test('whitelist and blacklist are empty arrays', () => {
    expect(DEFAULT_CONFIG.whitelist).toEqual([]);
    expect(DEFAULT_CONFIG.blacklist).toEqual([]);
  });
});

/* --------------------------------------------------------------------------
 * Test: Config Merge
 * -------------------------------------------------------------------------- */

describe('Config Merge', () => {
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

  test('partial stored config merges with defaults', () => {
    const stored = { enabled: false, blurIntensity: 15 };
    const merged = { ...DEFAULT_CONFIG, ...stored };

    expect(merged.enabled).toBe(false);
    expect(merged.blurIntensity).toBe(15);
    expect(merged.blurNames).toBe(true); // default preserved
    expect(merged.whitelist).toEqual([]); // default preserved
  });

  test('stored config with extra keys does not break merge', () => {
    const stored = { enabled: true, unknownKey: 'value' };
    const merged = { ...DEFAULT_CONFIG, ...stored };

    expect(merged.enabled).toBe(true);
    expect(merged.unknownKey).toBe('value'); // extra key kept
  });

  test('empty stored config uses all defaults', () => {
    const merged = { ...DEFAULT_CONFIG, ...{} };
    expect(merged).toEqual(DEFAULT_CONFIG);
  });
});

/* --------------------------------------------------------------------------
 * Test: Debounce
 * -------------------------------------------------------------------------- */

describe('debounce', () => {
  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('delays execution', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 200);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('coalesces rapid calls', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 200);

    debounced('a');
    debounced('b');
    debounced('c');

    jest.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c'); // last call wins
  });

  test('resets timer on each call', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 200);

    debounced();
    jest.advanceTimersByTime(150);
    debounced(); // reset
    jest.advanceTimersByTime(150);
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

/* --------------------------------------------------------------------------
 * Test: DOM Class Application
 * -------------------------------------------------------------------------- */

describe('applyConfigToDOM', () => {
  let html;

  beforeEach(() => {
    // Set up a minimal DOM
    document.documentElement.className = '';
    document.documentElement.style.cssText = '';
    html = document.documentElement;
  });

  function applyConfigToDOM(config) {
    html.classList.toggle('wablur-disabled', !config.enabled);
    html.classList.toggle('wablur-names', config.blurNames);
    html.classList.toggle('wablur-previews', config.blurPreviews);
    html.classList.toggle('wablur-messages', config.blurMessages);
    html.classList.toggle('wablur-avatars', config.blurAvatars);
    html.classList.toggle('wablur-media', config.blurMedia);
    html.style.setProperty('--wablur-intensity', `${Number(config.blurIntensity) || 8}px`);
    html.style.setProperty('--wablur-transition-duration', `${Number(config.transitionDuration) || 0.25}s`);
    html.style.setProperty('--wablur-hover-proximity', `${Number(config.hoverProximity) || 0}px`);
  }

  test('adds feature classes when enabled', () => {
    applyConfigToDOM({
      enabled: true,
      blurNames: true,
      blurPreviews: true,
      blurMessages: true,
      blurAvatars: true,
      blurMedia: true,
      blurIntensity: 8,
      transitionDuration: 0.25,
      hoverProximity: 0,
    });

    expect(html.classList.contains('wablur-disabled')).toBe(false);
    expect(html.classList.contains('wablur-names')).toBe(true);
    expect(html.classList.contains('wablur-previews')).toBe(true);
    expect(html.classList.contains('wablur-messages')).toBe(true);
    expect(html.classList.contains('wablur-avatars')).toBe(true);
    expect(html.classList.contains('wablur-media')).toBe(true);
  });

  test('adds wablur-disabled when enabled is false', () => {
    applyConfigToDOM({
      enabled: false,
      blurNames: true,
      blurPreviews: true,
      blurMessages: true,
      blurAvatars: true,
      blurMedia: true,
      blurIntensity: 8,
      transitionDuration: 0.25,
      hoverProximity: 0,
    });

    expect(html.classList.contains('wablur-disabled')).toBe(true);
  });

  test('sets CSS custom properties with correct units', () => {
    applyConfigToDOM({
      enabled: true,
      blurNames: true,
      blurPreviews: true,
      blurMessages: true,
      blurAvatars: true,
      blurMedia: true,
      blurIntensity: 15,
      transitionDuration: 0.5,
      hoverProximity: 20,
    });

    expect(html.style.getPropertyValue('--wablur-intensity')).toBe('15px');
    expect(html.style.getPropertyValue('--wablur-transition-duration')).toBe('0.5s');
    expect(html.style.getPropertyValue('--wablur-hover-proximity')).toBe('20px');
  });

  test('handles invalid intensity gracefully', () => {
    applyConfigToDOM({
      enabled: true,
      blurNames: true,
      blurPreviews: true,
      blurMessages: true,
      blurAvatars: true,
      blurMedia: true,
      blurIntensity: NaN,
      transitionDuration: 0.25,
      hoverProximity: 0,
    });

    expect(html.style.getPropertyValue('--wablur-intensity')).toBe('8px'); // fallback
  });

  test('removes feature class when toggle is false', () => {
    applyConfigToDOM({
      enabled: true,
      blurNames: false,
      blurPreviews: true,
      blurMessages: false,
      blurAvatars: true,
      blurMedia: false,
      blurIntensity: 8,
      transitionDuration: 0.25,
      hoverProximity: 0,
    });

    expect(html.classList.contains('wablur-names')).toBe(false);
    expect(html.classList.contains('wablur-previews')).toBe(true);
    expect(html.classList.contains('wablur-messages')).toBe(false);
    expect(html.classList.contains('wablur-avatars')).toBe(true);
    expect(html.classList.contains('wablur-media')).toBe(false);
  });
});

/* --------------------------------------------------------------------------
 * Test: Whitelist / Blacklist Sanitization
 * -------------------------------------------------------------------------- */

describe('Whitelist/Blacklist Sanitization', () => {
  function sanitizeList(input) {
    return [...new Set(
      input
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)
    )];
  }

  test('trims whitespace', () => {
    expect(sanitizeList('  Alice  \n  Bob  ')).toEqual(['Alice', 'Bob']);
  });

  test('removes empty lines', () => {
    expect(sanitizeList('Alice\n\n\nBob\n\n')).toEqual(['Alice', 'Bob']);
  });

  test('deduplicates entries', () => {
    expect(sanitizeList('Alice\nBob\nAlice\nBob')).toEqual(['Alice', 'Bob']);
  });

  test('handles empty input', () => {
    expect(sanitizeList('')).toEqual([]);
  });

  test('handles single entry', () => {
    expect(sanitizeList('Alice')).toEqual(['Alice']);
  });

  test('preserves special characters in names', () => {
    expect(sanitizeList('José\nO\'Brien\n日本語')).toEqual(['José', "O'Brien", '日本語']);
  });
});

/* --------------------------------------------------------------------------
 * Test: Message Validation
 * -------------------------------------------------------------------------- */

describe('Message Validation', () => {
  function isValidMessage(message, senderId) {
    if (senderId !== 'test-extension-id') return false;
    if (!message || typeof message.action !== 'string') return false;
    const validActions = ['toggle-blur', 'temp-reveal', 'get-status', 'reload-config'];
    return validActions.includes(message.action);
  }

  test('accepts valid toggle-blur message', () => {
    expect(isValidMessage({ action: 'toggle-blur' }, 'test-extension-id')).toBe(true);
  });

  test('accepts valid temp-reveal message', () => {
    expect(isValidMessage({ action: 'temp-reveal' }, 'test-extension-id')).toBe(true);
  });

  test('rejects message from foreign extension', () => {
    expect(isValidMessage({ action: 'toggle-blur' }, 'other-extension')).toBe(false);
  });

  test('rejects null message', () => {
    expect(isValidMessage(null, 'test-extension-id')).toBe(false);
  });

  test('rejects message without action', () => {
    expect(isValidMessage({ foo: 'bar' }, 'test-extension-id')).toBe(false);
  });

  test('rejects unknown action', () => {
    expect(isValidMessage({ action: 'steal-data' }, 'test-extension-id')).toBe(false);
  });

  test('rejects non-string action', () => {
    expect(isValidMessage({ action: 42 }, 'test-extension-id')).toBe(false);
  });
});

/* --------------------------------------------------------------------------
 * Test: Per-Contact Matching
 * -------------------------------------------------------------------------- */

describe('Per-Contact Matching', () => {
  function matchContact(name, whiteset, blackset) {
    const normalized = name.trim().toLowerCase();
    if (whiteset.has(normalized)) return 'whitelisted';
    if (blackset.has(normalized)) return 'blacklisted';
    return null;
  }

  const whiteset = new Set(['mom', 'work group']);
  const blackset = new Set(['nosy coworker']);

  test('matches whitelisted contact (case insensitive)', () => {
    expect(matchContact('Mom', whiteset, blackset)).toBe('whitelisted');
    expect(matchContact('MOM', whiteset, blackset)).toBe('whitelisted');
    expect(matchContact('  mom  ', whiteset, blackset)).toBe('whitelisted');
  });

  test('matches blacklisted contact', () => {
    expect(matchContact('Nosy Coworker', whiteset, blackset)).toBe('blacklisted');
  });

  test('returns null for unmatched contact', () => {
    expect(matchContact('Random Person', whiteset, blackset)).toBeNull();
  });

  test('whitelist takes priority over blacklist', () => {
    const both = new Set(['alice']);
    expect(matchContact('Alice', both, both)).toBe('whitelisted');
  });
});

