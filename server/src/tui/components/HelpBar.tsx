import { Box, Text } from 'ink';
import { COLORS } from '../colors.js';

export default function HelpBar() {
  return (
    <Box
      marginTop={1}
      paddingTop={1}
      borderStyle="single"
      borderColor={COLORS.bgSecondary}
    >
      <Text color={COLORS.textSecondary}>
        ↑↓ Navigate  ↵ Expand  Space Toggle  Tab Archived  / Path  f Filters  a/d Archive/Del  q Quit
      </Text>
    </Box>
  );
}
