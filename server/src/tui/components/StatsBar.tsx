import { Box, Text } from 'ink';
import { COLORS } from '../colors.js';
import type { BranchesResult } from '@forgottenbranches/types';

interface Props {
  data: BranchesResult | null;
  archivedCount: number;
  currentBranch: string | null;
  loading: boolean;
}

export default function StatsBar({ data, archivedCount, currentBranch, loading }: Props) {
  if (!data && !loading) {
    return (
      <Box marginY={1}>
        <Text color={COLORS.textSecondary}>
          Enter a repo path and press Scan to start
        </Text>
      </Box>
    );
  }

  return (
    <Box marginY={1} gap={2}>
      <Text color={COLORS.text}>
        Local:{' '}
        <Text bold color={COLORS.white}>
          {loading ? '...' : data?.totalLocal ?? 0}
        </Text>
      </Text>
      <Text color={COLORS.text}>
        Forgotten/Orphan:{' '}
        <Text bold color={COLORS.danger}>
          {loading ? '...' : data?.totalForgotten ?? 0}
        </Text>
      </Text>
      <Text color={COLORS.text}>
        Main:{' '}
        <Text bold color={COLORS.accent}>
          {loading ? '...' : data?.mainBranch ?? '-'}
        </Text>
      </Text>
      {currentBranch && (
        <Text color={COLORS.text}>
          Current:{' '}
          <Text bold color={COLORS.purple}>
            {currentBranch}
          </Text>
        </Text>
      )}
      <Text color={COLORS.text}>
        Archived:{' '}
        <Text bold color={COLORS.purple}>
          {archivedCount}
        </Text>
      </Text>
    </Box>
  );
}
