import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeProtocolPhotos } from './protocolPhotosMerge';

const a = { url: 'a', label: 'A' }, b = { url: 'b', label: 'B' }, c = { url: 'c', label: 'C' };

test('фото колеги, завантажене паралельно, не губиться', () => {
  assert.deepEqual(mergeProtocolPhotos([a, b], [a], [a, c]).map((p) => p.url), ['a', 'c', 'b']);
});

test('свідомо видалене фото не повертається', () => {
  assert.deepEqual(mergeProtocolPhotos([a, b], [a, b], [b]).map((p) => p.url), ['b']);
});
