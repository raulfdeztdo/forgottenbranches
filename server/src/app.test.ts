import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import path from 'path';

// ── Mock fs for validateRepo ──
const gitRepos = new Set<string>();

vi.mock('fs', () => ({
  default: {
    existsSync: (p: string) => {
      if (p === '/nonexistent') return false;
      if (p.endsWith(path.sep + '.git') || p.endsWith('/.git')) {
        return gitRepos.has(p.replace(/(\/|\\).git$/, ''));
      }
      return true;
    },
    statSync: (p: string) => ({
      isDirectory: () => true,
    }),
  },
  existsSync: (p: string) => {
    if (p === '/nonexistent') return false;
    if (p.endsWith(path.sep + '.git') || p.endsWith('/.git')) {
      return gitRepos.has(p.replace(/(\/|\\).git$/, ''));
    }
    return true;
  },
  statSync: (p: string) => ({
    isDirectory: () => true,
  }),
}));

function registerRepo(repoPath: string) {
  gitRepos.add(repoPath);
}

const mockGetBranches = vi.fn();
const mockDeleteBranch = vi.fn();
const mockDeleteBranches = vi.fn();
const mockDetectMainBranch = vi.fn();
const mockArchiveBranch = vi.fn();
const mockArchiveBranches = vi.fn();
const mockRestoreArchivedBranch = vi.fn();
const mockDeleteArchivedBranch = vi.fn();
const mockGetArchivedBranches = vi.fn();

vi.mock('./git', () => ({
  getBranches: (...args: unknown[]) => mockGetBranches(...args),
  deleteBranch: (...args: unknown[]) => mockDeleteBranch(...args),
  deleteBranches: (...args: unknown[]) => mockDeleteBranches(...args),
  detectMainBranch: (...args: unknown[]) => mockDetectMainBranch(...args),
  archiveBranch: (...args: unknown[]) => mockArchiveBranch(...args),
  archiveBranches: (...args: unknown[]) => mockArchiveBranches(...args),
  restoreArchivedBranch: (...args: unknown[]) => mockRestoreArchivedBranch(...args),
  deleteArchivedBranch: (...args: unknown[]) => mockDeleteArchivedBranch(...args),
  getArchivedBranches: (...args: unknown[]) => mockGetArchivedBranches(...args),
}));

import { createApp } from './app';

const REPO = '/fake/repo';

function app() {
  return createApp();
}

function makeBranch(overrides: Record<string, unknown> = {}) {
  return {
    name: 'feature/test',
    upstream: 'origin/feature/test',
    upstreamGone: false,
    lastCommitDate: '2026-05-20 12:00:00 +0000',
    lastCommitHash: 'abc1234',
    lastCommitAuthor: 'Test Author',
    lastCommitMessage: 'Test commit message',
    isMergedIntoMain: false,
    mergeInfo: null,
    daysSinceLastCommit: 2,
    lastCheckoutDate: '2026-05-19 10:00:00 +0000',
    status: 'active',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  gitRepos.clear();
  registerRepo(REPO);
});

describe('GET /api/branches', () => {
  it('returns 400 when path is missing', async () => {
    const res = await request(app()).get('/api/branches');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('path');
  });

  it('returns 400 when path does not exist', async () => {
    const res = await request(app()).get('/api/branches?path=/nonexistent');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('does not exist');
  });

  it('returns 400 when path is not a git repo', async () => {
    // Use /tmp which is registered as a directory but not a git repo
    const res = await request(app()).get('/api/branches?path=/tmp');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Not a git repository');
  });

  it('returns branches data for valid repo', async () => {
    const mockResult = {
      branches: [makeBranch(), makeBranch({ name: 'feature/2', status: 'merged' })],
      mainBranch: 'main',
      totalLocal: 2,
      totalForgotten: 0,
    };
    mockGetBranches.mockResolvedValue(mockResult);

    const res = await request(app()).get(`/api/branches?path=${encodeURIComponent(REPO)}`);

    expect(res.status).toBe(200);
    expect(res.body.branches).toHaveLength(2);
    expect(res.body.mainBranch).toBe('main');
    expect(res.body.totalLocal).toBe(2);
  });
});

