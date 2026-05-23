import { useState, useEffect, useCallback, useRef } from 'react';
import { getBranches, getArchivedBranches, detectCurrentBranch } from '../../git.js';
import type { BranchesResult, ArchivedBranch } from '@forgottenbranches/types';

export function useGitData(repoPath: string) {
  const [data, setData] = useState<BranchesResult | null>(null);
  const [archived, setArchived] = useState<ArchivedBranch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const scan = useCallback(async (): Promise<boolean> => {
    if (!repoPath) return false;
    setLoading(true);
    setError(null);
    try {
      const [branches, archivedBranches, current] = await Promise.all([
        getBranches(repoPath),
        getArchivedBranches(repoPath).catch(() => [] as ArchivedBranch[]),
        detectCurrentBranch(repoPath).catch(() => null),
      ]);
      if (!mountedRef.current) return true;
      setData(branches);
      setArchived(archivedBranches);
      setCurrentBranch(current);
      return true;
    } catch (err: unknown) {
      if (!mountedRef.current) return false;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setData(null);
      setArchived([]);
      setCurrentBranch(null);
      return false;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [repoPath]);

  useEffect(() => {
    mountedRef.current = true;
    if (repoPath) {
      scan();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [repoPath, scan]);

  return { data, archived, currentBranch, loading, error, scan, setData };
}
