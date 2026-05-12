import type { BranchInfo } from './types';

export type BranchStatus = BranchInfo['status'];

export const STATUS_COLORS: Record<BranchStatus, string> = {
  active:    '#98c379',
  forgotten: '#e06c75',
  merged:    '#e5c07b',
  orphan:    '#d19a66',
  abandoned: '#5c6370',
};

export const STATUS_LABELS: Record<BranchStatus, string> = {
  active:    'Active',
  forgotten: 'Forgotten',
  merged:    'Merged',
  orphan:    'Orphan',
  abandoned: 'Abandoned',
};
