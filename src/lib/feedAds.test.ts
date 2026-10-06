import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interleaveAds, effectiveAdStatus } from './feedAds';

const posts = Array.from({ length: 25 }, (_, i) => i + 1);
const positions = (items: ReturnType<typeof interleaveAds<number, string>>) => {
  let count = 0; const at: number[] = [];
  items.forEach((it) => { if (it.kind === 'post') count++; else at.push(count); });
  return at;
};

test('перша реклама після 4-го допису, далі кожні 9', () => {
  assert.deepEqual(positions(interleaveAds(posts, ['a'])), [4, 13, 22]);
});

test('без реклами стрічка не змінюється', () => {
  assert.equal(interleaveAds(posts, []).length, 25);
});

test('коротка стрічка (3 дописи) без реклами', () => {
  assert.deepEqual(positions(interleaveAds([1, 2, 3], ['a'])), []);
});

test('оголошення чергуються', () => {
  const ads = interleaveAds(posts, ['a', 'b']).filter((i) => i.kind === 'ad').map((i: any) => i.ad);
  assert.deepEqual(ads, ['a', 'b', 'a']);
});

test('вичерпаний ліміт показів = завершена', () => {
  const base = { status: 'active', start_date: '2020-01-01', end_date: '2999-01-01', target_views: 100, views_count: 100 };
  assert.equal(effectiveAdStatus(base), 'completed');
  assert.equal(effectiveAdStatus({ ...base, views_count: 5 }), 'active');
});
