import { Box, Text } from 'ink';
import { COLORS, STATUS_COLORS } from '../colors.js';
import type { BranchInfo } from '@forgottenbranches/types';

export interface BranchRowState {
  isHighlighted: boolean;
  isChecked: boolean;
  isExpanded: boolean;
  isProtected: boolean;
  protectedReason: string;
}

interface Props {
  branch: BranchInfo;
  row: BranchRowState;
}

function formatAge(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default function BranchRow({ branch, row }: Props) {
  const statusColor = STATUS_COLORS[branch.status] || COLORS.text;
  const cursor = row.isHighlighted ? '>' : ' ';

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={COLORS.accent}>{cursor}</Text>
        <Text color={row.isChecked ? COLORS.accent : COLORS.textSecondary}>
          {row.isChecked ? '[x]' : '[ ]'}
        </Text>
        <Text color={statusColor}> {row.isExpanded ? '▼' : '▶'} </Text>
        <Text bold color={statusColor}>
          {branch.name}
        </Text>
        {row.isProtected && (
          <Text color={COLORS.accent}> 🔒 {row.protectedReason}</Text>
        )}
        <Text color={COLORS.textSecondary}> {branch.upstreamGone ? 'gone' : branch.upstream || 'local'} </Text>
        <Text color={COLORS.textSecondary}>
          {branch.lastCommitMessage.slice(0, 40)}
          {branch.lastCommitMessage.length > 40 ? '…' : ''}
        </Text>
        <Text color={COLORS.textSecondary}> {formatAge(branch.daysSinceLastCommit)} </Text>
        <Text color={statusColor} bold>
          {branch.status}
        </Text>
      </Box>
    </Box>
  );
}
