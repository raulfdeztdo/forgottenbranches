import { useState, useEffect, useCallback } from 'react';
import { getBranches, getArchivedBranches } from '../../git.js';
import type { BranchesResult, ArchivedBranch } from '@forgottenbranches/types';

export function useGitData(repoPath: string) {
  const [data, setData] = useState<BranchesResult | null>(null);
  const [archived, setArchived] = useState<ArchivedBranch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async () => {
    if (!repoPath) return;
    setLoading(true);
    setError(null);
    try {
      const [branches, archivedBranches] = await Promise.all([
        getBranches(repoPath),
        getArchivedBranches(repoPath).catch(() => [] as ArchivedBranch[]),
      ]);
      setData(branches);
      setArchived(archivedBranches);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setData(null);
      setArchived([]);
    } finally {
      setLoading(false);
    }
  }, [repoPath]);

  useEffect(() => {
    if (repoPath) {
      scan();
    }
  }, []);

  return { data, archived, loading, error, scan, setData };
}
