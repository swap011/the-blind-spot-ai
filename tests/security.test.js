import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtml, validateInput } from '../assets/js/engine/sanitization.js';

test('Security - sanitizeHtml prevents HTML injection and script tags', () => {
  const dirty = '<script>alert("XSS")</script><img src="x" onerror="stealCookie()"> & "quotes"';
  const clean = sanitizeHtml(dirty);

  assert.strictEqual(clean.includes('<script>'), false);
  assert.strictEqual(clean.includes('</script>'), false);
  assert.strictEqual(clean.includes('&lt;script&gt;'), true);
  assert.strictEqual(clean.includes('&quot;'), true);
});

test('Security - validateInput rejects invalid or excessively short context', () => {
  assert.strictEqual(validateInput(null).valid, false);
  assert.strictEqual(validateInput('').valid, false);
  assert.strictEqual(validateInput('short').valid, false);

  const good = 'This is a valid scenario context describing a dilemma.';
  const res = validateInput(good);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.sanitized, good);
});
