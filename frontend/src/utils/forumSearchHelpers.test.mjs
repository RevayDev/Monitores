import test from 'node:test';
import assert from 'node:assert/strict';
import { splitHighlightedText } from './forumSearchHelpers.js';

test('splitHighlightedText marks matching fragments case-insensitively', () => {
  assert.deepEqual(splitHighlightedText('Tema 2 prueba', 'tema'), [
    { text: 'Tema', match: true },
    { text: ' 2 prueba', match: false }
  ]);
});

test('splitHighlightedText returns original text when query is empty', () => {
  assert.deepEqual(splitHighlightedText('Foro 1', ''), [{ text: 'Foro 1', match: false }]);
});
