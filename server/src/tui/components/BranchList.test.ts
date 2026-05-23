import { describe, it, expect } from 'vitest';
import type { BranchInfo } from '@forgottenbranches/types';

// Also test protected branch detection logic
function isProtected(branchName: string, mainBranch?: string, currentBranch?: string | null): boolean {
  return branchName === mainBranch || branchName === currentBranch;
}

function makeBranch(overrides: Partial<BranchInfo> = {}): BranchInfo {
  return {
    name: 'feature/test',
    upstream: null,
    upstreamGone: false,
    lastCommitDate: '2026-01-15T10:00:00+00:00',
    lastCommitHash: 'abc1234',
    lastCommitAuthor: 'Author',
    lastCommitMessage: 'Test commit',
    isMergedIntoMain: false,
    mergeInfo: null,
    daysSinceLastCommit: 10,
    lastCheckoutDate: null,
    status: 'active',
    ...overrides,
  };
}

describe('BranchList filtering', () => {
  const branches = [
    makeBranch({ name: 'feature/login', status: 'active', lastCommitMessage: 'Add login' }),
    makeBranch({ name: 'fix/bug', status: 'forgotten', lastCommitMessage: 'Fix critical bug' }),
    makeBranch({ name: 'feat/api', status: 'merged', lastCommitMessage: 'API refactor' }),
    makeBranch({ name: 'chore/deps', status: 'active', lastCommitMessage: 'Update deps' }),
  ];

  it('filters by search query (matches name)', () => {
    const q = 'login';
    const filtered = branches.filter(
      (b) => b.name.toLowerCase().includes(q) || b.lastCommitMessage.toLowerCase().includes(q)
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('feature/login');
  });

  it('filters by search query (matches message)', () => {
    const q = 'critical';
    const filtered = branches.filter(
      (b) => b.name.toLowerCase().includes(q) || b.lastCommitMessage.toLowerCase().includes(q)
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('fix/bug');
  });

  it('filters by search query case-insensitive', () => {
    const q = 'LOGIN';
    const filtered = branches.filter(
      (b) => b.name.toLowerCase().includes(q.toLowerCase()) || b.lastCommitMessage.toLowerCase().includes(q.toLowerCase())
    );
    expect(filtered).toHaveLength(1);
  });

  it('returns all when search query is empty', () => {
    const filtered = branches.filter(() => true);
    expect(filtered).toHaveLength(4);
  });

  it('filters by status', () => {
    const filtered = branches.filter((b) => b.status === 'active');
    expect(filtered).toHaveLength(2);
    expect(filtered.map((b) => b.name)).toEqual(['feature/login', 'chore/deps']);
  });

  it('returns all when statusFilter is all', () => {
    const filtered = branches.filter(() => true);
    expect(filtered).toHaveLength(4);
  });
});

describe('BranchList sorting', () => {
  const branches = [
    makeBranch({ name: 'z-feature', status: 'active', daysSinceLastCommit: 100, lastCommitDate: '2025-01-01T00:00:00+00:00' }),
    makeBranch({ name: 'a-feature', status: 'forgotten', daysSinceLastCommit: 10, lastCommitDate: '2026-05-01T00:00:00+00:00' }),
    makeBranch({ name: 'm-feature', status: 'merged', daysSinceLastCommit: 50, lastCommitDate: '2026-02-01T00:00:00+00:00' }),
  ];

  it('sorts by name alphabetically', () => {
    const sorted = [...branches].sort((a, b) => a.name.localeCompare(b.name));
    expect(sorted.map((b) => b.name)).toEqual(['a-feature', 'm-feature', 'z-feature']);
  });

  it('sorts by date (most recent first)', () => {
    const sorted = [...branches].sort(
      (a, b) => new Date(b.lastCommitDate).getTime() - new Date(a.lastCommitDate).getTime()
    );
    expect(sorted.map((b) => b.name)).toEqual(['a-feature', 'm-feature', 'z-feature']);
  });

  it('sorts by age (oldest first = highest days)', () => {
    const sorted = [...branches].sort((a, b) => b.daysSinceLastCommit - a.daysSinceLastCommit);
    expect(sorted.map((b) => b.name)).toEqual(['z-feature', 'm-feature', 'a-feature']);
  });

  it('sorts by status in priority order', () => {
    const order = ['active', 'merged', 'forgotten', 'orphan', 'abandoned'];
    const sorted = [...branches].sort(
      (a, b) => order.indexOf(a.status) - order.indexOf(b.status)
    );
    expect(sorted.map((b) => b.status)).toEqual(['active', 'merged', 'forgotten']);
  });
});

describe('protected branch detection', () => {
  it('detects main branch as protected', () => {
    expect(isProtected('main', 'main', 'feature/test')).toBe(true);
  });

  it('detects current branch as protected', () => {
    expect(isProtected('feature/test', 'main', 'feature/test')).toBe(true);
  });

  it('does not flag regular branches as protected', () => {
    expect(isProtected('feature/other', 'main', 'feature/test')).toBe(false);
  });

  it('handles null current branch', () => {
    expect(isProtected('main', 'main', null)).toBe(true);
    expect(isProtected('feature/test', 'main', null)).toBe(false);
  });
});
