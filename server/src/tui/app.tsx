import { useState, useCallback, useMemo, useReducer, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { COLORS } from './colors.js';
import { useGitData } from './hooks/useGitData.js';
import { useTuiKeyboard, tuiReducer, type TuiState } from './hooks/useTuiKeyboard.js';
import Header from './components/Header.js';
import StatsBar from './components/StatsBar.js';
import FilterBar from './components/FilterBar.js';
import BranchList from './components/BranchList.js';
import ArchivedList from './components/ArchivedList.js';
import ConfirmDialog from './components/ConfirmDialog.js';
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

interface Props {
  initialPath?: string;
}

const initialTuiState: TuiState = {
  focusedSection: 'list',
  selectedIndex: 0,
  selectedBranches: new Set(),
  expandedBranch: null,
  searchQuery: '',
  statusFilter: 'all',
  sortField: 'status',
  showArchived: false,
};

export default function TuiApp({ initialPath = '' }: Props) {
  const { exit } = useApp();
  const [repoPath, setRepoPath] = useState(initialPath);
  const [state, dispatch] = useReducer(tuiReducer, {
    ...initialTuiState,
    focusedSection: initialPath ? 'list' : 'input',
  });
  const [confirm, setConfirm] = useState<{ type: 'archive' | 'delete'; branch: string } | null>(null);
  const { data, archived, currentBranch, loading, error, scan } = useGitData(repoPath);

  useEffect(() => {
    if (repoPath) scan();
  }, [repoPath, scan]);

  const branches = data?.branches ?? [];
  const mainBranch = data?.mainBranch;
  const protectedSet = useMemo(() => new Set([mainBranch, currentBranch].filter(Boolean)), [mainBranch, currentBranch]);

  const filteredBranches = useMemo(
    () =>
      branches.filter((b) => {
        if (state.statusFilter !== 'all' && b.status !== state.statusFilter) return false;
        if (state.searchQuery) {
          const q = state.searchQuery.toLowerCase();
          if (!b.name.toLowerCase().includes(q) && !b.lastCommitMessage.toLowerCase().includes(q)) return false;
        }
        return true;
      }),
    [branches, state.statusFilter, state.searchQuery]
  );

  const handleScan = useCallback(async () => {
    dispatch({ type: 'SET_SELECTED_INDEX', index: 0 });
    dispatch({ type: 'CLEAR_SELECTION' });
    dispatch({ type: 'SET_FOCUS', section: 'list' });
    if (state.expandedBranch) dispatch({ type: 'TOGGLE_EXPAND', name: state.expandedBranch });
    const ok = await scan();
    if (!ok) dispatch({ type: 'SET_FOCUS', section: 'input' });
  }, [scan, state.expandedBranch]);

  const refreshAfterAction = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
    dispatch({ type: 'SET_FOCUS', section: 'list' });
    scan();
  }, [scan]);

  const handleArchive = useCallback(
    async (name: string) => {
      try {
        const r = await archiveBranch(repoPath, name, mainBranch);
        showToast(r.success ? 'success' : 'error', r.message);
        if (r.success) refreshAfterAction();
      } catch {
        showToast('error', `Failed to archive ${name}`);
      }
    },
    [repoPath, mainBranch, refreshAfterAction]
  );

  const handleDelete = useCallback(
    async (name: string) => {
      try {
        const r = await deleteBranch(repoPath, name, false, mainBranch);
        showToast(r.success ? 'success' : 'error', r.message);
        if (r.success) refreshAfterAction();
      } catch {
        showToast('error', `Failed to delete ${name}`);
      }
    },
    [repoPath, mainBranch, refreshAfterAction]
  );

  const handleBulkArchive = useCallback(async () => {
    const names = [...state.selectedBranches];
    try {
      const r = await archiveBranches(repoPath, names, mainBranch);
      showToast(r.success ? 'success' : 'error', r.success ? `Archived ${names.length} branch(es)` : `${r.results.filter((x) => !x.success).length} failed`);
      refreshAfterAction();
    } catch {
      showToast('error', 'Bulk archive failed');
    }
  }, [repoPath, mainBranch, state.selectedBranches, refreshAfterAction]);

  const handleBulkDelete = useCallback(async () => {
    const names = [...state.selectedBranches];
    try {
      const r = await deleteBranches(repoPath, names, false, mainBranch);
      showToast(r.success ? 'success' : 'error', r.success ? `Deleted ${names.length} branch(es)` : `${r.results.filter((x) => !x.success).length} failed`);
      refreshAfterAction();
    } catch {
      showToast('error', 'Bulk delete failed');
    }
  }, [repoPath, mainBranch, state.selectedBranches, refreshAfterAction]);

  const handleRestore = useCallback(
    async (name: string) => {
      try {
        const r = await restoreArchivedBranch(repoPath, name);
        showToast(r.success ? 'success' : 'error', r.message);
        if (r.success) refreshAfterAction();
      } catch {
        showToast('error', `Failed to restore ${name}`);
      }
    },
    [repoPath, refreshAfterAction]
  );

  const handlePermanentDelete = useCallback(
    async (name: string) => {
      try {
        const r = await deleteArchivedBranch(repoPath, name);
        showToast(r.success ? 'success' : 'error', r.message);
        if (r.success) refreshAfterAction();
      } catch {
        showToast('error', `Failed to delete ${name}`);
      }
    },
    [repoPath, refreshAfterAction]
  );

  const handleBulkRestore = useCallback(async () => {
    const names = [...state.selectedBranches];
    const results = await Promise.all(
      names.map((n) => restoreArchivedBranch(repoPath, n).catch(() => ({ success: false, message: '' })))
    );
    const ok = results.filter((r) => r.success).length;
    showToast(ok === names.length ? 'success' : 'error', ok === names.length ? `Restored ${ok} branch(es)` : `${names.length - ok}/${names.length} failed`);
    refreshAfterAction();
  }, [repoPath, state.selectedBranches, refreshAfterAction]);

  const handleBulkPermanentDelete = useCallback(async () => {
    const names = [...state.selectedBranches];
    const results = await Promise.all(
      names.map((n) => deleteArchivedBranch(repoPath, n).catch(() => ({ success: false, message: '' })))
    );
    const ok = results.filter((r) => r.success).length;
    showToast(ok === names.length ? 'success' : 'error', ok === names.length ? `Deleted ${ok} archive(s)` : `${names.length - ok}/${names.length} failed`);
    refreshAfterAction();
  }, [repoPath, state.selectedBranches, refreshAfterAction]);

  function getProtectedReason(name: string): string {
    if (name === currentBranch) return 'current checked-out branch';
    if (name === mainBranch) return 'main branch';
    return '';
  }

  useTuiKeyboard({
    state,
    dispatch,
    repoPath,
    setRepoPath,
    filteredBranches,
    archived,
    mainBranch,
    currentBranch,
    confirm,
    setConfirm,
    onScan: handleScan,
    onExit: exit,
    onSingleArchive: (name) => handleArchive(name),
    onSingleDelete: (name) => handleDelete(name),
    onBulkArchive: handleBulkArchive,
    onBulkDelete: handleBulkDelete,
    onRestore: (name) => handleRestore(name),
    onBulkRestore: handleBulkRestore,
    onPermanentDelete: (name) => handlePermanentDelete(name),
    onBulkPermanentDelete: handleBulkPermanentDelete,
  });

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Header
        repoPath={repoPath}
        focused={state.focusedSection === 'input'}
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
        <Text color={!state.showArchived ? COLORS.accent : COLORS.textSecondary} bold={!state.showArchived}>
          Branches{data ? ` (${data.totalLocal})` : ''}
        </Text>
        <Text color={state.showArchived ? COLORS.accent : COLORS.textSecondary} bold={state.showArchived}>
          Archived ({archived.length})
        </Text>
        <Text dimColor>Tab to switch</Text>
        {state.selectedBranches.size > 0 && (
          <Text color={COLORS.warning}>
            {state.selectedBranches.size} selected{' '}
            {state.showArchived ? '— r/D to bulk restore/delete' : '— a/d to bulk archive/delete'}
          </Text>
        )}
      </Box>

      {state.showArchived ? (
        <ArchivedList
          archived={archived}
          selectedIndex={state.selectedIndex}
          selectedBranches={state.selectedBranches}
          expandedBranch={state.expandedBranch}
          onToggleSelect={(name) => dispatch({ type: 'TOGGLE_SELECT', name })}
          onToggleExpand={(name) => dispatch({ type: 'TOGGLE_EXPAND', name })}
          onRestore={(name) => handleRestore(name)}
          onDelete={(name) => handlePermanentDelete(name)}
        />
      ) : (
        <>
          <FilterBar
            searchQuery={state.searchQuery}
            statusFilter={state.statusFilter}
            sortField={state.sortField}
            focused={state.focusedSection === 'filters'}
            onSearchChange={(v) => dispatch({ type: 'SET_SEARCH', query: v })}
            onStatusFilterChange={(v) => dispatch({ type: 'SET_STATUS_FILTER', filter: v })}
            onSortFieldChange={(v) => dispatch({ type: 'SET_SORT', field: v })}
          />

          {loading ? (
            <Box marginY={2}>
              <Text color={COLORS.textSecondary}>Scanning repository…</Text>
            </Box>
          ) : (
            <BranchList
              branches={branches}
              mainBranch={mainBranch || ''}
              currentBranch={currentBranch}
              searchQuery={state.searchQuery}
              statusFilter={state.statusFilter}
              sortField={state.sortField}
              selectedIndex={state.selectedIndex}
              selectedBranches={state.selectedBranches}
              expandedBranch={state.expandedBranch}
              onToggleSelect={(name) => dispatch({ type: 'TOGGLE_SELECT', name })}
              onToggleExpand={(name) => dispatch({ type: 'TOGGLE_EXPAND', name })}
              onArchive={(name) => {
                if (protectedSet.has(name)) {
                  showToast('error', `Cannot archive "${name}" — ${getProtectedReason(name)}`);
                  return;
                }
                setConfirm({ type: 'archive', branch: name });
              }}
              onDelete={(name) => {
                if (protectedSet.has(name)) {
                  showToast('error', `Cannot delete "${name}" — ${getProtectedReason(name)}`);
                  return;
                }
                setConfirm({ type: 'delete', branch: name });
              }}
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
