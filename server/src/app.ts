import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import {
  getBranches,
  deleteBranch,
  deleteBranches,
  detectMainBranch,
  archiveBranch,
  archiveBranches,
  restoreArchivedBranch,
  deleteArchivedBranch,
  getArchivedBranches,
} from './git';

const IS_PROD = process.env.NODE_ENV === 'production';

function toClientError(err: unknown): string {
  if (IS_PROD) return 'Internal server error';
  return err instanceof Error ? err.message : 'Unknown error';
}

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // ── Branches ──

  app.get('/api/branches', async (req, res) => {
    try {
      const repoPath = req.query.path as string;
      const error = validateRepo(repoPath);
      if (error) { res.status(400).json({ error }); return; }
      const result = await getBranches(repoPath);
      res.json(result);
    } catch (err: unknown) {
      console.error('[GET /api/branches]', err);
      res.status(500).json({ error: toClientError(err) });
    }
  });

  app.delete('/api/branches', async (req, res) => {
    try {
      const { path: repoPath, branch: branchName, force } = req.query as Record<string, string>;
      const error = validateRepo(repoPath);
      if (error) { res.status(400).json({ error }); return; }
      if (!branchName) { res.status(400).json({ error: 'Missing "branch"' }); return; }

      const mainBranch = await detectMainBranch(repoPath);
      const result = await deleteBranch(repoPath, branchName, force === 'true', mainBranch);
      res.status(result.success ? 200 : 400).json(result);
    } catch (err: unknown) {
      console.error('[DELETE /api/branches]', err);
      res.status(500).json({ error: toClientError(err) });
    }
  });

  app.post('/api/branches/bulk-delete', async (req, res) => {
    try {
      const { path: repoPath, branches, force } = req.body;
      const error = validateRepo(repoPath);
      if (error) { res.status(400).json({ error }); return; }
      if (!branches || !Array.isArray(branches) || branches.length === 0) {
        res.status(400).json({ error: 'Missing "branches" array' }); return;
      }

      const mainBranch = await detectMainBranch(repoPath);
      const result = await deleteBranches(repoPath, branches, !!force, mainBranch);
      res.json(result);
    } catch (err: unknown) {
      console.error('[POST /api/branches/bulk-delete]', err);
      res.status(500).json({ error: toClientError(err) });
    }
  });

  // ── Archive ──

  app.post('/api/branches/archive', async (req, res) => {
    try {
      const { path: repoPath, branches: branchNames } = req.body;
      const error = validateRepo(repoPath);
      if (error) { res.status(400).json({ error }); return; }
      if (!branchNames || !Array.isArray(branchNames) || branchNames.length === 0) {
        res.status(400).json({ error: 'Missing "branches" array' }); return;
      }

      const mainBranch = await detectMainBranch(repoPath);

      if (branchNames.length === 1) {
        const result = await archiveBranch(repoPath, branchNames[0], mainBranch);
        res.status(result.success ? 200 : 400).json(result);
      } else {
        const result = await archiveBranches(repoPath, branchNames, mainBranch);
        res.json(result);
      }
    } catch (err: unknown) {
      console.error('[POST /api/branches/archive]', err);
      res.status(500).json({ error: toClientError(err) });
    }
  });

  app.get('/api/branches/archived', async (req, res) => {
    try {
      const repoPath = req.query.path as string;
      const error = validateRepo(repoPath);
      if (error) { res.status(400).json({ error }); return; }
      const result = await getArchivedBranches(repoPath);
      res.json(result);
    } catch (err: unknown) {
      console.error('[GET /api/branches/archived]', err);
      res.status(500).json({ error: toClientError(err) });
    }
  });

  app.post('/api/branches/unarchive', async (req, res) => {
    try {
      const { path: repoPath, branch: branchName } = req.body;
      const error = validateRepo(repoPath);
      if (error) { res.status(400).json({ error }); return; }
      if (!branchName) { res.status(400).json({ error: 'Missing "branch"' }); return; }

      const result = await restoreArchivedBranch(repoPath, branchName);
      res.status(result.success ? 200 : 400).json(result);
    } catch (err: unknown) {
      console.error('[POST /api/branches/unarchive]', err);
      res.status(500).json({ error: toClientError(err) });
    }
  });

  app.delete('/api/branches/archived', async (req, res) => {
    try {
      const { path: repoPath, branch: branchName } = req.query as Record<string, string>;
      const error = validateRepo(repoPath);
      if (error) { res.status(400).json({ error }); return; }
      if (!branchName) { res.status(400).json({ error: 'Missing "branch"' }); return; }

      const result = await deleteArchivedBranch(repoPath, branchName);
      res.status(result.success ? 200 : 400).json(result);
    } catch (err: unknown) {
      console.error('[DELETE /api/branches/archived]', err);
      res.status(500).json({ error: toClientError(err) });
    }
  });

  // Serve built frontend in production
  const publicDir = path.join(__dirname, 'public');
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(publicDir, 'index.html'));
    });
  }

  return app;
}

function validateRepo(repoPath: string): string | null {
  if (!repoPath) return 'Missing "path" query parameter';
  if (!fs.existsSync(repoPath)) return 'Directory does not exist';
  if (!fs.existsSync(path.join(repoPath, '.git')))
    return 'Not a git repository';
  return null;
}
