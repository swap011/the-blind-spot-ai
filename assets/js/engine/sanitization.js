/**
 * @fileoverview Input sanitization and validation utilities for The Blind Spot.
 *
 * All user-supplied strings MUST be passed through {@link sanitizeHtml} before
 * insertion into the DOM to prevent cross-site scripting (XSS) attacks.
 *
 * @module sanitization
 */

/**
 * HTML entity map used by sanitizeHtml.
 * @type {Readonly<Record<string, string>>}
 */
const HTML_ENTITY_MAP = Object.freeze({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
});

/** Pre-compiled regex matching all characters that need HTML escaping. */
const UNSAFE_CHARS_RE = /[&<>"'`=/]/g;

/**
 * Escapes a string for safe insertion into HTML contexts.
 * Replaces `&`, `<`, `>`, `"`, `'`, `` ` ``, `/`, and `=` with their
 * corresponding HTML entities to prevent XSS injection.
 *
 * @param {unknown} value - The value to sanitize. Non-strings are coerced to ''.
 * @returns {string} The HTML-entity-escaped string.
 *
 * @example
 * sanitizeHtml('<script>alert(1)</script>');
 * // → '&lt;script&gt;alert(1)&lt;&#x2F;script&gt;'
 */
export function sanitizeHtml(value) {
  if (typeof value !== 'string') return '';
  return value.replace(UNSAFE_CHARS_RE, (ch) => HTML_ENTITY_MAP[ch]);
}

/**
 * Validates and trims a user-supplied decision context string.
 *
 * @param {unknown} text    - Raw input from the user.
 * @param {number}  [minLen=10] - Minimum accepted character length (after trim).
 * @param {number}  [maxLen=8000] - Maximum accepted character length (after trim).
 * @returns {{ valid: true, sanitized: string } | { valid: false, error: string }}
 *
 * @example
 * validateInput('hi', 10);
 * // → { valid: false, error: 'Please provide at least 10 characters...' }
 *
 * validateInput('  A valid context string.  ', 10);
 * // → { valid: true, sanitized: 'A valid context string.' }
 */
export function validateInput(text, minLen = 10, maxLen = 8_000) {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: 'Please provide a decision context to analyze.' };
  }

  const trimmed = text.trim();

  if (trimmed.length < minLen) {
    return {
      valid: false,
      error: `Please provide at least ${minLen} characters of context for a meaningful analysis.`,
    };
  }

  if (trimmed.length > maxLen) {
    return {
      valid: false,
      error: `Context exceeds the ${maxLen.toLocaleString()}-character limit. Please shorten it.`,
    };
  }

  return { valid: true, sanitized: trimmed };
}
