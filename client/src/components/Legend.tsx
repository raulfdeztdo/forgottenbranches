import { STATUS_COLORS } from '../statusConfig';

export default function Legend() {
  return (
    <div className="legend">
      <h3 className="legend-title">How branches are classified</h3>
      <div className="legend-grid">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: STATUS_COLORS.active }} />
          <div>
            <strong>Active</strong>
            <p>Recent commits and a valid upstream. In use.</p>
          </div>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: STATUS_COLORS.forgotten }} />
          <div>
            <strong>Forgotten</strong>
            <p>Merged into main but upstream was deleted. Safe to remove.</p>
          </div>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: STATUS_COLORS.merged }} />
          <div>
            <strong>Merged</strong>
            <p>Already merged into main. Upstream still exists.</p>
          </div>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: STATUS_COLORS.orphan }} />
          <div>
            <strong>Orphan</strong>
            <p>Remote upstream deleted, never merged. Review first.</p>
          </div>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: STATUS_COLORS.abandoned }} />
          <div>
            <strong>Abandoned</strong>
            <p>No commits in 90+ days (or 60 without upstream).</p>
          </div>
        </div>
      </div>
    </div>
  );
}
