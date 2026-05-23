import { GitBranch, Hash, GitMerge, Clock, AlertTriangle } from 'lucide-react';
import { BranchInfo } from '@forgottenbranches/types';
import { STATUS_COLORS, STATUS_LABELS } from '../statusConfig';
import BranchActions from './BranchActions';

interface Props {
  branch: BranchInfo;
  repoPath: string;
  isProtected: boolean;
  protectedReason: string | null;
  onDeleted: () => void;
  onArchived: (name: string) => void;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatRelative(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default function BranchDetailPanel({ branch, repoPath, isProtected, protectedReason, onDeleted, onArchived }: Props) {
  return (
    <div className="detail-panel">
      <div className="detail-branch-header">
        <GitBranch size={16} />
        <span className="detail-branch-name">{branch.name}</span>
        {branch.upstreamGone && <span className="gone-badge"><AlertTriangle size={10} /> gone</span>}
      </div>
      <div className="detail-grid">
        <div className="detail-section">
          <h4 className="detail-heading"><Hash size={14} /> Commit</h4>
          <div className="detail-item"><span className="detail-label">Hash</span><code className="detail-value hash">{branch.lastCommitHash}</code></div>
          <div className="detail-item"><span className="detail-label">Author</span><span className="detail-value">{branch.lastCommitAuthor}</span></div>
          <div className="detail-item"><span className="detail-label">Date</span><span className="detail-value">{formatDate(branch.lastCommitDate)}</span></div>
          <div className="detail-item"><span className="detail-label">Message</span><span className="detail-value message">{branch.lastCommitMessage}</span></div>
        </div>

        {branch.mergeInfo && (
          <div className="detail-section">
            <h4 className="detail-heading"><GitMerge size={14} /> Merge into {branch.upstream?.split('/')[0] || 'origin'}/main</h4>
            <div className="detail-item"><span className="detail-label">Merge commit</span><code className="detail-value hash">{branch.mergeInfo.mergeCommit}</code></div>
            <div className="detail-item"><span className="detail-label">Merged at</span><span className="detail-value">{formatDate(branch.mergeInfo.mergedAt)}</span></div>
            <div className="detail-item"><span className="detail-label">Message</span><span className="detail-value message">{branch.mergeInfo.mergeCommitMessage}</span></div>
          </div>
        )}

        <div className="detail-section">
          <h4 className="detail-heading"><Clock size={14} /> Activity</h4>
          <div className="detail-item"><span className="detail-label">Last commit</span><span className="detail-value">{formatRelative(branch.daysSinceLastCommit)}</span></div>
          <div className="detail-item"><span className="detail-label">Last checkout</span><span className="detail-value">{branch.lastCheckoutDate ? formatDate(branch.lastCheckoutDate) : 'Unknown'}</span></div>
          <div className="detail-item"><span className="detail-label">Upstream</span><span className="detail-value">{branch.upstream || 'None'}{branch.upstreamGone && <span className="gone-inline"> (deleted on remote)</span>}</span></div>
          <div className="detail-item"><span className="detail-label">Status</span><span className="detail-value" style={{ color: STATUS_COLORS[branch.status] }}>{STATUS_LABELS[branch.status]}</span></div>
        </div>

        <BranchActions branch={branch} repoPath={repoPath} isProtected={isProtected} protectedReason={protectedReason} onDeleted={onDeleted} onArchived={onArchived} />
      </div>
    </div>
  );
}
