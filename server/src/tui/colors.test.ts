import { describe, it, expect } from 'vitest';
import { COLORS, STATUS_COLORS } from './colors';

describe('COLORS', () => {
  it('contains all required color keys', () => {
    expect(COLORS).toHaveProperty('bg');
    expect(COLORS).toHaveProperty('bgSecondary');
    expect(COLORS).toHaveProperty('text');
    expect(COLORS).toHaveProperty('textSecondary');
    expect(COLORS).toHaveProperty('accent');
    expect(COLORS).toHaveProperty('danger');
    expect(COLORS).toHaveProperty('warning');
    expect(COLORS).toHaveProperty('success');
    expect(COLORS).toHaveProperty('purple');
    expect(COLORS).toHaveProperty('yellow');
    expect(COLORS).toHaveProperty('gray');
    expect(COLORS).toHaveProperty('white');
  });

  it('has valid hex color values', () => {
    const hexRe = /^#[0-9a-fA-F]{6}$/;
    for (const [key, value] of Object.entries(COLORS)) {
      expect(value).toMatch(hexRe);
    }
  });
});

describe('STATUS_COLORS', () => {
  it('maps all 5 branch statuses to colors', () => {
    expect(STATUS_COLORS).toHaveProperty('active');
    expect(STATUS_COLORS).toHaveProperty('forgotten');
    expect(STATUS_COLORS).toHaveProperty('merged');
    expect(STATUS_COLORS).toHaveProperty('orphan');
    expect(STATUS_COLORS).toHaveProperty('abandoned');
  });

  it('has valid hex color values for all statuses', () => {
    const hexRe = /^#[0-9a-fA-F]{6}$/;
    for (const [, value] of Object.entries(STATUS_COLORS)) {
      expect(value).toMatch(hexRe);
    }
  });
});
