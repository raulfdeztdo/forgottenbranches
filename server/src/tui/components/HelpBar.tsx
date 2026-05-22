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
        ↑↓ Navigate  ↵ Select  Space Toggle  a Archive  d Delete  s Scan  f Filter  q Quit
      </Text>
    </Box>
  );
}
