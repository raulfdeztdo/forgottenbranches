import { useState } from 'react';
import {
  GitBranch,
  ChevronDown,
  ChevronRight,
  Undo2,
  Trash2,
  Square,
  CheckSquare,
} from 'lucide-react';
import { ArchivedBranch } from '../types';

interface Props {
  branches: ArchivedBranch[];
  onUnarchive: (names: string[]) => void;
  onDelete: (names: string[]) => void;
}

function fmt(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function fmtFull(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ArchivedRow({
  b,
  selected,
  onToggle,
  onUnarchive,
  onDelete,
}: {
  b: ArchivedBranch;
  selected: boolean;
  onToggle: () => void;
  onUnarchive: (name: string) => void;
  onDelete: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr className="arch-row" onClick={() => setOpen(!open)}>
        <td className="arch-check">
          <span
            className={`check-cell ${selected ? 'checked' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            {selected ? <CheckSquare size={15} /> : <Square size={15} />}
          </span>
        </td>
        <td>
          <span className="arch-expand">
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          <GitBranch size={13} className="arch-branch-icon" />
          <span className="arch-name" title={b.name}>
            {b.name}
          </span>
        </td>
        <td>
          <div className="arch-commit-msg" title={b.commitMessage}>
            {b.commitMessage}
          </div>
          <div className="arch-commit-author">{b.commitAuthor}</div>
        </td>
        <td>{fmt(b.commitDate)}</td>
        <td>{fmt(b.archivedAt)}</td>
        <td>
          <div className="arch-actions">
            <button
              className="arch-btn arch-restore"
              onClick={(e) => {
                e.stopPropagation();
                onUnarchive(b.name);
              }}
              title="Restore"
            >
              <Undo2 size={13} />
            </button>
            <button
              className="arch-btn arch-del"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(b.name);
              }}
              title="Delete permanently"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      </tr>
      {open && (
        <tr className="arch-detail-row">
          <td colSpan={6}>
            <div className="arch-detail">
              <div className="arch-detail-name">
                <GitBranch size={14} />
                <span>{b.name}</span>
              </div>
              <div className="arch-detail-grid">
                <div>
                  <span className="arch-dl">Commit hash</span>
                  <code>{b.commitHash}</code>
                </div>
                <div>
                  <span className="arch-dl">Author</span>
                  <span>{b.commitAuthor}</span>
                </div>
                <div>
                  <span className="arch-dl">Last commit date</span>
                  <span>{fmtFull(b.commitDate)}</span>
                </div>
                <div>
                  <span className="arch-dl">Archived at</span>
                  <span>{fmtFull(b.archivedAt)}</span>
                </div>
                <div className="arch-detail-msg">
                  <span className="arch-dl">Last commit message</span>
                  <span>{b.commitMessage}</span>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function ArchivedTable({ branches, onUnarchive, onDelete }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleOne(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function toggleAll() {
    const all = new Set(branches.map((b) => b.name));
    if (selected.size === branches.length && branches.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(all);
    }
  }

  function clearSelection() {
    setSelected(new Set());
  }

  const selectedCount = selected.size;
  const allChecked = branches.length > 0 && selected.size === branches.length;

  return (
    <div className="table-card">
      {selectedCount > 0 && (
        <div className="bulk-bar">
          <span className="bulk-count">{selectedCount} selected</span>
          <button
            className="bulk-btn bulk-restore"
            onClick={() => {
              onUnarchive([...selected]);
              clearSelection();
            }}
          >
            <Undo2 size={14} /> Restore
          </button>
          <button
            className="bulk-btn bulk-delete"
            onClick={() => {
              onDelete([...selected]);
              clearSelection();
            }}
          >
            <Trash2 size={14} /> Delete
          </button>
          <button className="bulk-btn bulk-cancel" onClick={clearSelection}>
            Clear
          </button>
        </div>
      )}

      <div className="table-toolbar">
        <span className="result-count">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ verticalAlign: 'middle', marginRight: 4 }}
          >
            <rect width="20" height="5" x="2" y="3" rx="1" />
            <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
            <path d="M10 12h4" />
          </svg>
          Archived branches
        </span>
        <span className="result-count" style={{ marginLeft: 'auto' }}>
          {branches.length} archived
        </span>
      </div>

      {branches.length === 0 ? (
        <div className="empty-row">No archived branches</div>
      ) : (
        <div className="table-scroll">
          <table className="arch-table">
            <colgroup>
              <col style={{ width: '30px' }} />
              <col style={{ width: '35%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '70px' }} />
            </colgroup>
            <thead>
              <tr>
                <th>
                  <span
                    className={`check-cell ${allChecked ? 'checked' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAll();
                    }}
                  >
                    {allChecked ? <CheckSquare size={15} /> : <Square size={15} />}
                  </span>
                </th>
                <th>Branch</th>
                <th>Last Commit</th>
                <th>Commit Date</th>
                <th>Archived</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <ArchivedRow
                  key={b.name}
                  b={b}
                  selected={selected.has(b.name)}
                  onToggle={() => toggleOne(b.name)}
                  onUnarchive={(name) => {
                    clearSelection();
                    onUnarchive([name]);
                  }}
                  onDelete={(name) => {
                    clearSelection();
                    onDelete([name]);
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
