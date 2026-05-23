import { describe, it, expect, vi, beforeEach } from 'vitest';

const execFileMock = vi.fn();
vi.mock('child_process', () => ({
  execFile: (...args: unknown[]) => {
    const cb = args[args.length - 1] as (err: Error | null, stdout?: { stdout: string; stderr: string }) => void;
    try {
      const result = execFileMock(...args);
      if (result instanceof Error) {
        cb(result);
      } else {
        cb(null, { stdout: result ?? '', stderr: '' });
      }
    } catch (err) {
      cb(err instanceof Error ? err : new Error(String(err)));
    }
  },
}));

import {
  detectMainBranch,
  getBranches,
  deleteBranch,
  archiveBranch,
  archiveBranches,
  restoreArchivedBranch,
  deleteArchivedBranch,
  getArchivedBranches,
  deleteBranches,
} from './git.js';

const REPO = '/fake/repo';

beforeEach(() => {
  execFileMock.mockReset();
});

// ── fixtures ──

function fixtureBranches(branches: string[]): string {
  return branches.map((name) => `${name}|||abc1234|2025-06-01 12:00:00 +0000|Author|Commit message for ${name}`).join('\n');
}

function fixtureBranchesFull(lines: string[]): string {
  return lines.join('\n');
}

function fixtureMergedBranches(mainBranch: string): string {
  return `feature/merged\nfix/merged\n${mainBranch}\n`;
}

function fixtureReflog(entries: string[]): string {
  // Format: "HEAD@{date} checkout: moving from SOURCE to DEST"
  return entries.join('\n');
}

function fixtureCurrentBranch(name: string): string {
  return `  main\n* ${name}\n  feature/test\n`;
}

function fixtureTags(tags: string[]): string {
  return tags.join('\n');
}

function fixtureTagsDetailed(lines: string[]): string {
  return lines.join('\n');
}

function expectGitCall(args: string[]) {
  expect(execFileMock).toHaveBeenCalledWith('git', args, expect.objectContaining({ cwd: REPO }), expect.any(Function));
}

// ── detectMainBranch ──

describe('detectMainBranch', () => {
  it('returns main when main exists', async () => {
    execFileMock.mockReturnValue('main\nfeature/test\nfix/bug\n');
    const result = await detectMainBranch(REPO);
    expect(result).toBe('main');
  });

  it('returns master when main does not exist', async () => {
    execFileMock.mockReturnValue('master\nfeature/test\nfix/bug\n');
    const result = await detectMainBranch(REPO);
    expect(result).toBe('master');
  });

  it('returns first branch when neither main nor master exist', async () => {
    execFileMock.mockReturnValue('develop\nfeature/test\n');
    const result = await detectMainBranch(REPO);
    expect(result).toBe('develop');
  });

  it('returns main when repo has no branches at all', async () => {
    execFileMock.mockReturnValue('');
    const result = await detectMainBranch(REPO);
    expect(result).toBe('main');
  });
});

// ── getBranches ──

