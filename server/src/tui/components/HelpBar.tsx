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
        ↑↓ Navigate  ↵ Expand  Space Toggle  / Path  f Filters  a Archive  d Delete  s Scan  q Quit
      </Text>
    </Box>
  );
}
