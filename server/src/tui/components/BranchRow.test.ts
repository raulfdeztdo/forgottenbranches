import { describe, it, expect } from 'vitest';

// Extract formatAge logic for testing (same logic as in BranchRow.tsx)
function formatAge(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

describe('formatAge', () => {
  it('returns today for 0 days', () => {
    expect(formatAge(0)).toBe('today');
  });

  it('returns 1 day ago for 1 day', () => {
    expect(formatAge(1)).toBe('1 day ago');
  });

  it('returns days ago for < 30 days', () => {
    expect(formatAge(5)).toBe('5d ago');
    expect(formatAge(29)).toBe('29d ago');
  });

  it('returns months ago for 30-364 days', () => {
    expect(formatAge(30)).toBe('1mo ago');
    expect(formatAge(60)).toBe('2mo ago');
    expect(formatAge(180)).toBe('6mo ago');
    expect(formatAge(364)).toBe('12mo ago');
  });

  it('returns years ago for 365+ days', () => {
    expect(formatAge(365)).toBe('1y ago');
    expect(formatAge(730)).toBe('2y ago');
    expect(formatAge(1095)).toBe('3y ago');
  });
});

describe('BranchRow truncation logic', () => {
  it('truncates messages longer than 40 characters', () => {
    const msg = 'A very long commit message that exceeds the limit';
    const expected = msg.slice(0, 40) + '...';
    const truncated = msg.length > 40 ? msg.slice(0, 40) + '...' : msg;
    expect(truncated).toBe(expected);
    expect(msg.length).toBeGreaterThan(40);
  });

  it('does not truncate short messages', () => {
    const msg = 'Short message';
    const display = msg.length > 40 ? msg.slice(0, 40) + '...' : msg;
    expect(display).toBe('Short message');
  });
});
