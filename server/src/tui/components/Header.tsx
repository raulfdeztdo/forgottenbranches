import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { COLORS } from '../colors.js';

interface Props {
  repoPath: string;
  focused: boolean;
  loading: boolean;
  onPathChange: (value: string) => void;
  onScan: () => void;
  onSubmit: () => void;
}

export default function Header({ repoPath, focused, loading, onPathChange, onScan, onSubmit }: Props) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box marginBottom={1}>
        <Text bold color={COLORS.purple}>
          Forgotten Branches
        </Text>
      </Box>
      <Box>
        <Box marginRight={1}>
          <Text color={COLORS.textSecondary}>Path:</Text>
        </Box>
        <Box flexGrow={1} marginRight={1}>
          {focused ? (
            <TextInput
              value={repoPath}
              onChange={onPathChange}
              onSubmit={onSubmit}
              placeholder="Paste repo path..."
            />
          ) : (
            <Text color={repoPath ? COLORS.text : COLORS.textSecondary}>
              {repoPath || 'Press / to enter a repo path'}
            </Text>
          )}
        </Box>
        <Text color={COLORS.accent} dimColor={loading}>
          [{loading ? 'Scanning...' : 'Scan'}]
        </Text>
      </Box>
    </Box>
  );
}
