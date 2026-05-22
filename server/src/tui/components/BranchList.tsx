import { Box, Text } from 'ink';
import { useState } from 'react';
import { COLORS } from '../colors.js';
import type { BranchInfo } from '@forgottenbranches/types';
import BranchRow from './BranchRow.js';
import BranchDetailPanel from './BranchDetail.js';

interface Props {
  branches: BranchInfo[];
  searchQuery: string;
  statusFilter: string;
  sortField: string;
  selectedIndex: number;
  selectedBranches: Set<string>;
  expandedBranch: string | null;
  onToggleSelect: (name: string) => void;
  onToggleExpand: (name: string) => void;
  onArchive: (name: string) => void;
  onDelete: (name: string) => void;
}

export default function BranchList({
  branches,
  searchQuery,
  statusFilter,
  sortField,
  selectedIndex,
  selectedBranches,
  expandedBranch,
  onToggleSelect,
  onToggleExpand,
  onArchive,
  onDelete,
}: Props) {
  if (branches.length === 0) {
    return (
      <Box marginY={2}>
        <Text color={COLORS.textSecondary}>No branches found</Text>
      </Box>
    );
  }

  // Filter
  let filtered = branches;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.lastCommitMessage.toLowerCase().includes(q)
    );
  }
  if (statusFilter && statusFilter !== 'all') {
    filtered = filtered.filter((b) => b.status === statusFilter);
  }

  // Sort
  const sorted = [...filtered];
  switch (sortField) {
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'date':
      sorted.sort(
        (a, b) =>
          new Date(b.lastCommitDate).getTime() -
          new Date(a.lastCommitDate).getTime()
      );
      break;
    case 'age':
      sorted.sort((a, b) => b.daysSinceLastCommit - a.daysSinceLastCommit);
      break;
    case 'status':
    default:
      const order = ['active', 'merged', 'forgotten', 'orphan', 'abandoned'];
      sorted.sort(
        (a, b) => order.indexOf(a.status) - order.indexOf(b.status)
      );
      break;
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box marginBottom={1}>
        <Text bold color={COLORS.white}>
          Branches ({filtered.length})
        </Text>
      </Box>

      <Box flexDirection="column">
        {sorted.map((branch, i) => {
          const isHighlighted = i === selectedIndex;
          const isExpanded = expandedBranch === branch.name;
          const isChecked = selectedBranches.has(branch.name);

          return (
            <Box key={branch.name} flexDirection="column">
              <BranchRow
                branch={branch}
                isSelected={false}
                isChecked={isChecked}
                isExpanded={isExpanded}
                isHighlighted={isHighlighted}
              />
              {isExpanded && (
                <BranchDetailPanel
                  branch={branch}
                  onArchive={() => onArchive(branch.name)}
                  onDelete={() => onDelete(branch.name)}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
