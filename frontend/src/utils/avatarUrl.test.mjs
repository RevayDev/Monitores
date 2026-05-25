import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAvatarUrl } from './avatarUrl.js';

test('resolveAvatarUrl keeps absolute avatar URL', () => {
  assert.equal(resolveAvatarUrl('https://cdn.test/a.png', 'http://localhost:3000/api'), 'https://cdn.test/a.png');
});

test('resolveAvatarUrl uses API origin for uploaded paths', () => {
  assert.equal(resolveAvatarUrl('/uploads/a.png', 'http://localhost:3000/api'), 'http://localhost:3000/uploads/a.png');
});
