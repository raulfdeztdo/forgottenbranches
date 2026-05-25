import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { COLORS } from '../colors.js';

const STATUS_FILTERS = ['all', 'active', 'forgotten', 'merged', 'orphan', 'abandoned'] as const;
const SORT_FIELDS = ['status', 'name', 'date', 'age'] as const;

interface Props {
  searchQuery: string;
  statusFilter: string;
  sortField: string;
  focused: boolean;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSortFieldChange: (value: string) => void;
}

export default function FilterBar({
  searchQuery,
  statusFilter,
  sortField,
  focused,
  onSearchChange,
  onStatusFilterChange,
  onSortFieldChange,
}: Props) {
  return (
    <Box marginY={1} gap={2}>
      <Box>
        <Text color={COLORS.textSecondary}>Search: </Text>
        {focused ? (
          <TextInput value={searchQuery} onChange={onSearchChange} placeholder="type to filter..." />
        ) : (
          <Text color={COLORS.text}>{searchQuery || 'type to filter...'}</Text>
        )}
      </Box>
      <Box gap={1}>
        <Text color={COLORS.textSecondary}>Status: </Text>
        {STATUS_FILTERS.map((f) => (
          <Text key={f} color={statusFilter === f ? COLORS.accent : COLORS.textSecondary}>
            {f}
            {' '}
          </Text>
        ))}
      </Box>
      <Box gap={1}>
        <Text color={COLORS.textSecondary}>Sort: </Text>
        {SORT_FIELDS.map((f) => (
          <Text key={f} color={sortField === f ? COLORS.accent : COLORS.textSecondary}>
            {f}
            {' '}
          </Text>
        ))}
      </Box>
    </Box>
  );
}
