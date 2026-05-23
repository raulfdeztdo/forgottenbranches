import { useKeyboard, type KeyHandler } from './useKeyboard.js';

const STATUS_FILTERS = ['all', 'active', 'forgotten', 'merged', 'orphan', 'abandoned'] as const;
const SORT_FIELDS = ['status', 'name', 'date', 'age'] as const;

export interface TuiState {
  focusedSection: 'input' | 'filters' | 'list';
  selectedIndex: number;
  selectedBranches: Set<string>;
  expandedBranch: string | null;
  searchQuery: string;
  statusFilter: string;
  sortField: string;
  showArchived: boolean;
}

export type TuiAction =
  | { type: 'SET_FOCUS'; section: TuiState['focusedSection'] }
  | { type: 'SET_SELECTED_INDEX'; index: number }
  | { type: 'TOGGLE_SELECT'; name: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'TOGGLE_EXPAND'; name: string }
  | { type: 'SET_SEARCH'; query: string }
  | { type: 'SET_STATUS_FILTER'; filter: string }
  | { type: 'SET_SORT'; field: string }
  | { type: 'TOGGLE_ARCHIVED' };

export function tuiReducer(state: TuiState, action: TuiAction): TuiState {
  switch (action.type) {
    case 'SET_FOCUS':
      return { ...state, focusedSection: action.section };
    case 'SET_SELECTED_INDEX':
      return { ...state, selectedIndex: action.index };
    case 'TOGGLE_SELECT': {
      const next = new Set(state.selectedBranches);
      if (next.has(action.name)) next.delete(action.name);
      else next.add(action.name);
      return { ...state, selectedBranches: next };
    }
    case 'CLEAR_SELECTION':
      return { ...state, selectedBranches: new Set() };
    case 'TOGGLE_EXPAND':
      return {
        ...state,
        expandedBranch: state.expandedBranch === action.name ? null : action.name,
      };
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.query };
    case 'SET_STATUS_FILTER':
      return { ...state, statusFilter: action.filter };
    case 'SET_SORT':
      return { ...state, sortField: action.field };
    case 'TOGGLE_ARCHIVED':
      return {
        ...state,
        showArchived: !state.showArchived,
        selectedIndex: 0,
        expandedBranch: null,
        selectedBranches: new Set(),
      };
    default:
      return state;
  }
}

interface KeyboardHandlerDeps {
  state: TuiState;
  dispatch: React.Dispatch<TuiAction>;
  repoPath: string;
  setRepoPath: (v: string) => void;
  filteredBranches: { name: string }[];
  archived: { name: string }[];
  mainBranch?: string;
  currentBranch?: string | null;
  confirm: { type: 'archive' | 'delete'; branch: string } | null;
  setConfirm: (c: { type: 'archive' | 'delete'; branch: string } | null) => void;
  onScan: () => void;
  onExit: () => void;
  onSingleArchive: (name: string) => void;
  onSingleDelete: (name: string) => void;
  onBulkArchive: () => void;
  onBulkDelete: () => void;
  onRestore: (name: string) => void;
  onBulkRestore: () => void;
  onPermanentDelete: (name: string) => void;
  onBulkPermanentDelete: () => void;
}

