import { Box, Text } from 'ink';
import { COLORS } from '../colors.js';

interface Props {
  type: 'archive' | 'delete';
  branchName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ type, branchName, onConfirm, onCancel }: Props) {
  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={type === 'delete' ? COLORS.danger : COLORS.purple}
      paddingX={2}
      paddingY={2}
      marginTop={1}
    >
      <Text bold color={type === 'delete' ? COLORS.danger : COLORS.purple}>
        {type === 'delete' ? 'Delete Branch' : 'Archive Branch'}
      </Text>
      <Box marginY={1}>
        <Text color={COLORS.text}>
          {type === 'delete'
            ? `Are you sure you want to delete "${branchName}"?`
            : `Archive "${branchName}" as archive/${branchName}?`}
        </Text>
      </Box>
      <Box gap={2}>
        <Text color={COLORS.success}>[y] Confirm</Text>
        <Text color={COLORS.textSecondary}>[n] Cancel</Text>
      </Box>
    </Box>
  );
}
