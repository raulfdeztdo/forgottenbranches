import { useState, useCallback } from 'react';
import { Box, Text, useApp } from 'ink';
import { COLORS } from './colors.js';
import { useGitData } from './hooks/useGitData.js';
import { useKeyboard } from './hooks/useKeyboard.js';
import Header from './components/Header.js';
import StatsBar from './components/StatsBar.js';
import FilterBar from './components/FilterBar.js';
import BranchList from './components/BranchList.js';
import ConfirmDialog from './components/ConfirmDialog.js';
import Toast, { showToast } from './components/Toast.js';
import HelpBar from './components/HelpBar.js';
import {
  archiveBranch,
  deleteBranch,
} from '../git.js';

const STATUS_FILTERS = ['all', 'active', 'forgotten', 'merged', 'orphan', 'abandoned'] as const;
const SORT_FIELDS = ['status', 'name', 'date', 'age'] as const;

interface Props {
  initialPath?: string;
}

export default function TuiApp({ initialPath = '' }: Props) {
  const { exit } = useApp();
  const [repoPath, setRepoPath] = useState(initialPath);
  const [focusedSection, setFocusedSection] = useState<'input' | 'filters' | 'list'>('input');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(new Set());
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('status');
  const [confirm, setConfirm] = useState<{ type: 'archive' | 'delete'; branch: string } | null>(null);

  const { data, archived, loading, error, scan } = useGitData(repoPath);

  const branches = data?.branches ?? [];
  const mainBranch = data?.mainBranch;

  const handleScan = useCallback(() => {
    setSelectedIndex(0);
    setExpandedBranch(null);
    setSelectedBranches(new Set());
    scan();
  }, [scan]);

  const handleArchive = useCallback(async (name: string) => {
    try {
      const result = await archiveBranch(repoPath, name, mainBranch);
      if (result.success) {
        showToast('success', result.message);
        scan();
      } else {
        showToast('error', result.message);
      }
    } catch {
      showToast('error', `Failed to archive ${name}`);
    }
    setExpandedBranch(null);
  }, [repoPath, mainBranch, scan]);

  const handleDelete = useCallback(async (name: string) => {
    try {
      const result = await deleteBranch(repoPath, name, false, mainBranch);
      if (result.success) {
        showToast('success', result.message);
        scan();
      } else {
        showToast('error', result.message);
      }
    } catch {
      showToast('error', `Failed to delete ${name}`);
    }
    setExpandedBranch(null);
  }, [repoPath, mainBranch, scan]);

  const filteredBranches = branches.filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!b.name.toLowerCase().includes(q) && !b.lastCommitMessage.toLowerCase().includes(q))
        return false;
    }
    return true;
  });

  useKeyboard((input, key) => {
    if (confirm) {
      if (key.escape || input === 'n') {
        setConfirm(null);
        return;
      }
      if (input === 'y' || key.return) {
        const { type, branch } = confirm;
        setConfirm(null);
        if (type === 'archive') handleArchive(branch);
        else handleDelete(branch);
        return;
      }
      return;
    }

    if (key.escape || input === 'q') {
      exit();
      return;
    }

    if (input === 's') {
      handleScan();
      return;
    }

    if (input === 'f') {
      setFocusedSection((prev) => (prev === 'filters' ? 'list' : 'filters'));
      return;
    }

    if (input === '/') {
      setFocusedSection('input');
      return;
    }

    if (input === 'a' && focusedSection === 'list') {
      const branch = filteredBranches[selectedIndex];
      if (branch) {
        setConfirm({ type: 'archive', branch: branch.name });
      }
      return;
    }

    if (input === 'd' && focusedSection === 'list') {
      const branch = filteredBranches[selectedIndex];
      if (branch) {
        setConfirm({ type: 'delete', branch: branch.name });
      }
      return;
    }

    if (key.return) {
      if (focusedSection === 'input') {
        handleScan();
        return;
      }
      if (focusedSection === 'list') {
        const branch = filteredBranches[selectedIndex];
        if (branch) {
          setExpandedBranch((prev) =>
            prev === branch.name ? null : branch.name
          );
        }
        return;
      }
      return;
    }

    if (key.upArrow) {
      if (focusedSection === 'list' && filteredBranches.length > 0) {
        setSelectedIndex((prev) =>
          prev <= 0 ? filteredBranches.length - 1 : prev - 1
        );
      }
      if (focusedSection === 'filters') {
        // Cycle status filter
        const idx = STATUS_FILTERS.indexOf(statusFilter as typeof STATUS_FILTERS[number]);
        setStatusFilter(
          idx <= 0
            ? STATUS_FILTERS[STATUS_FILTERS.length - 1]
            : STATUS_FILTERS[idx - 1]
        );
      }
      return;
    }

    if (key.downArrow) {
      if (focusedSection === 'list' && filteredBranches.length > 0) {
        setSelectedIndex((prev) =>
          prev >= filteredBranches.length - 1 ? 0 : prev + 1
        );
      }
      if (focusedSection === 'filters') {
        const idx = STATUS_FILTERS.indexOf(statusFilter as typeof STATUS_FILTERS[number]);
        setStatusFilter(
          idx >= STATUS_FILTERS.length - 1
            ? STATUS_FILTERS[0]
            : STATUS_FILTERS[idx + 1]
        );
      }
      return;
    }

    if (key.leftArrow && focusedSection === 'filters') {
      const idx = SORT_FIELDS.indexOf(sortField as typeof SORT_FIELDS[number]);
      setSortField(
        idx <= 0
          ? SORT_FIELDS[SORT_FIELDS.length - 1]
          : SORT_FIELDS[idx - 1]
      );
      return;
    }

    if (key.rightArrow && focusedSection === 'filters') {
      const idx = SORT_FIELDS.indexOf(sortField as typeof SORT_FIELDS[number]);
      setSortField(
        idx >= SORT_FIELDS.length - 1
          ? SORT_FIELDS[0]
          : SORT_FIELDS[idx + 1]
      );
      return;
    }

    if (input === ' ') {
      if (focusedSection === 'list') {
        const branch = filteredBranches[selectedIndex];
        if (branch) {
          setSelectedBranches((prev) => {
            const next = new Set(prev);
            if (next.has(branch.name)) next.delete(branch.name);
            else next.add(branch.name);
            return next;
          });
        }
      }
      return;
    }
  });

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Header
        repoPath={repoPath}
        focused={focusedSection === 'input'}
        loading={loading}
        onPathChange={setRepoPath}
        onScan={handleScan}
        onSubmit={handleScan}
      />

      {error && (
        <Box marginY={1}>
          <Text color={COLORS.danger}>Error: {error}</Text>
        </Box>
      )}

      <StatsBar data={data} archivedCount={archived.length} loading={loading} />

      <FilterBar
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        sortField={sortField}
        focused={focusedSection === 'filters'}
        onSearchChange={setSearchQuery}
        onStatusFilterChange={setStatusFilter}
        onSortFieldChange={setSortField}
      />

      {loading ? (
        <Box marginY={2}>
          <Text color={COLORS.textSecondary}>Scanning repository...</Text>
        </Box>
      ) : (
        <BranchList
          branches={branches}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          sortField={sortField}
          selectedIndex={selectedIndex}
          selectedBranches={selectedBranches}
          expandedBranch={expandedBranch}
          onToggleSelect={(name) => {
            setSelectedBranches((prev) => {
              const next = new Set(prev);
              if (next.has(name)) next.delete(name);
              else next.add(name);
              return next;
            });
          }}
          onToggleExpand={(name) => {
            setExpandedBranch((prev) => (prev === name ? null : name));
          }}
          onArchive={(name) => setConfirm({ type: 'archive', branch: name })}
          onDelete={(name) => setConfirm({ type: 'delete', branch: name })}
        />
      )}

      {confirm && (
        <ConfirmDialog
          type={confirm.type}
          branchName={confirm.branch}
          onConfirm={() => {
            const { type, branch } = confirm;
            setConfirm(null);
            if (type === 'archive') handleArchive(branch);
            else handleDelete(branch);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}

      <Toast />
      <HelpBar />
    </Box>
  );
}
