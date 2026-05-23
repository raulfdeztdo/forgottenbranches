import { Box, Text } from 'ink';
import { COLORS, STATUS_COLORS } from '../colors.js';
import type { BranchInfo } from '@forgottenbranches/types';

interface Props {
  branch: BranchInfo;
  isSelected: boolean;
  isChecked: boolean;
  isExpanded: boolean;
  isHighlighted: boolean;
  isProtected: boolean;
}

function formatAge(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default function BranchRow({ branch, isSelected, isChecked, isExpanded, isHighlighted, isProtected }: Props) {
  const statusColor = STATUS_COLORS[branch.status] || COLORS.text;
  const bg = isHighlighted ? COLORS.bgSecondary : undefined;
  const cursor = isHighlighted ? '>' : ' ';

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={COLORS.accent}>{cursor}</Text>
        <Text color={isChecked ? COLORS.accent : COLORS.textSecondary}>
          {isChecked ? '[x]' : '[ ]'}
        </Text>
        <Text color={statusColor}> {isExpanded ? '▼' : '▶'} </Text>
        <Text bold color={statusColor}>
          {branch.name}
        </Text>
        {isProtected && (
          <Text color={COLORS.accent}> 🔒</Text>
        )}
        <Text color={COLORS.textSecondary}> {branch.upstreamGone ? 'gone' : branch.upstream || 'local'} </Text>
        <Text color={COLORS.textSecondary}>
          {branch.lastCommitMessage.slice(0, 40)}
          {branch.lastCommitMessage.length > 40 ? '...' : ''}
        </Text>
        <Text color={COLORS.textSecondary}> {formatAge(branch.daysSinceLastCommit)} </Text>
        <Text color={statusColor} bold>
          {branch.status}
        </Text>
      </Box>
    </Box>
  );
}
