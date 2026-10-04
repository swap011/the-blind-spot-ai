/**
 * Input sanitization and security utilities.
 * Ensures all user inputs are safely escaped before DOM insertion.
 */

export function sanitizeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function validateInput(text, minLen = 10, maxLen = 8000) {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: 'Please provide decision context to analyze.' };
  }
  const trimmed = text.trim();
  if (trimmed.length < minLen) {
    return { valid: false, error: `Please provide at least ${minLen} characters of context for meaningful analysis.` };
  }
  if (trimmed.length > maxLen) {
    return { valid: false, error: `Context exceeds maximum limit of ${maxLen} characters.` };
  }
  return { valid: true, sanitized: trimmed };
}