export function useTuiKeyboard(deps: KeyboardHandlerDeps) {
  const {
    state,
    dispatch,
    setRepoPath,
    filteredBranches,
    archived,
    mainBranch,
    currentBranch,
    confirm,
    setConfirm,
    onScan,
    onExit,
    onSingleArchive,
    onSingleDelete,
    onBulkArchive,
    onBulkDelete,
    onRestore,
    onBulkRestore,
    onPermanentDelete,
    onBulkPermanentDelete,
  } = deps;

  const listLength = state.showArchived ? archived.length : filteredBranches.length;
  const protectedSet = new Set([mainBranch, currentBranch].filter(Boolean));

  useKeyboard(((input, key) => {
    if (key.escape || input === 'q') { onExit(); return; }
    if (input === 's') { onScan(); return; }

    if (key.tab) { dispatch({ type: 'TOGGLE_ARCHIVED' }); return; }

    if (confirm) {
      if (key.escape || input === 'n') { setConfirm(null); return; }
      if (input === 'y' || key.return) {
        const { type, branch } = confirm;
        setConfirm(null);
        if (type === 'archive') onSingleArchive(branch);
        else onSingleDelete(branch);
      }
      return;
    }

    if (state.focusedSection === 'input') return;

    if (input === '/' || input === 'i') { dispatch({ type: 'SET_FOCUS', section: 'input' }); return; }

    if (state.focusedSection === 'filters') {
      if (key.return) { dispatch({ type: 'SET_FOCUS', section: 'list' }); return; }
      if (key.upArrow) {
        const idx = STATUS_FILTERS.indexOf(state.statusFilter as typeof STATUS_FILTERS[number]);
        dispatch({ type: 'SET_STATUS_FILTER', filter: idx <= 0 ? STATUS_FILTERS[STATUS_FILTERS.length - 1] : STATUS_FILTERS[idx - 1] });
        return;
      }
      if (key.downArrow) {
        const idx = STATUS_FILTERS.indexOf(state.statusFilter as typeof STATUS_FILTERS[number]);
        dispatch({ type: 'SET_STATUS_FILTER', filter: idx >= STATUS_FILTERS.length - 1 ? STATUS_FILTERS[0] : STATUS_FILTERS[idx + 1] });
        return;
      }
      if (key.leftArrow) {
        const idx = SORT_FIELDS.indexOf(state.sortField as typeof SORT_FIELDS[number]);
        dispatch({ type: 'SET_SORT', field: idx <= 0 ? SORT_FIELDS[SORT_FIELDS.length - 1] : SORT_FIELDS[idx - 1] });
        return;
      }
      if (key.rightArrow) {
        const idx = SORT_FIELDS.indexOf(state.sortField as typeof SORT_FIELDS[number]);
        dispatch({ type: 'SET_SORT', field: idx >= SORT_FIELDS.length - 1 ? SORT_FIELDS[0] : SORT_FIELDS[idx + 1] });
        return;
      }
      if (input === 'f') { dispatch({ type: 'SET_FOCUS', section: 'list' }); return; }
      return;
    }

    if (input === 'f' && !state.showArchived) { dispatch({ type: 'SET_FOCUS', section: 'filters' }); return; }

    if (input === 'a' && !state.showArchived) {
      if (state.selectedBranches.size > 0) {
        if ([...state.selectedBranches].every((n) => protectedSet.has(n))) {
          return;
        }
        onBulkArchive();
        return;
      }
      const branch = filteredBranches[state.selectedIndex];
      if (branch && !protectedSet.has(branch.name)) setConfirm({ type: 'archive', branch: branch.name });
      return;
    }

    if (input === 'd' && !state.showArchived) {
      if (state.selectedBranches.size > 0) {
        if ([...state.selectedBranches].every((n) => protectedSet.has(n))) {
          return;
        }
        onBulkDelete();
        return;
      }
      const branch = filteredBranches[state.selectedIndex];
      if (branch && !protectedSet.has(branch.name)) setConfirm({ type: 'delete', branch: branch.name });
      return;
    }

    if (input === 'r' && state.showArchived) {
      if (state.selectedBranches.size > 0) { onBulkRestore(); return; }
      const branch = archived[state.selectedIndex];
      if (branch) onRestore(branch.name);
      return;
    }

    if (input === 'D' && state.showArchived) {
      if (state.selectedBranches.size > 0) { onBulkPermanentDelete(); return; }
      const branch = archived[state.selectedIndex];
      if (branch) onPermanentDelete(branch.name);
      return;
    }

    if (key.return) {
      const item = state.showArchived ? archived[state.selectedIndex] : filteredBranches[state.selectedIndex];
      if (item) dispatch({ type: 'TOGGLE_EXPAND', name: item.name });
      return;
    }

    if (key.upArrow && listLength > 0) {
      dispatch({ type: 'SET_SELECTED_INDEX', index: state.selectedIndex <= 0 ? listLength - 1 : state.selectedIndex - 1 });
      return;
    }

    if (key.downArrow && listLength > 0) {
      dispatch({ type: 'SET_SELECTED_INDEX', index: state.selectedIndex >= listLength - 1 ? 0 : state.selectedIndex + 1 });
      return;
    }

    if (input === ' ') {
      const item = state.showArchived ? archived[state.selectedIndex] : filteredBranches[state.selectedIndex];
      if (item) dispatch({ type: 'TOGGLE_SELECT', name: item.name });
    }
  }) as KeyHandler);
}
