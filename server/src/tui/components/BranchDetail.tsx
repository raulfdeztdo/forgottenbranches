import { Box, Text } from 'ink';
import { COLORS, STATUS_COLORS } from '../colors.js';
import type { BranchInfo } from '@forgottenbranches/types';

interface Props {
  branch: BranchInfo;
  onArchive: () => void;
  onDelete: () => void;
}

export default function BranchDetail({ branch, onArchive, onDelete }: Props) {
  const statusColor = STATUS_COLORS[branch.status] || COLORS.text;

  return (
    <Box flexDirection="column" marginLeft={4} marginY={1}>
      <Box flexDirection="column" borderStyle="round" borderColor={COLORS.bgSecondary} paddingX={2} paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color={COLORS.white}>
            Commit Info
          </Text>
        </Box>
        <Box gap={2}>
          <Text color={COLORS.textSecondary}>Hash:</Text>
          <Text color={COLORS.text}>{branch.lastCommitHash}</Text>
        </Box>
        <Box gap={2}>
          <Text color={COLORS.textSecondary}>Author:</Text>
          <Text color={COLORS.text}>{branch.lastCommitAuthor}</Text>
        </Box>
        <Box gap={2}>
          <Text color={COLORS.textSecondary}>Date:</Text>
          <Text color={COLORS.text}>{branch.lastCommitDate}</Text>
        </Box>
        <Box gap={2}>
          <Text color={COLORS.textSecondary}>Message:</Text>
          <Text color={COLORS.text}>{branch.lastCommitMessage}</Text>
        </Box>

        {branch.mergeInfo && (
          <>
            <Box marginTop={1} marginBottom={1}>
              <Text bold color={COLORS.white}>
                Merge Info
              </Text>
            </Box>
            <Box gap={2}>
              <Text color={COLORS.textSecondary}>Merge commit:</Text>
              <Text color={COLORS.text}>{branch.mergeInfo.mergeCommit}</Text>
            </Box>
            <Box gap={2}>
              <Text color={COLORS.textSecondary}>Merged at:</Text>
              <Text color={COLORS.text}>{branch.mergeInfo.mergedAt}</Text>
            </Box>
          </>
        )}

        <Box marginTop={1} marginBottom={1}>
          <Text bold color={COLORS.white}>
            Activity
          </Text>
        </Box>
        <Box gap={2}>
          <Text color={COLORS.textSecondary}>Last commit:</Text>
          <Text color={COLORS.text}>{branch.daysSinceLastCommit} days ago</Text>
        </Box>
        <Box gap={2}>
          <Text color={COLORS.textSecondary}>Last checkout:</Text>
          <Text color={COLORS.text}>{branch.lastCheckoutDate || 'unknown'}</Text>
        </Box>
        <Box gap={2}>
          <Text color={COLORS.textSecondary}>Upstream:</Text>
          <Text color={COLORS.text}>{branch.upstream || '(none)'}</Text>
        </Box>
        <Box gap={2}>
          <Text color={COLORS.textSecondary}>Status:</Text>
          <Text bold color={statusColor}>
            {branch.status.toUpperCase()}
          </Text>
          {branch.isMergedIntoMain && (
            <Text color={COLORS.textSecondary}>(merged into main)</Text>
          )}
        </Box>

        <Box marginTop={1} gap={2}>
          <Text color={COLORS.purple}>[a] Archive</Text>
          <Text color={COLORS.danger}>[d] Delete</Text>
        </Box>
      </Box>
    </Box>
  );
}
