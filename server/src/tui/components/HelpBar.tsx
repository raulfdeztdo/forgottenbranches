import { Box, Text } from 'ink';
import { COLORS } from '../colors.js';

export default function HelpBar() {
  return (
    <Box
      marginTop={1}
      paddingTop={1}
      flexDirection="column"
      borderStyle="single"
      borderColor={COLORS.bgSecondary}
    >
      <Box gap={2}>
        <Text color={COLORS.textSecondary}>
          <Text color={COLORS.accent}>Navigation</Text>
          {'  '}
        </Text>
        <Text color={COLORS.text}>
          ↑↓ move
        </Text>
        <Text color={COLORS.text}>
          ↵ expand
        </Text>
        <Text color={COLORS.text}>
          Space select
        </Text>
        <Text color={COLORS.text}>
          / edit path
        </Text>
        <Text color={COLORS.text}>
          Tab archived
        </Text>
      </Box>
      <Box gap={2}>
        <Text color={COLORS.textSecondary}>
          <Text color={COLORS.accent}>Actions</Text>
          {'  '}
        </Text>
        <Text color={COLORS.text}>
          s scan
        </Text>
        <Text color={COLORS.text}>
          f filters
        </Text>
        <Text color={COLORS.success}>
          a archive (selected)
        </Text>
        <Text color={COLORS.danger}>
          d delete (selected)
        </Text>
        <Text color={COLORS.text}>
          q quit
        </Text>
      </Box>
      <Box>
        <Text color={COLORS.textSecondary}>
          <Text color={COLORS.accent}>Archived</Text>
          {' '}
        </Text>
        <Text color={COLORS.text}>
          Tab toggle
        </Text>
        <Text color={COLORS.text}>
          {'  '}r restore
        </Text>
        <Text color={COLORS.danger}>
          {'  '}D delete permanently
        </Text>
      </Box>
    </Box>
  );
}
