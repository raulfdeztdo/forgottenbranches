import { useState, useCallback, useEffect, useRef } from 'react';
import {
  GitBranch,
  FolderSearch,
  Clock,
  X,
} from 'lucide-react';
import { BranchesResult, ArchivedBranch } from '@forgottenbranches/types';
import { STATUS_COLORS } from './statusConfig';
import BranchTable from './components/BranchTable';
import ArchivedTable from './components/ArchivedTable';
import { useToast } from './components/ToastContext';
import ForceDeleteModal, { FailedBranch } from './components/ForceDeleteModal';

const STORAGE_KEY = 'forgottenbranches_recent';
const MAX_RECENT = 6;

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function saveRecent(paths: string[]) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(paths.slice(0, MAX_RECENT))
  );
}


export default function App() {
  const { toast } = useToast();
  const [repoPath, setRepoPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BranchesResult | null>(null);
  const [recent, setRecent] = useState<string[]>(loadRecent);
  const [showRecent, setShowRecent] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedBranches, setArchivedBranches] = useState<ArchivedBranch[]>(
    []
  );
  const [archivedCount, setArchivedCount] = useState(0);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [forceDeleteCandidates, setForceDeleteCandidates] = useState<FailedBranch[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        recentRef.current &&
        !recentRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowRecent(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pathParam = params.get('path');
    if (pathParam) {
      setRepoPath(pathParam);
      scanRepo(pathParam);
    }
  }, []);

  function addToRecent(p: string) {
    const trimmed = p.trim();
    if (!trimmed) return;
    setRecent((prev) => {
      const next = [trimmed, ...prev.filter((x) => x !== trimmed)].slice(
        0,
        MAX_RECENT
      );
      saveRecent(next);
      return next;
    });
  }

  function removeRecent(p: string) {
    setRecent((prev) => {
      const next = prev.filter((x) => x !== p);
      saveRecent(next);
      return next;
    });
  }

  function selectRecent(p: string) {
    setRepoPath(p);
    setShowRecent(false);
    setShowArchived(false);
    scanRepo(p);
  }

  const scanBranches = useCallback(() => {
    scanRepo(repoPath);
  }, [repoPath]);

  // Full scan for initial load / user action
  async function scanRepo(path: string) {
    const trimmed = path.trim();
    if (!trimmed) return;
    setLoading(true);
    setRefreshing(false);
    setError(null);
    setData(null);
    setShowArchived(false);
    setShowRecent(false);

    try {
      const res = await fetch(
        `/api/branches?path=${encodeURIComponent(trimmed)}`
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Error scanning branches');
        return;
      }
      setData(json);
      addToRecent(trimmed);
      loadArchivedCount(trimmed);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to connect to server'
      );
    } finally {
      setLoading(false);
    }
  }

  // Light refresh after archive/delete — keeps current data visible
  async function refreshBranches() {
    const trimmed = repoPath.trim();
    if (!trimmed) return;
    setRefreshing(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/branches?path=${encodeURIComponent(trimmed)}`
      );
      const json = await res.json();
      if (res.ok) setData(json);
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
    loadArchivedCount(trimmed);
  }

  async function loadArchivedCount(path: string) {
    try {
      const res = await fetch(
        `/api/branches/archived?path=${encodeURIComponent(path)}`
      );
      const json = await res.json();
      if (res.ok) setArchivedCount(Array.isArray(json) ? json.length : 0);
    } catch {
      // ignore
    }
  }

  async function loadArchived() {
    const trimmed = repoPath.trim();
    if (!trimmed) return;
    setArchivedLoading(true);
    try {
      const res = await fetch(
        `/api/branches/archived?path=${encodeURIComponent(trimmed)}`
      );
      const json = await res.json();
      if (res.ok) {
        setArchivedBranches(json);
        setArchivedCount(Array.isArray(json) ? json.length : 0);
      }
    } catch {
      setArchivedBranches([]);
    } finally {
      setArchivedLoading(false);
    }
  }

  function toggleArchived() {
    if (!showArchived) {
      loadArchived();
    }
    setShowArchived(!showArchived);
  }

  async function handleArchive(names: string[]) {
    const trimmed = repoPath.trim();
    try {
      const res = await fetch('/api/branches/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: trimmed, branches: names }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast('error', 'Archive failed', json.error || json.message || 'Unknown error');
      } else if (json.results) {
        // bulk path — check per-branch results
        const failed: string[] = json.results
          .filter((r: { success: boolean; branch: string }) => !r.success)
          .map((r: { branch: string }) => r.branch);
        const ok = names.length - failed.length;
        if (ok > 0) toast('success', `${ok} branch${ok !== 1 ? 'es' : ''} archived`);
        if (failed.length > 0) toast('error', `${failed.length} branch${failed.length !== 1 ? 'es' : ''} failed to archive`, failed.join(', '));
      } else {
        toast('success', `Branch archived`, names[0]);
      }
    } catch (err) {
      toast('error', 'Archive failed', err instanceof Error ? err.message : 'Connection error');
    }
    refreshBranches();
  }

  async function handleBulkDelete(names: string[]) {
    const trimmed = repoPath.trim();
    try {
      const res = await fetch('/api/branches/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: trimmed, branches: names, force: false }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast('error', 'Bulk delete failed', json.error || json.message || 'Unknown error');
      } else {
        type BulkResult = { branch: string; success: boolean; message: string };
        const results: BulkResult[] = json.results ?? [];
        const succeeded = results.filter((r) => r.success);
        const failed = results.filter((r) => !r.success);
        if (succeeded.length > 0)
          toast('success', `${succeeded.length} branch${succeeded.length !== 1 ? 'es' : ''} deleted`);
        if (failed.length > 0) {
          // Show modal for unmerged branches that need force delete
          setForceDeleteCandidates(
            failed.map((r) => ({ branch: r.branch, message: r.message }))
          );
        }
      }
    } catch (err) {
      toast('error', 'Bulk delete failed', err instanceof Error ? err.message : 'Connection error');
    }
    refreshBranches();
  }

  async function handleForceDeleteConfirm(names: string[]) {
    const trimmed = repoPath.trim();
    try {
      const res = await fetch('/api/branches/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: trimmed, branches: names, force: true }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast('error', 'Force delete failed', json.error || json.message || 'Unknown error');
      } else {
        type BulkResult = { branch: string; success: boolean; message: string };
        const results: BulkResult[] = json.results ?? [];
        const succeeded = results.filter((r) => r.success);
        const failed = results.filter((r) => !r.success);
        if (succeeded.length > 0)
          toast('success', `${succeeded.length} branch${succeeded.length !== 1 ? 'es' : ''} force deleted`);
        if (failed.length > 0)
          toast('error', `${failed.length} branch${failed.length !== 1 ? 'es' : ''} still failed`, failed.map((r) => r.branch).join(', '));
      }
    } catch (err) {
      toast('error', 'Force delete failed', err instanceof Error ? err.message : 'Connection error');
    }
    setForceDeleteCandidates(null);
    refreshBranches();
  }

  async function handleUnarchive(names: string[]) {
    const trimmed = repoPath.trim();
    let ok = 0;
    let failed = 0;
    for (const name of names) {
      try {
        const res = await fetch('/api/branches/unarchive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: trimmed, branch: name }),
        });
        if (res.ok) ok++;
        else {
          const json = await res.json();
          toast('error', `Failed to restore "${name}"`, json.error || json.message || 'Unknown error');
          failed++;
        }
      } catch (err) {
        toast('error', `Failed to restore "${name}"`, err instanceof Error ? err.message : 'Connection error');
        failed++;
      }
    }
    if (ok > 0) toast('success', `${ok} branch${ok !== 1 ? 'es' : ''} restored`);
    void failed; // already toasted individually
    loadArchived();
    refreshBranches();
  }

  async function handleDeleteArchive(names: string[]) {
    const trimmed = repoPath.trim();
    let ok = 0;
    let failed = 0;
    for (const name of names) {
      try {
        const res = await fetch(
          `/api/branches/archived?path=${encodeURIComponent(trimmed)}&branch=${encodeURIComponent(name)}`,
          { method: 'DELETE' }
        );
        if (res.ok) ok++;
        else {
          const json = await res.json();
          toast('error', `Failed to delete "${name}"`, json.error || json.message || 'Unknown error');
          failed++;
        }
      } catch (err) {
        toast('error', `Failed to delete "${name}"`, err instanceof Error ? err.message : 'Connection error');
        failed++;
      }
    }
    if (ok > 0) toast('success', `${ok} archived branch${ok !== 1 ? 'es' : ''} deleted permanently`);
    void failed;
    loadArchived();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      setShowRecent(false);
      scanRepo(repoPath);
    }
    if (e.key === 'Escape') setShowRecent(false);
  }

  function handleFocus() {
    if (recent.length > 0) setShowRecent(true);
  }

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">
          <GitBranch size={26} /> Forgotten Branches
        </h1>
        <p className="subtitle">
          Find and clean up abandoned local branches in your git repositories
        </p>
      </header>

      <div className="search-bar">
        <div className="path-input-wrapper">
          <div className="path-input-group">
            <FolderSearch size={17} className="input-icon" />
            <input
              ref={inputRef}
              type="text"
              className="path-input"
              placeholder="Paste a project path..."
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
            />
            {repoPath && (
              <button
                className="clear-input-btn"
                onClick={() => setRepoPath('')}
                tabIndex={-1}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {showRecent && recent.length > 0 && (
            <div className="recent-dropdown" ref={recentRef}>
              <div className="recent-header">
                <Clock size={13} />
                <span>Recent projects</span>
                <button
                  className="recent-clear-all"
                  onClick={() => {
                    setRecent([]);
                    saveRecent([]);
                    setShowRecent(false);
                  }}
                >
                  Clear all
                </button>
              </div>
              {recent.map((p) => (
                <button
                  key={p}
                  className="recent-item"
                  onClick={() => selectRecent(p)}
                >
                  <span className="recent-path">{p}</span>
                  <span
                    className="recent-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRecent(p);
                    }}
                    title="Remove from history"
                  >
                    <X size={12} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          className="scan-btn"
          onClick={scanBranches}
          disabled={loading || !repoPath.trim()}
        >
          {loading ? 'Scanning...' : 'Scan Branches'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {!data && !loading && !error && (
        <div className="empty-state">
          <GitBranch size={48} strokeWidth={1.5} />
          <h3>No repository scanned</h3>
          <p>
            Enter the path to a git repository above and click "Scan Branches"
            to find abandoned local branches.
          </p>
        </div>
      )}

      {data && (
        <>
          <div className="stats">
            <div
              className="stat"
              onClick={showArchived ? toggleArchived : undefined}
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
              onClick={!showArchived ? toggleArchived : undefined}
              role={!showArchived ? 'button' : undefined}
              tabIndex={!showArchived ? 0 : undefined}
            >
              <span className="stat-value">{archivedCount}</span>
              <span className="stat-label">Archived</span>
            </div>
          </div>

          {showArchived ? (
            archivedLoading ? (
              <div className="table-card">
                <div className="empty-row">Loading...</div>
              </div>
            ) : (
              <ArchivedTable
                branches={archivedBranches}
                onUnarchive={handleUnarchive}
                onDelete={handleDeleteArchive}
              />
            )
          ) : (
            <BranchTable
              branches={data.branches}
              mainBranch={data.mainBranch}
              currentBranch={data.currentBranch}
              repoPath={repoPath.trim()}
              refreshing={refreshing}
              onBranchDeleted={refreshBranches}
              onArchive={handleArchive}
              onBulkDelete={handleBulkDelete}
            />
          )}

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
        </>
      )}

      <footer className="footer">
        <span>Created by{' '}
          <a href="https://github.com/raulfdeztdo" target="_blank" rel="noopener noreferrer">raulfdeztdo</a>
        </span>
        <span>·</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c678dd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="footer-branch-icon">
          <line x1="6" y1="3" x2="6" y2="15" />
          <circle cx="18" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <path d="M18 9a9 9 0 0 0-9 9" />
        </svg>
        <a href="https://github.com/raulfdeztdo/forgottenbranches" target="_blank" rel="noopener noreferrer" className="footer-repo">
          forgottenbranches
        </a>
      </footer>

      {forceDeleteCandidates && forceDeleteCandidates.length > 0 && (
        <ForceDeleteModal
          failedBranches={forceDeleteCandidates}
          repoPath={repoPath.trim()}
          onConfirm={handleForceDeleteConfirm}
          onClose={() => setForceDeleteCandidates(null)}
        />
      )}
    </div>
  );
}
