import { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Search,
  Archive,
  Trash2,
  Square,
  CheckSquare,
} from 'lucide-react';
import { BranchInfo } from '@forgottenbranches/types';
import BranchDetail from './BranchDetail';

interface Props {
  branches: BranchInfo[];
  mainBranch: string;
  currentBranch?: string | null;
  repoPath: string;
  refreshing?: boolean;
  onBranchDeleted: () => void;
  onArchive: (names: string[]) => void;
  onBulkDelete: (names: string[]) => void;
}

type SortKey = 'name' | 'lastCommitDate' | 'daysSinceLastCommit' | 'status';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'forgotten', label: 'Forgotten' },
  { value: 'merged', label: 'Merged' },
  { value: 'orphan', label: 'Orphan' },
  { value: 'abandoned', label: 'Abandoned' },
] as const;

const STATUS_SORT = [
  'active',
  'forgotten',
  'orphan',
  'merged',
  'abandoned',
] as const;

export default function BranchTable({
  branches,
  mainBranch,
  currentBranch,
  repoPath,
  refreshing,
  onBranchDeleted,
  onArchive,
  onBulkDelete,
}: Props) {
  const [sortBy, setSortBy] = useState<SortKey>('status');
  const [sortAsc, setSortAsc] = useState(false);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sorted = useMemo(() => {
    const filtered = branches.filter((b) => {
      const nameMatch = b.name.toLowerCase().includes(filter.toLowerCase());
      const statusMatch =
        statusFilter === 'all' || b.status === statusFilter;
      return nameMatch && statusMatch;
    });

    return filtered.toSorted((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'lastCommitDate':
          cmp =
            new Date(a.lastCommitDate).getTime() -
            new Date(b.lastCommitDate).getTime();
          break;
        case 'daysSinceLastCommit':
          cmp = a.daysSinceLastCommit - b.daysSinceLastCommit;
          break;
        case 'status':
          cmp =
            STATUS_SORT.indexOf(b.status as typeof STATUS_SORT[number]) -
            STATUS_SORT.indexOf(a.status as typeof STATUS_SORT[number]);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [branches, sortBy, sortAsc, filter, statusFilter]);

  function toggleSort(key: SortKey) {
    if (sortBy === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(key);
      setSortAsc(false);
    }
  }

  function toggleSelect(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    const visibleNames = new Set(sorted.map((b) => b.name));
    const allSelected = sorted.every((b) => selected.has(b.name));
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(visibleNames);
    }
  }

  function clearSelection() {
    setSelected(new Set());
  }

  const selectedCount = selected.size;
  const allChecked = sorted.length > 0 && sorted.every((b) => selected.has(b.name));

  return (
    <div className="table-card">
      {refreshing && <div className="refresh-strip" />}

      {selectedCount > 0 && (
        <div className="bulk-bar">
          <span className="bulk-count">{selectedCount} selected</span>
          <button
            type="button"
            className="bulk-btn bulk-archive"
            onClick={() => {
              onArchive([...selected]);
              clearSelection();
            }}
          >
            <Archive size={14} /> Archive
          </button>
          <button
            type="button"
            className="bulk-btn bulk-delete"
            onClick={() => {
              onBulkDelete([...selected]);
              clearSelection();
            }}
          >
            <Trash2 size={14} /> Delete
          </button>
          <button type="button" className="bulk-btn bulk-cancel" onClick={clearSelection}>
            Clear selection
          </button>
        </div>
      )}

      <div className="table-toolbar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Filter branches..."
            aria-label="Filter branches"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {filter && (
            <button type="button" className="search-clear" onClick={() => setFilter('')}>
              &times;
            </button>
          )}
        </div>

        <div className="status-pills">
          {STATUS_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.value}
              className={`pill ${statusFilter === opt.value ? 'pill-selected' : ''} pill-${opt.value}`}
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <span className="result-count">
          {sorted.length}
          {sorted.length !== branches.length && ` / ${branches.length}`}
          {' '}branches
        </span>
      </div>

      <div className="table-scroll">
        <table className="branch-table">
          <colgroup>
            <col style={{ width: '36px' }} />
            <col style={{ width: '28%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '24%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead>
            <tr>
              <th className="th-check">
                <span
                  className={`check-cell ${allChecked ? 'checked' : ''}`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleSelectAll();
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelectAll();
                  }}
                >
                  {allChecked ? (
                    <CheckSquare size={15} />
                  ) : (
                    <Square size={15} />
                  )}
                </span>
              </th>
              <th onClick={() => toggleSort('name')}>
                Branch
                <span className="sort-indicator">
                  <ArrowUpDown size={11} />
                </span>
              </th>
              <th>Upstream</th>
              <th>Last Commit</th>
              <th onClick={() => toggleSort('lastCommitDate')}>
                Date
                <span className="sort-indicator">
                  <ArrowUpDown size={11} />
                </span>
              </th>
              <th onClick={() => toggleSort('daysSinceLastCommit')}>
                Age
                <span className="sort-indicator">
                  <ArrowUpDown size={11} />
                </span>
              </th>
              <th onClick={() => toggleSort('status')}>
                Status
                <span className="sort-indicator">
                  <ArrowUpDown size={11} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody className={refreshing ? 'tbody-dimmed' : ''}>
            {refreshing && sorted.length === 0 && (
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={`skel-${i}`} className="skeleton-tr">
                    <td className="td-check"><span className="skel-block" /></td>
                    <td><span className="skel-block" style={{ width: '220px' }} /></td>
                    <td><span className="skel-block" style={{ width: '130px' }} /></td>
                    <td><span className="skel-block" style={{ width: '180px' }} /></td>
                    <td><span className="skel-block" style={{ width: '90px' }} /></td>
                    <td><span className="skel-block" style={{ width: '70px' }} /></td>
                    <td><span className="skel-block" style={{ width: '80px' }} /></td>
                  </tr>
                ))}
              </>
            )}
            {refreshing && sorted.length > 0 && (
              <tr className="skeleton-tr">
                <td colSpan={7} className="refresh-msg">
                   Refreshing…
                </td>
              </tr>
            )}
            {sorted.length === 0 && !refreshing && (
              <tr>
                <td colSpan={7} className="empty-row">
                  {branches.length === 0
                    ? 'No branches found in this repository'
                    : 'No branches match the current filters'}
                </td>
              </tr>
            )}
            {sorted.map((b) => (
            <BranchDetail
              key={b.name}
              branch={b}
              repoPath={repoPath}
              mainBranch={mainBranch}
              currentBranch={currentBranch}
              selected={selected.has(b.name)}
                onToggleSelect={() => toggleSelect(b.name)}
                onDelete={() => {
                  clearSelection();
                  onBranchDeleted();
                }}
                onArchive={(name) => {
                  clearSelection();
                  onArchive([name]);
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
