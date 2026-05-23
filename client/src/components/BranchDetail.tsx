import { useState } from 'react';
import {
  GitBranch,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  Clock,
  Calendar,
  User,
  MessageSquare,
  Square,
  CheckSquare,
  Lock,
} from 'lucide-react';
import { BranchInfo } from '@forgottenbranches/types';
import { STATUS_COLORS, STATUS_LABELS } from '../statusConfig';
import BranchDetailPanel from './BranchDetailPanel';

interface Props {
  branch: BranchInfo;
  repoPath: string;
  mainBranch?: string;
  currentBranch?: string | null;
  selected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onArchive: (name: string) => void;
}

function formatDateShort(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
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
  mainBranch,
  currentBranch,
  selected,
  onToggleSelect,
  onDelete,
  onArchive,
}: Props) {
  const isProtected = branch.name === mainBranch || branch.name === currentBranch;
  const protectedReason = branch.name === currentBranch ? 'current checked-out branch' : branch.name === mainBranch ? 'main branch' : null;
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className={`row-${branch.status} branch-row`} onClick={() => setExpanded(!expanded)}>
        <td className="td-check" onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}>
          <span className={`check-cell ${selected ? 'checked' : ''}`}>
            {selected ? <CheckSquare size={15} /> : <Square size={15} />}
          </span>
        </td>
        <td className="branch-name-cell">
          <div className="branch-name-inner">
            <span className="expand-icon">{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
            <GitBranch size={14} className="branch-icon" />
            <span className="branch-name-text" title={branch.name}>{branch.name}</span>
            {isProtected && <span className="protected-badge" title={`Protected — ${protectedReason}`}><Lock size={11} /></span>}
            {branch.upstreamGone && <span className="gone-badge"><AlertTriangle size={10} /> gone</span>}
          </div>
        </td>
        <td className="upstream-cell">
          {branch.upstream ? <span className="upstream-text"><ArrowUpRight size={12} /> {branch.upstream}</span> : <span className="no-upstream">—</span>}
        </td>
        <td className="commit-cell">
          <div className="commit-author"><User size={12} /> {branch.lastCommitAuthor}</div>
          <div className="commit-msg" title={branch.lastCommitMessage}><MessageSquare size={12} /> {branch.lastCommitMessage}</div>
        </td>
        <td className="date-cell"><Calendar size={12} /> {formatDateShort(branch.lastCommitDate)}</td>
        <td className="age-cell">
          <span className={`age-badge ${branch.daysSinceLastCommit > 90 ? 'old' : branch.daysSinceLastCommit > 30 ? 'warn' : 'recent'}`}>
            <Clock size={11} /> {formatRelative(branch.daysSinceLastCommit)}
          </span>
        </td>
        <td>
          <span className="status-badge" style={{ backgroundColor: STATUS_COLORS[branch.status] + '22', color: STATUS_COLORS[branch.status], borderColor: STATUS_COLORS[branch.status] }}>
            {STATUS_LABELS[branch.status]}
          </span>
        </td>
      </tr>
      {expanded && (
        <tr className="detail-row">
          <td colSpan={7}>
            <BranchDetailPanel branch={branch} repoPath={repoPath} isProtected={isProtected} protectedReason={protectedReason} onDeleted={onDelete} onArchived={onArchive} />
          </td>
        </tr>
      )}
    </>
  );
}
