import { useState, useEffect, useCallback } from 'react';
import { getBranches, getArchivedBranches, detectCurrentBranch } from '../../git.js';
import type { BranchesResult, ArchivedBranch } from '@forgottenbranches/types';

export function useGitData(repoPath: string) {
  const [data, setData] = useState<BranchesResult | null>(null);
  const [archived, setArchived] = useState<ArchivedBranch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async () => {
    if (!repoPath) return;
    setLoading(true);
    setError(null);
    try {
      const [branches, archivedBranches, current] = await Promise.all([
        getBranches(repoPath),
        getArchivedBranches(repoPath).catch(() => [] as ArchivedBranch[]),
        detectCurrentBranch(repoPath).catch(() => null),
      ]);
      setData(branches);
      setArchived(archivedBranches);
      setCurrentBranch(current);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setData(null);
      setArchived([]);
      setCurrentBranch(null);
    } finally {
      setLoading(false);
    }
  }, [repoPath]);

  useEffect(() => {
    if (repoPath) {
      scan();
    }
  }, []);

  return { data, archived, currentBranch, loading, error, scan, setData };
}
