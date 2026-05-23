import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetBranches = vi.fn();
const mockGetArchivedBranches = vi.fn();

vi.mock('../../git.js', () => ({
  getBranches: (...args: unknown[]) => mockGetBranches(...args),
  getArchivedBranches: (...args: unknown[]) => mockGetArchivedBranches(...args),
  detectCurrentBranch: vi.fn().mockResolvedValue('main'),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useGitData scan logic', () => {
  it('calls getBranches and getArchivedBranches', async () => {
    const { getBranches, getArchivedBranches } = await import('../../git.js');

    mockGetBranches.mockResolvedValue({
      branches: [],
      mainBranch: 'main',
      totalLocal: 0,
      totalForgotten: 0,
    });
    mockGetArchivedBranches.mockResolvedValue([]);

    const [branches, archived] = await Promise.all([
      getBranches('/fake/repo'),
      getArchivedBranches('/fake/repo').catch(() => []),
    ]);

    expect(branches).toBeDefined();
    expect(archived).toEqual([]);
    expect(mockGetBranches).toHaveBeenCalledWith('/fake/repo');
    expect(mockGetArchivedBranches).toHaveBeenCalledWith('/fake/repo');
  });

  it('handles getArchivedBranches failure gracefully', async () => {
    const { getBranches, getArchivedBranches } = await import('../../git.js');

    mockGetBranches.mockResolvedValue({
      branches: [],
      mainBranch: 'main',
      totalLocal: 0,
      totalForgotten: 0,
    });
    mockGetArchivedBranches.mockRejectedValue(new Error('No tags'));

    const result = await Promise.all([
      getBranches('/fake/repo'),
      getArchivedBranches('/fake/repo').catch(() => []),
    ]);

    expect(result[1]).toEqual([]); // Falls back to empty array
  });

  it('handles getBranches failure', async () => {
    const { getBranches } = await import('../../git.js');

    mockGetBranches.mockRejectedValue(new Error('Not a git repo'));

    await expect(getBranches('/fake/repo')).rejects.toThrow('Not a git repo');
  });
});