describe('DELETE /api/branches', () => {
  it('returns 400 when path is missing', async () => {
    const res = await request(app()).delete('/api/branches');
    expect(res.status).toBe(400);
  });

  it('deletes a branch successfully', async () => {
    mockDeleteBranch.mockResolvedValue({ success: true, message: 'Deleted' });

    const res = await request(app())
      .delete(`/api/branches?path=${encodeURIComponent(REPO)}&branch=feature/to-delete`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockDeleteBranch).toHaveBeenCalledWith(REPO, 'feature/to-delete', false, undefined);
  });

  it('passes force flag', async () => {
    mockDeleteBranch.mockResolvedValue({ success: true, message: 'Force deleted' });

    const res = await request(app())
      .delete(`/api/branches?path=${encodeURIComponent(REPO)}&branch=feature/stuck&force=true`);

    expect(res.status).toBe(200);
    expect(mockDeleteBranch).toHaveBeenCalledWith(REPO, 'feature/stuck', true, undefined);
  });

  it('handles error when delete fails', async () => {
    mockDeleteBranch.mockRejectedValue(new Error('Git error'));

    const res = await request(app())
      .delete(`/api/branches?path=${encodeURIComponent(REPO)}&branch=feature/error`);

    expect(res.status).toBe(500);
  });
});

describe('POST /api/branches/bulk-delete', () => {
  it('returns 400 when path is missing', async () => {
    const res = await request(app())
      .post('/api/branches/bulk-delete')
      .send({ branches: ['feature/a'] });

    expect(res.status).toBe(400);
  });

  it('bulk deletes branches', async () => {
    mockDeleteBranches.mockResolvedValue({
      success: true,
      results: [
        { branch: 'feature/a', success: true, message: 'Deleted' },
        { branch: 'feature/b', success: true, message: 'Deleted' },
      ],
    });

    const res = await request(app())
      .post('/api/branches/bulk-delete')
      .send({ path: REPO, branches: ['feature/a', 'feature/b'], force: false });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockDeleteBranches).toHaveBeenCalledWith(REPO, ['feature/a', 'feature/b'], false, undefined);
  });
});

describe('POST /api/branches/archive', () => {
  it('archive branches (bulk)', async () => {
    mockDetectMainBranch.mockResolvedValue('main');
    mockArchiveBranches.mockResolvedValue({
      success: true,
      results: [
        { branch: 'feature/a', success: true, message: 'Archived' },
        { branch: 'feature/b', success: true, message: 'Archived' },
      ],
    });

    const res = await request(app())
      .post('/api/branches/archive')
      .send({ path: REPO, branches: ['feature/a', 'feature/b'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockArchiveBranches).toHaveBeenCalledWith(REPO, ['feature/a', 'feature/b'], 'main');
  });

  it('archive single branch', async () => {
    mockDetectMainBranch.mockResolvedValue('main');
    mockArchiveBranch.mockResolvedValue({ success: true, message: 'Archived' });

    const res = await request(app())
      .post('/api/branches/archive')
      .send({ path: REPO, branches: ['feature/a'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockArchiveBranch).toHaveBeenCalledWith(REPO, 'feature/a', 'main');
  });
});

describe('GET /api/branches/archived', () => {
  it('returns archived branches', async () => {
    const mockArchived = [
      {
        name: 'feature/old',
        archivedAt: '2026-01-01 10:00:00 +0000',
        commitHash: 'def5678',
        commitAuthor: 'Author',
        commitDate: '2025-12-20 10:00:00 +0000',
        commitMessage: 'Old feature',
      },
    ];
    mockGetArchivedBranches.mockResolvedValue(mockArchived);

    const res = await request(app())
      .get(`/api/branches/archived?path=${encodeURIComponent(REPO)}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('feature/old');
  });
});

describe('POST /api/branches/unarchive', () => {
  it('restores an archived branch', async () => {
    mockRestoreArchivedBranch.mockResolvedValue({ success: true, message: 'Restored' });

    const res = await request(app())
      .post('/api/branches/unarchive')
      .send({ path: REPO, branch: 'feature/old' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockRestoreArchivedBranch).toHaveBeenCalledWith(REPO, 'feature/old');
  });
});

describe('DELETE /api/branches/archived', () => {
  it('permanently deletes archive', async () => {
    mockDeleteArchivedBranch.mockResolvedValue({ success: true, message: 'Deleted' });

    const res = await request(app())
      .delete(`/api/branches/archived?path=${encodeURIComponent(REPO)}&branch=feature/old`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockDeleteArchivedBranch).toHaveBeenCalledWith(REPO, 'feature/old');
  });
});
