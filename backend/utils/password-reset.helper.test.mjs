import test from 'node:test';
import assert from 'node:assert/strict';
import { buildResetLink, createResetToken, getResetExpiry, hashResetToken } from './password-reset.helper.js';

test('createResetToken returns unique URL-safe values', () => {
  const first = createResetToken();
  const second = createResetToken();
  assert.notEqual(first, second);
  assert.match(first, /^[A-Za-z0-9_-]+$/);
});

test('hashResetToken does not expose the raw token', () => {
  const token = 'abc123';
  const hashed = hashResetToken(token);
  assert.equal(hashed.length, 64);
  assert.notEqual(hashed, token);
});

test('getResetExpiry lasts five minutes', () => {
  const now = new Date('2026-05-23T12:00:00.000Z');
  assert.equal(getResetExpiry(now).toISOString(), '2026-05-23T12:05:00.000Z');
});

test('buildResetLink points to reset-password route', () => {
  assert.equal(buildResetLink('https://app.test/', 'tok+en'), 'https://app.test/reset-password/tok%2Ben');
});
