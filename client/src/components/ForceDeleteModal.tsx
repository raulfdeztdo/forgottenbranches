import { useState } from 'react';
import { AlertTriangle, Trash2, X, GitBranch } from 'lucide-react';

export interface FailedBranch {
  branch: string;
  message: string;
}

interface Props {
  failedBranches: FailedBranch[];
  repoPath: string;
  onConfirm: (names: string[]) => Promise<void>;
  onClose: () => void;
}

export default function ForceDeleteModal({
  failedBranches,
  repoPath: _repoPath,
  onConfirm,
  onClose,
}: Props) {
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(failedBranches.map((f) => f.branch))
  );

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  async function handleForceDelete() {
    if (selected.size === 0) return;
    setDeleting(true);
    try {
      await onConfirm([...selected]);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fdm-title"
      >
        <div className="modal-header">
          <span className="modal-header-icon">
            <AlertTriangle size={18} />
          </span>
          <h2 className="modal-title" id="fdm-title">
            Some branches could not be deleted
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <p className="modal-desc">
          The following branches are <strong>not fully merged</strong> into
          main and were skipped. Select the ones you want to force-delete —
          this action is irreversible and may cause data loss.
        </p>

        <ul className="fdm-list">
          {failedBranches.map((f) => (
            <li
              key={f.branch}
              className={`fdm-item ${selected.has(f.branch) ? 'fdm-item--selected' : ''}`}
              onClick={() => toggle(f.branch)}
            >
              <input
                type="checkbox"
                className="fdm-checkbox"
                checked={selected.has(f.branch)}
                onChange={() => toggle(f.branch)}
                onClick={(e) => e.stopPropagation()}
              />
              <GitBranch size={13} className="fdm-branch-icon" />
              <span className="fdm-branch-name">{f.branch}</span>
              <span className="fdm-reason">{f.message}</span>
            </li>
          ))}
        </ul>

        <div className="modal-footer">
          <button className="modal-btn modal-btn-cancel" onClick={onClose} disabled={deleting}>
            <X size={14} /> Cancel
          </button>
          <button
            className="modal-btn modal-btn-force"
            onClick={handleForceDelete}
            disabled={deleting || selected.size === 0}
          >
            <Trash2 size={14} />
            {deleting
              ? 'Force deleting...'
              : `Force delete ${selected.size} branch${selected.size !== 1 ? 'es' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
