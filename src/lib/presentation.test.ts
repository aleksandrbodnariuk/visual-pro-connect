import { describe, expect, it } from 'vitest';
import { embedUrl, presentationLink, presentationPhase } from './presentation';

describe('presentation', () => {
  const start = Date.UTC(2026, 10, 10, 17, 0);
  it('phase follows the event window', () => {
    expect(presentationPhase(start - 1, start, 90)).toBe('before');
    expect(presentationPhase(start + 89 * 60000, start, 90)).toBe('live');
    expect(presentationPhase(start + 90 * 60000, start, 90)).toBe('after');
  });
  it('embeds YouTube only', () => {
    expect(embedUrl('https://youtu.be/abcdef123')).toBe('https://www.youtube.com/embed/abcdef123');
    expect(embedUrl('https://zoom.us/j/123')).toBeNull();
  });
  it('builds personal referral link', () => {
    expect(presentationLink('https://x.app', 'e1', 'u1')).toBe('https://x.app/presentation/e1?ref=u1');
  });
});

import { newMeetingRoomUrl, isMeetingRoom, embedUrl as _embed } from './presentation';
describe('online stage', () => {
  it('creates an unguessable meeting room', () => {
    const url = newMeetingRoomUrl(() => 'aaaa-bbbb');
    expect(url).toBe('https://meet.jit.si/BC-Team-aaaabbbb');
    expect(isMeetingRoom(url)).toBe(true);
    expect(isMeetingRoom('https://zoom.us/j/1')).toBe(false);
  });
  it('embeds vimeo', () => {
    expect(_embed('https://vimeo.com/123456')).toBe('https://player.vimeo.com/video/123456');
  });
});
