import test from 'node:test';
import assert from 'node:assert/strict';
import { getPageItems, getPageNumbers, parseLogMetadata } from './adminDashboardHelpers.js';

test('getPageItems returns only five reports for page two', () => {
  const items = Array.from({ length: 12 }, (_, index) => ({ id: index + 1 }));
  assert.deepEqual(getPageItems(items, 2, 5).map((item) => item.id), [6, 7, 8, 9, 10]);
});

test('getPageNumbers returns numeric navigation pages', () => {
  assert.deepEqual(getPageNumbers(12, 5), [1, 2, 3]);
});

test('parseLogMetadata handles invalid JSON safely', () => {
  assert.deepEqual(parseLogMetadata('{bad json'), {});
});
