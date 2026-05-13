import { useState } from 'react';
import {
  GitBranch,
  GitMerge,
  Clock,
  User,
  MessageSquare,
  Trash2,
  Archive,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  Hash,
  Calendar,
  X,
  Square,
  CheckSquare,
} from 'lucide-react';
import { BranchInfo } from '../types';
import { STATUS_COLORS, STATUS_LABELS } from '../statusConfig';
import { useToast } from './ToastContext';

interface Props {
  branch: BranchInfo;
  repoPath: string;
  selected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onArchive: (name: string) => void;
}

function formatDate(iso: string): string {
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

function formatDateShort(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatRelative(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default function BranchDetail({
  branch,
  repoPath,
  selected,
  onToggleSelect,
  onDelete,
  onArchive,
}: Props) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleDelete(force: boolean) {
    setDeleting(true);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/branches?path=${encodeURIComponent(repoPath)}&branch=${encodeURIComponent(branch.name)}&force=${force}`,
        { method: 'DELETE' }
      );
      const json = await res.json();
      if (!res.ok) {
        const msg = json.error || json.message || 'Delete failed';
        setActionError(msg);
        toast('error', `Failed to delete "${branch.name}"`, msg);
        return;
      }
      toast('success', `Branch "${branch.name}" deleted`);
      setShowDelete(false);
      onDelete();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection error';
      setActionError(msg);
      toast('error', `Failed to delete "${branch.name}"`, msg);
    } finally {
      setDeleting(false);
    }
  }

  async function handleArchive() {
    setArchiving(true);
    setActionError(null);
    try {
      const res = await fetch('/api/branches/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: repoPath,
          branches: [branch.name],
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = json.error || json.message || 'Archive failed';
        setActionError(msg);
        toast('error', `Failed to archive "${branch.name}"`, msg);
        return;
      }
      toast('success', `Branch "${branch.name}" archived`);
      setShowArchive(false);
      onArchive(branch.name);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection error';
      setActionError(msg);
      toast('error', `Failed to archive "${branch.name}"`, msg);
    } finally {
      setArchiving(false);
    }
  }

  return (
    <>
      <tr
        className={`row-${branch.status} branch-row`}
        onClick={() => setExpanded(!expanded)}
      >
        <td
          className="td-check"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
        >
          <span className={`check-cell ${selected ? 'checked' : ''}`}>
            {selected ? <CheckSquare size={15} /> : <Square size={15} />}
          </span>
        </td>
        <td className="branch-name-cell">
          <div className="branch-name-inner">
            <span className="expand-icon">
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
            <GitBranch size={14} className="branch-icon" />
            <span className="branch-name-text" title={branch.name}>
              {branch.name}
            </span>
            {branch.upstreamGone && (
              <span className="gone-badge">
                <AlertTriangle size={10} /> gone
              </span>
            )}
          </div>
        </td>
        <td className="upstream-cell">
          {branch.upstream ? (
            <span className="upstream-text">
              <ArrowUpRight size={12} /> {branch.upstream}
            </span>
          ) : (
            <span className="no-upstream">—</span>
          )}
        </td>
        <td className="commit-cell">
          <div className="commit-author">
            <User size={12} /> {branch.lastCommitAuthor}
          </div>
          <div className="commit-msg" title={branch.lastCommitMessage}>
            <MessageSquare size={12} /> {branch.lastCommitMessage}
          </div>
        </td>
        <td className="date-cell">
          <Calendar size={12} /> {formatDateShort(branch.lastCommitDate)}
        </td>
        <td className="age-cell">
          <span
            className={`age-badge ${branch.daysSinceLastCommit > 90 ? 'old' : branch.daysSinceLastCommit > 30 ? 'warn' : 'recent'}`}
          >
            <Clock size={11} /> {formatRelative(branch.daysSinceLastCommit)}
          </span>
        </td>
        <td>
          <span
            className="status-badge"
            style={{
              backgroundColor: STATUS_COLORS[branch.status] + '22',
              color: STATUS_COLORS[branch.status],
              borderColor: STATUS_COLORS[branch.status],
            }}
          >
            {STATUS_LABELS[branch.status]}
          </span>
        </td>
      </tr>
      {expanded && (
        <tr className="detail-row">
          <td colSpan={7}>
            <div className="detail-panel">
              <div className="detail-branch-header">
                <GitBranch size={16} />
                <span className="detail-branch-name">{branch.name}</span>
                {branch.upstreamGone && (
                  <span className="gone-badge">
                    <AlertTriangle size={10} /> gone
                  </span>
                )}
              </div>
              <div className="detail-grid">
                <div className="detail-section">
                  <h4 className="detail-heading">
                    <Hash size={14} /> Commit
                  </h4>
                  <div className="detail-item">
                    <span className="detail-label">Hash</span>
                    <code className="detail-value hash">
                      {branch.lastCommitHash}
                    </code>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Author</span>
                    <span className="detail-value">
                      {branch.lastCommitAuthor}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Date</span>
                    <span className="detail-value">
                      {formatDate(branch.lastCommitDate)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Message</span>
                    <span className="detail-value message">
                      {branch.lastCommitMessage}
                    </span>
                  </div>
                </div>

                {branch.mergeInfo && (
                  <div className="detail-section">
                    <h4 className="detail-heading">
                      <GitMerge size={14} /> Merge into{' '}
                      {branch.upstream?.split('/')[0] || 'origin'}/main
                    </h4>
                    <div className="detail-item">
                      <span className="detail-label">Merge commit</span>
                      <code className="detail-value hash">
                        {branch.mergeInfo.mergeCommit}
                      </code>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Merged at</span>
                      <span className="detail-value">
                        {formatDate(branch.mergeInfo.mergedAt)}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Message</span>
                      <span className="detail-value message">
                        {branch.mergeInfo.mergeCommitMessage}
                      </span>
                    </div>
                  </div>
                )}

                <div className="detail-section">
                  <h4 className="detail-heading">
                    <Clock size={14} /> Activity
                  </h4>
                  <div className="detail-item">
                    <span className="detail-label">Last commit</span>
                    <span className="detail-value">
                      {formatRelative(branch.daysSinceLastCommit)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Last checkout</span>
                    <span className="detail-value">
                      {branch.lastCheckoutDate
                        ? formatDate(branch.lastCheckoutDate)
                        : 'Unknown'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Upstream</span>
                    <span className="detail-value">
                      {branch.upstream || 'None'}
                      {branch.upstreamGone && (
                        <span className="gone-inline">
                          {' '}
                          (deleted on remote)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status</span>
                    <span
                      className="detail-value"
                      style={{ color: STATUS_COLORS[branch.status] }}
                    >
                      {STATUS_LABELS[branch.status]}
                    </span>
                  </div>
                </div>

                <div className="detail-section actions-section">
                  <h4 className="detail-heading">
                    <Trash2 size={14} /> Actions
                  </h4>

                  {actionError && (
                    <p className="delete-error">{actionError}</p>
                  )}

                  {!showArchive && !showDelete && (
                    <div className="action-buttons">
                      <button
                        className="action-btn action-archive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowArchive(true);
                          setActionError(null);
                        }}
                      >
                        <Archive size={15} /> Archive
                      </button>
                      <button
                        className="action-btn action-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDelete(true);
                          setActionError(null);
                        }}
                        title={branch.name}
                      >
                        <Trash2 size={15} /> Delete
                      </button>
                    </div>
                  )}

                  {showArchive && (
                    <div className="confirm-box confirm-archive">
                      <p className="confirm-text">
                        <Archive size={14} /> Archive "{branch.name}"?
                      </p>
                      <p className="confirm-hint">
                        A tag <code>archive/{branch.name}</code> will be
                        created and the branch deleted locally. You can
                        restore it later.
                      </p>
                      <div className="confirm-actions">
                        <button
                          className="btn-cancel"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowArchive(false);
                            setActionError(null);
                          }}
                          disabled={archiving}
                        >
                          <X size={14} /> Cancel
                        </button>
                        <button
                          className="btn-confirm-archive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchive();
                          }}
                          disabled={archiving}
                        >
                          {archiving ? 'Archiving...' : 'Archive'}
                        </button>
                      </div>
                    </div>
                  )}

                  {showDelete && (
                    <div className="confirm-box confirm-delete">
                      <p className="confirm-text">
                        <AlertTriangle size={14} /> Delete branch "
                        <strong>{branch.name}</strong>"?
                      </p>
                      {branch.isMergedIntoMain && (
                        <p className="confirm-hint">
                          This branch is merged — safe to delete.
                        </p>
                      )}
                      {!branch.isMergedIntoMain && (
                        <p className="confirm-warn">
                          This branch is NOT fully merged into{' '}
                          {branch.upstream?.split('/')[0] || 'origin'}/main.
                          Changes may be lost.
                        </p>
                      )}
                      <div className="confirm-actions">
                        <button
                          className="btn-cancel"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDelete(false);
                            setActionError(null);
                          }}
                          disabled={deleting}
                        >
                          <X size={14} /> Cancel
                        </button>
                        {!branch.isMergedIntoMain && (
                          <button
                            className="btn-force"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(true);
                            }}
                            disabled={deleting}
                          >
                            {deleting ? 'Deleting...' : 'Force Delete'}
                          </button>
                        )}
                        <button
                          className="btn-confirm-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(false);
                          }}
                          disabled={deleting}
                        >
                          {deleting ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
