import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPortfolioMediaSources, PORTFOLIO_MEDIA_ORDER } from './portfolioPresentation';

test('audio with a cover plays the song, never the cover image', () => {
  const result = getPortfolioMediaSources({ media_type: 'audio', media_url: 'song.mp3', media_preview_url: 'cover.webp', media_display_url: 'large.webp' });
  assert.equal(result.playbackUrl, 'song.mp3');
  assert.equal(result.coverUrl, 'cover.webp');
});
test('legacy audio without a cover keeps its source and has no image', () => {
  assert.deepEqual(getPortfolioMediaSources({ media_type: 'audio', media_url: 'old.mp3' }), { playbackUrl: 'old.mp3', coverUrl: null });
});
test('collections separate music, video and photos in stable order', () => {
  assert.deepEqual(PORTFOLIO_MEDIA_ORDER, ['audio', 'video', 'photo']);
});