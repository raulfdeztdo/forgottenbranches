import { Box, Text } from 'ink';
import { COLORS } from '../colors.js';
import type { ArchivedBranch } from '@forgottenbranches/types';

interface Props {
  archived: ArchivedBranch[];
  selectedIndex: number;
  selectedBranches: Set<string>;
  expandedBranch: string | null;
  onToggleSelect: (name: string) => void;
  onToggleExpand: (name: string) => void;
  onRestore: (name: string) => void;
  onDelete: (name: string) => void;
}

export default function ArchivedList({
  archived,
  selectedIndex,
  selectedBranches,
  expandedBranch,
  onToggleSelect,
  onToggleExpand,
  onRestore,
  onDelete,
}: Props) {
  if (archived.length === 0) {
    return (
      <Box marginY={2}>
        <Text color={COLORS.textSecondary}>No archived branches</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box marginBottom={1}>
        <Text bold color={COLORS.white}>
          Archived Branches ({archived.length})
        </Text>
      </Box>

      <Box flexDirection="column">
        {archived.map((branch, i) => {
          const isHighlighted = i === selectedIndex;
          const isExpanded = expandedBranch === branch.name;
          const isChecked = selectedBranches.has(branch.name);
          const cursor = isHighlighted ? '>' : ' ';

          return (
            <Box key={branch.name} flexDirection="column">
              <Box>
                <Text color={COLORS.accent}>{cursor}</Text>
                <Text color={isChecked ? COLORS.accent : COLORS.textSecondary}>
                  {isChecked ? '[x]' : '[ ]'}
                </Text>
                <Text color={COLORS.purple}> {isExpanded ? '▼' : '▶'} </Text>
                <Text bold color={COLORS.purple}>
                  {branch.name}
                </Text>
                <Text color={COLORS.textSecondary}> {branch.commitHash} </Text>
                <Text color={COLORS.textSecondary}> {branch.commitMessage.slice(0, 40)} </Text>
                <Text color={COLORS.textSecondary}> {branch.archivedAt?.slice(0, 10)} </Text>
              </Box>

              {isExpanded && (
                <Box flexDirection="column" marginLeft={4} marginY={1}>
                  <Box
                    flexDirection="column"
                    borderStyle="round"
                    borderColor={COLORS.bgSecondary}
                    paddingX={2}
                    paddingY={1}
                  >
                    <Box marginBottom={1}>
                      <Text bold color={COLORS.white}>
                        Archive Info
                      </Text>
                    </Box>
                    <Box gap={2}>
                      <Text color={COLORS.textSecondary}>Hash:</Text>
                      <Text color={COLORS.text}>{branch.commitHash}</Text>
                    </Box>
                    <Box gap={2}>
                      <Text color={COLORS.textSecondary}>Author:</Text>
                      <Text color={COLORS.text}>{branch.commitAuthor}</Text>
                    </Box>
                    <Box gap={2}>
                      <Text color={COLORS.textSecondary}>Last commit:</Text>
                      <Text color={COLORS.text}>{branch.commitDate}</Text>
                    </Box>
                    <Box gap={2}>
                      <Text color={COLORS.textSecondary}>Message:</Text>
                      <Text color={COLORS.text}>{branch.commitMessage}</Text>
                    </Box>
                    <Box gap={2}>
                      <Text color={COLORS.textSecondary}>Archived at:</Text>
                      <Text color={COLORS.text}>{branch.archivedAt}</Text>
                    </Box>

                    <Box marginTop={1} gap={2}>
                      <Text color={COLORS.success}>[r] Restore</Text>
                      <Text color={COLORS.danger}>[D] Delete permanently</Text>
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