describe('getBranches', () => {
  it('returns empty result when repo has no branches', async () => {
    execFileMock.mockReturnValueOnce('main\n'); // detectMainBranch
    execFileMock
      .mockReturnValueOnce('') // for-each-ref
      .mockReturnValueOnce('') // --merged
      .mockReturnValueOnce(''); // reflog

    const result = await getBranches(REPO);

    expect(result.mainBranch).toBe('main');
    expect(result.branches).toEqual([]);
    expect(result.totalLocal).toBe(0);
    expect(result.totalForgotten).toBe(0);
    expect(execFileMock).toHaveBeenCalledTimes(5);
  });

  it('classifies an active branch correctly', async () => {
    const recentDate = new Date().toISOString().replace('T', ' ').replace('Z', ' +0000');

    execFileMock.mockReturnValueOnce('main\nfeature/active\n'); // detectMainBranch
    execFileMock
      .mockReturnValueOnce(
        fixtureBranchesFull([
          `feature/active|origin/feature/active||abc1234|${recentDate}|Author|Active feature dev`,
        ])
      ) // for-each-ref
      .mockReturnValueOnce('') // --merged (not merged)
      .mockReturnValueOnce(''); // reflog

    const result = await getBranches(REPO);

    expect(result.mainBranch).toBe('main');
    expect(result.branches).toHaveLength(1);
    expect(result.branches[0].name).toBe('feature/active');
    expect(result.branches[0].status).toBe('active');
    expect(result.branches[0].isMergedIntoMain).toBe(false);
    expect(result.branches[0].upstream).toBe('origin/feature/active');
    expect(result.branches[0].upstreamGone).toBe(false);
  });

  it('classifies a merged branch with [gone] upstream as forgotten', async () => {
    execFileMock.mockReturnValueOnce('main\nfeature/forgotten\n'); // detectMainBranch
    execFileMock
      .mockReturnValueOnce(
        fixtureBranchesFull([
          'feature/forgotten|origin/feature/forgotten|[gone]|abc1234|2025-06-01 12:00:00 +0000|Author|Old merged feature',
        ])
      ) // for-each-ref
      .mockReturnValueOnce('feature/forgotten\nmain\n') // --merged
      .mockReturnValueOnce(''); // reflog
    execFileMock.mockReturnValueOnce(''); // --merges --ancestry-path (no merge commit found)

    const result = await getBranches(REPO);

    expect(result.branches[0].status).toBe('forgotten');
    expect(result.totalForgotten).toBe(1);
  });

  it('classifies a branch with [gone] upstream but not merged as orphan', async () => {
    execFileMock.mockReturnValueOnce('main\nfeature/orphan\n'); // detectMainBranch
    execFileMock
      .mockReturnValueOnce(
        fixtureBranchesFull([
          'feature/orphan|origin/feature/orphan|[gone]|abc1234|2025-06-01 12:00:00 +0000|Author|Not merged',
        ])
      ) // for-each-ref
      .mockReturnValueOnce('') // --merged (not merged)
      .mockReturnValueOnce(''); // reflog

    const result = await getBranches(REPO);

    expect(result.branches[0].status).toBe('orphan');
    expect(result.totalForgotten).toBe(1);
  });

  it('classifies a merged branch with live upstream as merged', async () => {
    execFileMock.mockReturnValueOnce('main\nfeature/merged\n'); // detectMainBranch
    execFileMock
      .mockReturnValueOnce(
        fixtureBranchesFull([
          'feature/merged|origin/feature/merged||abc1234|2025-06-01 12:00:00 +0000|Author|Merged feature',
        ])
      ) // for-each-ref
      .mockReturnValueOnce('feature/merged\nmain\n') // --merged
      .mockReturnValueOnce(''); // reflog

    const result = await getBranches(REPO);

    expect(result.branches[0].status).toBe('merged');
  });

  it('classifies a branch with >90 days since last commit as abandoned', async () => {
    const oldDate = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .replace('Z', ' +0000');

    execFileMock.mockReturnValueOnce('main\nfeature/abandoned\n');
    execFileMock
      .mockReturnValueOnce(
        fixtureBranchesFull([
          `feature/abandoned|||abc1234|${oldDate}|Author|Very old commit`,
        ])
      )
      .mockReturnValueOnce('')
      .mockReturnValueOnce('');

    const result = await getBranches(REPO);

    expect(result.branches[0].status).toBe('abandoned');
  });

  it('classifies a branch with no upstream and >60 days as abandoned', async () => {
    const oldDate = new Date(Date.now() - 61 * 24 * 60 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .replace('Z', ' +0000');

    execFileMock.mockReturnValueOnce('main\nfeature/abandoned\n');
    execFileMock
      .mockReturnValueOnce(
        fixtureBranchesFull([
          `feature/abandoned|||abc1234|${oldDate}|Author|Old no-upstream`,
        ])
      )
      .mockReturnValueOnce('')
      .mockReturnValueOnce('');

    const result = await getBranches(REPO);

    expect(result.branches[0].status).toBe('abandoned');
  });

  it('includes merge info for merged branches', async () => {
    execFileMock.mockReturnValueOnce('main\nfeature/merged\n');
    execFileMock
      .mockReturnValueOnce(
        fixtureBranchesFull([
          'feature/merged|||abc1234|2025-06-01 12:00:00 +0000|Author|Merged feature',
        ])
      )
      .mockReturnValueOnce('feature/merged\nmain\n')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('* feature/merged\n  main\n'); // detectCurrentBranch
    // Merge info lookup
    execFileMock.mockReturnValueOnce(
      'def5678|2025-06-02 10:00:00 +0000|Merge branch feature/merged'
    );

    const result = await getBranches(REPO);

    expect(result.branches[0].mergeInfo).not.toBeNull();
    expect(result.branches[0].mergeInfo?.mergeCommit).toBe('def5678');
    expect(result.branches[0].mergeInfo?.mergedAt).toBe(
      '2025-06-02 10:00:00 +0000'
    );
  });

  it('includes checkout dates from reflog', async () => {
    execFileMock.mockReturnValueOnce('main\nfeature/active\n');

    const checkoutDate =
      '2025-05-01T10:00:00+00:00';
    execFileMock
      .mockReturnValueOnce(
        fixtureBranchesFull([
          'feature/active|||abc1234|2025-06-01 12:00:00 +0000|Author|Active feature',
        ])
      )
      .mockReturnValueOnce('')
      .mockReturnValueOnce(
        fixtureReflog([
          `HEAD@{${checkoutDate}} checkout: moving from main to feature/active`,
        ])
      );

    const result = await getBranches(REPO);

    expect(result.branches[0].lastCheckoutDate).toBe(checkoutDate);
  });
});

// ── deleteBranch ──

describe('deleteBranch', () => {
  it('protects main branch', async () => {
    const result = await deleteBranch(REPO, 'main', false);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Cannot delete protected branch');
  });

  it('protects master branch', async () => {
    const result = await deleteBranch(REPO, 'master', false);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Cannot delete protected branch');
  });

  it('protects custom main branch', async () => {
    const result = await deleteBranch(REPO, 'develop', false, 'develop');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Cannot delete protected branch');
  });

  it('prevents deleting currently checked out branch', async () => {
    execFileMock.mockReturnValueOnce(fixtureCurrentBranch('feature/current'));
    const result = await deleteBranch(REPO, 'feature/current', false);
    expect(result.success).toBe(false);
    expect(result.message).toContain('currently checked out');
  });

  it('deletes a branch successfully (safe)', async () => {
    execFileMock.mockReturnValueOnce(fixtureCurrentBranch('main'));
    execFileMock.mockReturnValueOnce('');
    const result = await deleteBranch(REPO, 'feature/to-delete', false);
    expect(result.success).toBe(true);
    expectGitCall(['branch', '-d', 'feature/to-delete']);
  });

  it('deletes a branch with force', async () => {
    execFileMock.mockReturnValueOnce(fixtureCurrentBranch('main'));
    execFileMock.mockReturnValueOnce('');
    const result = await deleteBranch(REPO, 'feature/to-delete', true);
    expect(result.success).toBe(true);
    expectGitCall(['branch', '-D', 'feature/to-delete']);
  });

  it('handles deletion error gracefully', async () => {
    execFileMock.mockReturnValueOnce(fixtureCurrentBranch('main'));
    execFileMock.mockImplementationOnce(() => {
      throw new Error('git error: branch not found');
    });
    const result = await deleteBranch(REPO, 'feature/missing', false);
    expect(result.success).toBe(false);
    expect(result.message).toContain('git error');
  });
});

// ── archiveBranch ──

describe('archiveBranch', () => {
  it('protects main branch from archive', async () => {
    const result = await archiveBranch(REPO, 'main');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Cannot archive protected branch');
  });

  it('archives a branch successfully', async () => {
    execFileMock.mockReturnValueOnce(''); // tag
    execFileMock.mockReturnValueOnce(''); // branch -D
    const result = await archiveBranch(REPO, 'feature/to-archive');
    expect(result.success).toBe(true);
    expect(result.message).toContain('archived as archive/feature/to-archive');
    expectGitCall(['tag', '-a', '-f', 'archive/feature/to-archive', 'feature/to-archive', '-m', 'archive/feature/to-archive']);
    expectGitCall(['branch', '-D', 'feature/to-archive']);
  });

  it('handles archive error', async () => {
    execFileMock.mockImplementationOnce(() => {
      throw new Error('tag already exists');
    });
    const result = await archiveBranch(REPO, 'feature/duplicate');
    expect(result.success).toBe(false);
    expect(result.message).toContain('tag already exists');
  });
});

// ── archiveBranches ──

describe('archiveBranches', () => {
  it('archives multiple branches', async () => {
    execFileMock.mockReturnValueOnce(''); // tag + delete for first
    execFileMock.mockReturnValueOnce('');
    execFileMock.mockReturnValueOnce(''); // tag + delete for second
    execFileMock.mockReturnValueOnce('');

    const result = await archiveBranches(REPO, ['feature/a', 'feature/b']);
    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(2);
    expect(result.results[0].success).toBe(true);
    expect(result.results[1].success).toBe(true);
  });

  it('reports partial failure', async () => {
    execFileMock.mockReturnValueOnce(''); // success
    execFileMock.mockReturnValueOnce(''); // success
    execFileMock.mockImplementationOnce(() => {
      throw new Error('cannot archive');
    }); // fails

    const result = await archiveBranches(REPO, ['feature/a', 'feature/b']);
    expect(result.success).toBe(false);
    expect(result.results[0].success).toBe(true);
    expect(result.results[1].success).toBe(false);
  });
});

// ── restoreArchivedBranch ──

describe('restoreArchivedBranch', () => {
  it('restores a branch from archive tag', async () => {
    execFileMock.mockReturnValueOnce('archive/feature/old'); // tag -l
    execFileMock.mockReturnValueOnce(''); // branch recreate
    execFileMock.mockReturnValueOnce(''); // tag -d

    const result = await restoreArchivedBranch(REPO, 'feature/old');
    expect(result.success).toBe(true);
    expect(result.message).toContain('restored from archive');
    expectGitCall(['branch', 'feature/old', 'archive/feature/old']);
    expectGitCall(['tag', '-d', 'archive/feature/old']);
  });

  it('fails when archive tag does not exist', async () => {
    execFileMock.mockReturnValueOnce(''); // tag -l returns empty

    const result = await restoreArchivedBranch(REPO, 'feature/nonexistent');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Archive tag');
  });

  it('handles restore error', async () => {
    execFileMock.mockReturnValueOnce('archive/feature/old');
    execFileMock.mockImplementationOnce(() => {
      throw new Error('branch already exists');
    });

    const result = await restoreArchivedBranch(REPO, 'feature/old');
    expect(result.success).toBe(false);
    expect(result.message).toContain('branch already exists');
  });
});

// ── deleteArchivedBranch ──

describe('deleteArchivedBranch', () => {
  it('permanently deletes archive tag', async () => {
    execFileMock.mockReturnValueOnce('');

    const result = await deleteArchivedBranch(REPO, 'feature/old');
    expect(result.success).toBe(true);
    expect(result.message).toContain('permanently deleted');
    expectGitCall(['tag', '-d', 'archive/feature/old']);
  });

  it('handles delete archive error', async () => {
    execFileMock.mockImplementationOnce(() => {
      throw new Error('tag not found');
    });

    const result = await deleteArchivedBranch(REPO, 'feature/nonexistent');
    expect(result.success).toBe(false);
    expect(result.message).toContain('tag not found');
  });
});

// ── getArchivedBranches ──

describe('getArchivedBranches', () => {
  it('lists archived branches with details', async () => {
    execFileMock.mockReturnValueOnce(
      fixtureTagsDetailed([
        'feature/api-v2|abc1234|2025-05-01 10:00:00 +0000',
        'fix/login|def5678|2025-04-15 08:30:00 +0000',
      ])
    );
    execFileMock
      .mockReturnValueOnce('Alice|2025-04-28 10:00:00 +0000|Refactor API layer')
      .mockReturnValueOnce('Bob|2025-04-10 15:30:00 +0000|Fix login redirect');

    const result = await getArchivedBranches(REPO);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('feature/api-v2');
    expect(result[0].commitHash).toBe('abc1234');
    expect(result[0].archivedAt).toBe('2025-05-01 10:00:00 +0000');
    expect(result[0].commitAuthor).toBe('Alice');
    expect(result[1].name).toBe('fix/login');
    expect(result[1].commitAuthor).toBe('Bob');
  });

  it('returns empty array when no archived branches exist', async () => {
    execFileMock.mockReturnValueOnce('');

    const result = await getArchivedBranches(REPO);

    expect(result).toEqual([]);
  });

  it('handles missing commit info gracefully', async () => {
    execFileMock.mockReturnValueOnce(
      fixtureTagsDetailed(['feature/ghost|abc1234|2025-05-01 10:00:00 +0000'])
    );
    execFileMock.mockImplementationOnce(() => {
      throw new Error('commit not found');
    });

    const result = await getArchivedBranches(REPO);

    expect(result).toHaveLength(1);
    expect(result[0].commitAuthor).toBe('');
  });
});

// ── deleteBranches (bulk) ──

describe('deleteBranches (bulk)', () => {
  it('deletes multiple branches', async () => {
    execFileMock.mockReturnValueOnce(fixtureCurrentBranch('main')); // get current
    execFileMock.mockReturnValueOnce(''); // delete first
    execFileMock.mockReturnValueOnce(''); // delete second

    const result = await deleteBranches(REPO, ['feature/a', 'feature/b'], false);
    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(2);
    expect(result.results[0].success).toBe(true);
    expect(result.results[1].success).toBe(true);
  });

  it('protects main branch in bulk delete', async () => {
    execFileMock.mockReturnValueOnce(fixtureCurrentBranch('main'));

    const result = await deleteBranches(REPO, ['main', 'feature/a'], false);
    expect(result.results[0].success).toBe(false);
    expect(result.results[0].message).toContain('Cannot delete protected branch');
  });

  it('protects currently checked out branch in bulk delete', async () => {
    execFileMock.mockReturnValueOnce(fixtureCurrentBranch('feature/current'));

    const result = await deleteBranches(REPO, ['feature/current', 'feature/a'], false);
    expect(result.results[0].success).toBe(false);
    expect(result.results[0].message).toContain('currently checked out');
  });

  it('uses force flag in bulk delete', async () => {
    execFileMock.mockReturnValueOnce(fixtureCurrentBranch('main'));
    execFileMock.mockReturnValueOnce(''); // delete with -D

    const result = await deleteBranches(REPO, ['feature/stuck'], true);
    expect(result.success).toBe(true);
    expectGitCall(['branch', '-D', 'feature/stuck']);
  });
});

// ── Branch status classification (edge cases) ──

describe('branch status classification', () => {
  it('prioritizes forgotten over orphan (both upstreamGone but merged)', async () => {
    execFileMock.mockReturnValueOnce('main\nfeature/forgotten\n');
    execFileMock
      .mockReturnValueOnce(
        fixtureBranchesFull([
          'feature/forgotten|origin/feature/forgotten|[gone]|abc1234|2025-06-01 12:00:00 +0000|Author|Merged and gone',
        ])
      )
      .mockReturnValueOnce('feature/forgotten\nmain\n') // --merged = merged
      .mockReturnValueOnce('');

    const result = await getBranches(REPO);
    expect(result.branches[0].status).toBe('forgotten'); // not orphan
  });

  it('abandoned with upstream requires >90 days', async () => {
    const date80DaysAgo = new Date(Date.now() - 80 * 24 * 60 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .replace('Z', ' +0000');

    execFileMock.mockReturnValueOnce('main\nfeature/not-yet-abandoned\n');
    execFileMock
      .mockReturnValueOnce(
        fixtureBranchesFull([
          `feature/not-yet-abandoned|origin/feature/not||abc1234|${date80DaysAgo}|Author|80 days, has upstream`,
        ])
      )
      .mockReturnValueOnce('')
      .mockReturnValueOnce('');

    const result = await getBranches(REPO);
    expect(result.branches[0].status).toBe('active'); // not abandoned yet
  });
});
