import { useState, useCallback, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { COLORS } from './colors.js';
import { useGitData } from './hooks/useGitData.js';
import { useKeyboard } from './hooks/useKeyboard.js';
import Header from './components/Header.js';
import StatsBar from './components/StatsBar.js';
import FilterBar from './components/FilterBar.js';
import BranchList from './components/BranchList.js';
import ConfirmDialog from './components/ConfirmDialog.js';
import ArchivedList from './components/ArchivedList.js';
import Toast, { showToast } from './components/Toast.js';
import HelpBar from './components/HelpBar.js';
import {
  archiveBranch,
  deleteBranch,
  archiveBranches,
  deleteBranches,
  restoreArchivedBranch,
  deleteArchivedBranch,
} from '../git.js';

const STATUS_FILTERS = ['all', 'active', 'forgotten', 'merged', 'orphan', 'abandoned'] as const;
const SORT_FIELDS = ['status', 'name', 'date', 'age'] as const;

interface Props {
  initialPath?: string;
}

export default function TuiApp({ initialPath = '' }: Props) {
  const { exit } = useApp();
  const [repoPath, setRepoPath] = useState(initialPath);
  const [focusedSection, setFocusedSection] = useState<'input' | 'filters' | 'list'>(
    initialPath ? 'list' : 'input'
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(new Set());
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('status');
  const [confirm, setConfirm] = useState<{ type: 'archive' | 'delete'; branch: string } | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const { data, archived, currentBranch, loading, error, scan } = useGitData(repoPath);

  const branches = data?.branches ?? [];
  const mainBranch = data?.mainBranch;
  const protectedBranches = new Set([mainBranch, currentBranch].filter(Boolean));

  const handleScan = useCallback(() => {
    setSelectedIndex(0);
    setExpandedBranch(null);
    setSelectedBranches(new Set());
    setFocusedSection('list');
    scan();
  }, [scan]);

  // When scan fails, focus back to input so user can fix path
  useEffect(() => {
    if (error) {
      setFocusedSection('input');
    }
  }, [error]);

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

  const handleRestore = useCallback(async (name: string) => {
    try {
      const result = await restoreArchivedBranch(repoPath, name);
      if (result.success) {
        showToast('success', result.message);
        scan();
      } else {
        showToast('error', result.message);
      }
    } catch {
      showToast('error', `Failed to restore ${name}`);
    }
  }, [repoPath, scan]);

  const handlePermanentDelete = useCallback(async (name: string) => {
    try {
      const result = await deleteArchivedBranch(repoPath, name);
      if (result.success) {
        showToast('success', result.message);
        scan();
      } else {
        showToast('error', result.message);
      }
    } catch {
      showToast('error', `Failed to delete ${name}`);
    }
  }, [repoPath, scan]);

  const handleBulkArchive = useCallback(async () => {
    if (selectedBranches.size === 0) return;
    try {
      const names = [...selectedBranches];
      const result = await archiveBranches(repoPath, names, mainBranch);
      if (result.success) {
        showToast('success', `Archived ${names.length} branch(es)`);
      } else {
        const failed = result.results.filter((r) => !r.success);
        showToast('error', `${failed.length} branch(es) failed to archive`);
      }
      setSelectedBranches(new Set());
      scan();
    } catch {
      showToast('error', 'Bulk archive failed');
    }
  }, [repoPath, mainBranch, selectedBranches, scan]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedBranches.size === 0) return;
    try {
      const names = [...selectedBranches];
      const result = await deleteBranches(repoPath, names, false, mainBranch);
      if (result.success) {
        showToast('success', `Deleted ${names.length} branch(es)`);
      } else {
        const failed = result.results.filter((r) => !r.success);
        showToast('error', `${failed.length} branch(es) failed to delete`);
      }
      setSelectedBranches(new Set());
      scan();
    } catch {
      showToast('error', 'Bulk delete failed');
    }
  }, [repoPath, mainBranch, selectedBranches, scan]);

  const handleBulkRestore = useCallback(async () => {
    if (selectedBranches.size === 0) return;
    const names = [...selectedBranches];
    let ok = 0;
    let fail = 0;
    for (const name of names) {
      try {
        const result = await restoreArchivedBranch(repoPath, name);
        if (result.success) ok++;
        else fail++;
      } catch {
        fail++;
      }
    }
    if (fail === 0) showToast('success', `Restored ${ok} branch(es)`);
    else showToast('error', `${fail}/${names.length} failed to restore`);
    setSelectedBranches(new Set());
    scan();
  }, [repoPath, selectedBranches, scan]);

  const handleBulkPermanentDelete = useCallback(async () => {
    if (selectedBranches.size === 0) return;
    const names = [...selectedBranches];
    let ok = 0;
    let fail = 0;
    for (const name of names) {
      try {
        const result = await deleteArchivedBranch(repoPath, name);
        if (result.success) ok++;
        else fail++;
      } catch {
        fail++;
      }
    }
    if (fail === 0) showToast('success', `Deleted ${ok} archive(s)`);
    else showToast('error', `${fail}/${names.length} failed`);
    setSelectedBranches(new Set());
    scan();
  }, [repoPath, selectedBranches, scan]);

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
    // Global keys (work from any section)
    if (key.escape || input === 'q') {
      exit();
      return;
    }

    if (input === 's') {
      handleScan();
      return;
    }

    if (key.tab) {
      setShowArchived((prev) => !prev);
      setSelectedIndex(0);
      setExpandedBranch(null);
      setSelectedBranches(new Set());
      return;
    }

    if (confirm) {
      if (key.escape || input === 'n') {
        setConfirm(null);
      }
      if (input === 'y' || key.return) {
        const { type, branch } = confirm;
        setConfirm(null);
        if (type === 'archive') handleArchive(branch);
        else handleDelete(branch);
      }
      return;
    }

    // Section-specific keys
    if (focusedSection === 'input') {
      // Only Escape and global 'q' are handled (above). Enter triggers onSubmit in TextInput.
      // Space, '/', and 'f' are captured by TextInput.
      return;
    }

    if (input === '/' || input === 'i') {
      setFocusedSection('input');
      return;
    }

    if (focusedSection === 'filters') {
      if (key.return) {
        setFocusedSection('list');
        return;
      }
      if (key.upArrow) {
        const idx = STATUS_FILTERS.indexOf(statusFilter as typeof STATUS_FILTERS[number]);
        setStatusFilter(
          idx <= 0 ? STATUS_FILTERS[STATUS_FILTERS.length - 1] : STATUS_FILTERS[idx - 1]
        );
        return;
      }
      if (key.downArrow) {
        const idx = STATUS_FILTERS.indexOf(statusFilter as typeof STATUS_FILTERS[number]);
        setStatusFilter(
          idx >= STATUS_FILTERS.length - 1 ? STATUS_FILTERS[0] : STATUS_FILTERS[idx + 1]
        );
        return;
      }
      if (key.leftArrow) {
        const idx = SORT_FIELDS.indexOf(sortField as typeof SORT_FIELDS[number]);
        setSortField(
          idx <= 0 ? SORT_FIELDS[SORT_FIELDS.length - 1] : SORT_FIELDS[idx - 1]
        );
        return;
      }
      if (key.rightArrow) {
        const idx = SORT_FIELDS.indexOf(sortField as typeof SORT_FIELDS[number]);
        setSortField(
          idx >= SORT_FIELDS.length - 1 ? SORT_FIELDS[0] : SORT_FIELDS[idx + 1]
        );
        return;
      }
      if (input === 'f') {
        setFocusedSection('list');
        return;
      }
      return;
    }

    // Section: list
    if (input === 'f' && !showArchived) {
      setFocusedSection('filters');
      return;
    }

    if (input === 'a' && !showArchived) {
      if (selectedBranches.size > 0) {
        const safe = [...selectedBranches].filter((n) => !protectedBranches.has(n));
        if (safe.length === 0) {
          showToast('error', 'Cannot archive protected branches');
          return;
        }
        handleBulkArchive();
        return;
      }
      const branch = filteredBranches[selectedIndex];
      if (branch) {
        if (protectedBranches.has(branch.name)) {
          showToast('error', `Cannot archive protected branch "${branch.name}"`);
          return;
        }
        setConfirm({ type: 'archive', branch: branch.name });
      }
      return;
    }

    if (input === 'd' && !showArchived) {
      if (selectedBranches.size > 0) {
        const safe = [...selectedBranches].filter((n) => !protectedBranches.has(n));
        if (safe.length === 0) {
          showToast('error', 'Cannot delete protected branches');
          return;
        }
        handleBulkDelete();
        return;
      }
      const branch = filteredBranches[selectedIndex];
      if (branch) {
        if (protectedBranches.has(branch.name)) {
          showToast('error', `Cannot delete protected branch "${branch.name}"`);
          return;
        }
        setConfirm({ type: 'delete', branch: branch.name });
      }
      return;
    }

    // Archived-specific actions
    if (input === 'r' && showArchived) {
      if (selectedBranches.size > 0) {
        handleBulkRestore();
        return;
      }
      const branch = archived[selectedIndex];
      if (branch) handleRestore(branch.name);
      return;
    }

    if (input === 'D' && showArchived) {
      if (selectedBranches.size > 0) {
        handleBulkPermanentDelete();
        return;
      }
      const branch = archived[selectedIndex];
      if (branch) handlePermanentDelete(branch.name);
      return;
    }

    if (key.return) {
      if (showArchived) {
        const branch = archived[selectedIndex];
        if (branch) {
          setExpandedBranch((prev) =>
            prev === branch.name ? null : branch.name
          );
        }
      } else {
        const branch = filteredBranches[selectedIndex];
        if (branch) {
          setExpandedBranch((prev) =>
            prev === branch.name ? null : branch.name
          );
        }
      }
      return;
    }

    const listLength = showArchived ? archived.length : filteredBranches.length;

    if (key.upArrow && listLength > 0) {
      setSelectedIndex((prev) => (prev <= 0 ? listLength - 1 : prev - 1));
      return;
    }

    if (key.downArrow && listLength > 0) {
      setSelectedIndex((prev) => (prev >= listLength - 1 ? 0 : prev + 1));
      return;
    }

    if (input === ' ') {
      const item = showArchived ? archived[selectedIndex] : filteredBranches[selectedIndex];
      if (item) {
        setSelectedBranches((prev) => {
          const next = new Set(prev);
          if (next.has(item.name)) next.delete(item.name);
          else next.add(item.name);
          return next;
        });
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
        <Box marginY={1} flexDirection="column">
          <Text color={COLORS.danger}>Error: {error}</Text>
          <Text color={COLORS.textSecondary}>Edit the path above and press Enter or s to retry</Text>
        </Box>
      )}

      <StatsBar data={data} archivedCount={archived.length} currentBranch={currentBranch} loading={loading} />

      <Box marginBottom={1} gap={2}>
        <Text color={!showArchived ? COLORS.accent : COLORS.textSecondary} bold={!showArchived}>
          Branches{data ? ` (${data.totalLocal})` : ''}
        </Text>
        <Text color={showArchived ? COLORS.accent : COLORS.textSecondary} bold={showArchived}>
          Archived ({archived.length})
        </Text>
        <Text dimColor>Tab to switch</Text>
        {selectedBranches.size > 0 && (
          <Text color={COLORS.warning}>
            {selectedBranches.size} selected{' '}
            {showArchived ? '— r/D to bulk restore/delete' : '— a/d to bulk archive/delete'}
          </Text>
        )}
      </Box>

      {showArchived ? (
        <ArchivedList
          archived={archived}
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
          onRestore={(name) => handleRestore(name)}
          onDelete={(name) => handlePermanentDelete(name)}
        />
      ) : (
        <>
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
              mainBranch={mainBranch || ''}
              currentBranch={currentBranch}
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
        </>
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
