import { BranchesResult } from '@forgottenbranches/types';

interface Props {
  data: BranchesResult;
  archivedCount: number;
  showArchived: boolean;
  onToggleArchived: () => void;
}

export default function StatsBar({ data, archivedCount, showArchived, onToggleArchived }: Props) {
  return (
    <div className="stats">
      <div
        className="stat"
        onClick={showArchived ? onToggleArchived : undefined}
        onKeyDown={
          showArchived
            ? (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggleArchived();
              }
            }
            : undefined
        }
        role={showArchived ? 'button' : undefined}
        tabIndex={showArchived ? 0 : undefined}
        style={showArchived ? { cursor: 'pointer' } : undefined}
      >
        <span className="stat-value">{data.totalLocal}</span>
        <span className="stat-label">Local Branches</span>
      </div>
      <div className="stat stat-warn">
        <span className="stat-value">{data.totalForgotten}</span>
        <span className="stat-label">Forgotten / Orphan</span>
      </div>
      <div className="stat">
        <span className="stat-value">{data.mainBranch}</span>
        <span className="stat-label">Main Branch</span>
      </div>
      {data.currentBranch && (
        <div className="stat stat-current">
          <span className="stat-value">{data.currentBranch}</span>
          <span className="stat-label">Current Branch</span>
        </div>
      )}
      <div
        className={`stat stat-tab${showArchived ? ' stat-tab--active' : ''}`}
        onClick={!showArchived ? onToggleArchived : undefined}
        onKeyDown={
          !showArchived
            ? (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggleArchived();
              }
            }
            : undefined
        }
        role={!showArchived ? 'button' : undefined}
        tabIndex={!showArchived ? 0 : undefined}
      >
        <span className="stat-value">{archivedCount}</span>
        <span className="stat-label">Archived</span>
      </div>
    </div>
  );
}
