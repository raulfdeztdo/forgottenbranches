export interface MergeInfo {
  mergedAt: string;
  mergeCommit: string;
  mergeCommitMessage: string;
}

export type BranchStatus = 'active' | 'forgotten' | 'merged' | 'orphan' | 'abandoned';

export interface BranchInfo {
  name: string;
  upstream: string | null;
  upstreamGone: boolean;
  lastCommitDate: string;
  lastCommitHash: string;
  lastCommitAuthor: string;
  lastCommitMessage: string;
  isMergedIntoMain: boolean;
  mergeInfo: MergeInfo | null;
  daysSinceLastCommit: number;
  lastCheckoutDate: string | null;
  status: BranchStatus;
}

export interface ArchivedBranch {
  name: string;
  archivedAt: string;
  commitHash: string;
  commitAuthor: string;
  commitDate: string;
  commitMessage: string;
}

export interface BranchesResult {
  branches: BranchInfo[];
  mainBranch: string;
  currentBranch: string | null;
  totalLocal: number;
  totalForgotten: number;
}
