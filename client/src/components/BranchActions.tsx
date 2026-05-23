import { useState } from 'react';
import { Archive, Trash2, Lock, AlertTriangle, X } from 'lucide-react';
import { BranchInfo } from '@forgottenbranches/types';
import { useToast } from './ToastContext';

interface Props {
  branch: BranchInfo;
  repoPath: string;
  isProtected: boolean;
  protectedReason: string | null;
  onDeleted: () => void;
  onArchived: (name: string) => void;
}

export default function BranchActions({ branch, repoPath, isProtected, protectedReason, onDeleted, onArchived }: Props) {
  const { toast } = useToast();
  const [showArchive, setShowArchive] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleDelete(force: boolean) {
    setDeleting(true);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/branches?path=${encodeURIComponent(repoPath)}&branch=${encodeURIComponent(branch.name)}&force=${force}`,
        { method: 'DELETE' },
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
      onDeleted();
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
        body: JSON.stringify({ path: repoPath, branches: [branch.name] }),
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
      onArchived(branch.name);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection error';
      setActionError(msg);
      toast('error', `Failed to archive "${branch.name}"`, msg);
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div className="detail-section actions-section">
      <h4 className="detail-heading"><Trash2 size={14} /> Actions</h4>

      {actionError && <p className="delete-error">{actionError}</p>}

      {!showArchive && !showDelete && !isProtected && (
        <div className="action-buttons">
          <button className="action-btn action-archive" onClick={(e) => { e.stopPropagation(); setShowArchive(true); setActionError(null); }}>
            <Archive size={15} /> Archive
          </button>
          <button className="action-btn action-delete" onClick={(e) => { e.stopPropagation(); setShowDelete(true); setActionError(null); }} title={branch.name}>
            <Trash2 size={15} /> Delete
          </button>
        </div>
      )}

      {!showArchive && !showDelete && isProtected && (
        <p className="detail-protected-hint">
          <Lock size={12} /> Protected — {protectedReason}. Cannot be archived or deleted.
        </p>
      )}

      {showArchive && (
        <div className="confirm-box confirm-archive">
          <p className="confirm-text"><Archive size={14} /> Archive "{branch.name}"?</p>
          <p className="confirm-hint">
            A tag <code>archive/{branch.name}</code> will be created and the branch deleted locally. You can restore it later.
          </p>
          <div className="confirm-actions">
            <button className="btn-cancel" onClick={(e) => { e.stopPropagation(); setShowArchive(false); setActionError(null); }} disabled={archiving}>
              <X size={14} /> Cancel
            </button>
            <button className="btn-confirm-archive" onClick={(e) => { e.stopPropagation(); handleArchive(); }} disabled={archiving}>
              {archiving ? 'Archiving…' : 'Archive'}
            </button>
          </div>
        </div>
      )}

      {showDelete && (
        <div className="confirm-box confirm-delete">
          <p className="confirm-text"><AlertTriangle size={14} /> Delete branch "<strong>{branch.name}</strong>"?</p>
          {branch.isMergedIntoMain && <p className="confirm-hint">This branch is merged, safe to delete.</p>}
          {!branch.isMergedIntoMain && (
            <p className="confirm-warn">
              This branch is NOT fully merged into {branch.upstream?.split('/')[0] || 'origin'}/main. Changes may be lost.
            </p>
          )}
          <div className="confirm-actions">
            <button className="btn-cancel" onClick={(e) => { e.stopPropagation(); setShowDelete(false); setActionError(null); }} disabled={deleting}>
              <X size={14} /> Cancel
            </button>
            {!branch.isMergedIntoMain && (
              <button className="btn-force" onClick={(e) => { e.stopPropagation(); handleDelete(true); }} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Force Delete'}
              </button>
            )}
            <button className="btn-confirm-delete" onClick={(e) => { e.stopPropagation(); handleDelete(false); }} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
