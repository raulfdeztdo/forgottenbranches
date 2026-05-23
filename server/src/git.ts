import { execFile } from 'child_process';
import { promisify } from 'util';
import type {
  MergeInfo,
  BranchInfo,
  ArchivedBranch,
  BranchesResult,
  BranchStatus,
} from '@forgottenbranches/types';

export type {
  MergeInfo,
  BranchInfo,
  ArchivedBranch,
  BranchesResult,
  BranchStatus,
};

const execFileAsync = promisify(execFile);

async function git(repoPath: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, {
    cwd: repoPath,
    maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env },
  });
  return stdout.trim();
}

export async function detectMainBranch(repoPath: string): Promise<string> {
  const branches = await git(repoPath, ['branch', '--format=%(refname:short)']);
  const names = branches.split('\n').map((b) => b.trim());
  if (names.includes('main')) return 'main';
  if (names.includes('master')) return 'master';
  return names[0] || 'main';
}

export async function detectCurrentBranch(repoPath: string): Promise<string | null> {
  try {
    const output = await git(repoPath, ['branch']);
    for (const line of output.split('\n')) {
      if (line.startsWith('* ')) {
        return line.substring(2).trim();
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function getMergedBranches(
  repoPath: string,
  mainBranch: string
): Promise<Set<string>> {
  try {
    const output = await git(repoPath, [
      'branch',
      '--merged',
      mainBranch,
      '--format=%(refname:short)',
    ]);
    return new Set(
      output
        .split('\n')
        .map((b) => b.trim())
        .filter((b) => b && b !== mainBranch)
    );
  } catch {
    return new Set();
  }
}

async function getMergeInfo(
  repoPath: string,
  mainBranch: string,
  branchName: string
): Promise<MergeInfo | null> {
  try {
    const output = await git(repoPath, [
      'log',
      mainBranch,
      '--merges',
      '--ancestry-path',
      `${branchName}..${mainBranch}`,
      '--format=%H|%ci|%s',
      '--max-count=1',
    ]);
    if (!output) return null;
    const [hash, date, ...msgParts] = output.split('|');
    if (!hash || !date) return null;
    return {
      mergedAt: date,
      mergeCommit: hash,
      mergeCommitMessage: msgParts.join('|') || '',
    };
  } catch {
    return null;
  }
}

async function getCheckoutDates(
  repoPath: string
): Promise<Map<string, string>> {
  const dates = new Map<string, string>();
  try {
    const output = await git(repoPath, [
      'reflog',
      '--date=iso-strict',
      '--format=%gD %gs',
    ]);
    for (const line of output.split('\n')) {
      const match = line.match(
        /^HEAD@\{([^}]+)\}\s+checkout: moving from\s+\S+\s+to\s+(.+)$/
      );
      if (match) {
        const date = match[1];
        const branch = match[2].trim();
        if (!dates.has(branch)) {
          dates.set(branch, date);
        }
      }
    }
  } catch {
    // reflog may not be available
  }
  return dates;
}

function computeStatus(
  isMerged: boolean,
  upstreamGone: boolean,
  daysSinceCommit: number,
  upstream: string | null
): BranchStatus {
  if (upstreamGone && isMerged) return 'forgotten';
  if (upstreamGone) return 'orphan';
  if (isMerged) return 'merged';
  if (daysSinceCommit > 90 || (!upstream && daysSinceCommit > 60))
    return 'abandoned';
  return 'active';
}

export async function getBranches(
  repoPath: string
): Promise<BranchesResult> {
  const mainBranch = await detectMainBranch(repoPath);
  const [rawBranches, mergedSet, checkoutDates] = await Promise.all([
    git(repoPath, [
      'for-each-ref',
      '--sort=-committerdate',
      'refs/heads/',
      '--format=%(refname:short)|%(upstream:short)|%(upstream:track)|%(objectname:short)|%(committerdate:iso8601)|%(authorname)|%(subject)',
    ]),
    getMergedBranches(repoPath, mainBranch),
    getCheckoutDates(repoPath),
  ]);

  if (!rawBranches) {
    return {
      branches: [],
      mainBranch,
      totalLocal: 0,
      totalForgotten: 0,
    };
  }

  const parsedBranches: Omit<BranchInfo, 'mergeInfo'>[] = rawBranches
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line)
    .map((line) => {
      const parts = line.split('|');
      const name = parts[0] || '';
      const upstreamRaw = parts[1] || '';
      const trackInfo = parts[2] || '';
      const hash = parts[3] || '';
      const commitDate = parts[4] || '';
      const author = parts[5] || '';
      const message = parts.slice(6).join('|') || '';

      const upstream = upstreamRaw || null;
      const upstreamGone = trackInfo === '[gone]';

      const commitTime = new Date(commitDate).getTime();
      const now = Date.now();
      const daysSinceLastCommit = commitTime
        ? Math.floor((now - commitTime) / (1000 * 60 * 60 * 24))
        : 999;

      const isMerged = mergedSet.has(name);

      const status = computeStatus(
        isMerged,
        upstreamGone,
        daysSinceLastCommit,
        upstream
      );

      return {
        name,
        upstream,
        upstreamGone,
        lastCommitDate: commitDate,
        lastCommitHash: hash,
        lastCommitAuthor: author,
        lastCommitMessage: message,
        isMergedIntoMain: isMerged,
        daysSinceLastCommit,
        lastCheckoutDate: checkoutDates.get(name) || null,
        status,
      };
    });

  const mergeInfoPromises = parsedBranches.map((b) =>
    b.name !== mainBranch && b.isMergedIntoMain
      ? getMergeInfo(repoPath, mainBranch, b.name)
      : Promise.resolve(null)
  );

  const mergeInfos = await Promise.all(mergeInfoPromises);

  const branches: BranchInfo[] = parsedBranches.map((b, i) => ({
    ...b,
    mergeInfo: mergeInfos[i],
  }));

  const totalForgotten = branches.filter(
    (b) => b.status === 'forgotten' || b.status === 'orphan'
  ).length;

  return {
    branches,
    mainBranch,
    totalLocal: branches.length,
    totalForgotten,
  };
}

export async function deleteBranch(
  repoPath: string,
  branchName: string,
  force: boolean,
  mainBranch?: string
): Promise<{ success: boolean; message: string }> {
  const protectedBranches = ['main', 'master'];
  if (mainBranch && !protectedBranches.includes(mainBranch)) {
    protectedBranches.push(mainBranch);
  }
  if (protectedBranches.includes(branchName)) {
    return {
      success: false,
      message: `Cannot delete protected branch "${branchName}"`,
    };
  }

  try {
    const output = await git(repoPath, ['branch']);
    for (const line of output.split('\n')) {
      if (line.startsWith('* ')) {
        const current = line.substring(2).trim();
        if (current === branchName) {
          return {
            success: false,
            message: `Cannot delete branch "${branchName}" — it is currently checked out`,
          };
        }
        break;
      }
    }
  } catch {
    // proceed anyway
  }

  try {
    const args = ['branch', force ? '-D' : '-d', branchName];
    await git(repoPath, args);
    return { success: true, message: `Branch "${branchName}" deleted` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, message };
  }
}

// ─── Archive ───

export async function archiveBranch(
  repoPath: string,
  branchName: string,
  mainBranch?: string
): Promise<{ success: boolean; message: string }> {
  const protectedBranches = ['main', 'master'];
  if (mainBranch && !protectedBranches.includes(mainBranch)) {
    protectedBranches.push(mainBranch);
  }
  if (protectedBranches.includes(branchName)) {
    return { success: false, message: `Cannot archive protected branch "${branchName}"` };
  }

  try {
    const tagName = `archive/${branchName}`;
    await git(repoPath, ['tag', '-a', '-f', tagName, branchName, '-m', `archive/${branchName}`]);
    await git(repoPath, ['branch', '-D', branchName]);
    return { success: true, message: `Branch "${branchName}" archived as ${tagName}` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, message };
  }
}

export async function archiveBranches(
  repoPath: string,
  branchNames: string[],
  mainBranch?: string
): Promise<{ success: boolean; results: { branch: string; success: boolean; message: string }[] }> {
  const results = [];
  for (const name of branchNames) {
    const r = await archiveBranch(repoPath, name, mainBranch);
    results.push({ branch: name, ...r });
  }
  return { success: results.every((r) => r.success), results };
}

export async function unarchiveBranch(
  repoPath: string
): Promise<{ success: boolean; message: string }> {
  // Unarchive is called with a specific tag name via the branch param
  // Not used standalone; handled in the route
  return { success: false, message: 'Use the route directly' };
}

export async function restoreArchivedBranch(
  repoPath: string,
  originalName: string
): Promise<{ success: boolean; message: string }> {
  const tagName = `archive/${originalName}`;
  try {
    // Check if tag exists
    const tags = await git(repoPath, ['tag', '-l', tagName]);
    if (!tags) {
      return { success: false, message: `Archive tag "${tagName}" not found` };
    }
    // Recreate branch from tag
    await git(repoPath, ['branch', originalName, tagName]);
    // Delete the archive tag
    await git(repoPath, ['tag', '-d', tagName]);
    return { success: true, message: `Branch "${originalName}" restored from archive` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, message };
  }
}

export async function deleteArchivedBranch(
  repoPath: string,
  originalName: string
): Promise<{ success: boolean; message: string }> {
  const tagName = `archive/${originalName}`;
  try {
    await git(repoPath, ['tag', '-d', tagName]);
    return { success: true, message: `Archive "${originalName}" permanently deleted` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, message };
  }
}

export async function getArchivedBranches(
  repoPath: string
): Promise<ArchivedBranch[]> {
  try {
    const output = await git(repoPath, [
      'tag',
      '-l',
      'archive/*',
      '--format=%(refname:strip=2)|%(*objectname:short)|%(creatordate:iso8601)',
    ]);
    if (!output) return [];

    const lines = output.split('\n').map((l) => l.trim()).filter((l) => l);

    const branches: ArchivedBranch[] = [];
    for (const line of lines) {
      const parts = line.split('|');
      const tagName = parts[0] || '';
      const commitHash = parts[1] || '';
      const archivedAt = parts[2] || '';

      // Extract original branch name (after "archive/")
      const name = tagName.startsWith('archive/')
        ? tagName.slice('archive/'.length)
        : tagName;

      // Get commit details
      let commitAuthor = '';
      let commitDate = '';
      let commitMessage = '';
      try {
        const commitInfo = await git(repoPath, [
          'log',
          '-1',
          '--format=%an|%ci|%s',
          commitHash,
        ]);
        const cparts = commitInfo.split('|');
        commitAuthor = cparts[0] || '';
        commitDate = cparts[1] || '';
        commitMessage = cparts.slice(2).join('|') || '';
      } catch {
        // commit might not exist anymore
      }

      branches.push({
        name,
        archivedAt,
        commitHash,
        commitAuthor,
        commitDate,
        commitMessage,
      });
    }

    return branches;
  } catch {
    return [];
  }
}

// ─── Bulk delete ───

export async function deleteBranches(
  repoPath: string,
  branchNames: string[],
  force: boolean,
  mainBranch?: string
): Promise<{
  success: boolean;
  results: { branch: string; success: boolean; message: string }[];
}> {
  const results = [];
  const protectedBranches = ['main', 'master'];
  if (mainBranch && !protectedBranches.includes(mainBranch)) {
    protectedBranches.push(mainBranch);
  }

  // Get current branch once
  let currentBranch = '';
  try {
    const output = await git(repoPath, ['branch']);
    for (const line of output.split('\n')) {
      if (line.startsWith('* ')) {
        currentBranch = line.substring(2).trim();
        break;
      }
    }
  } catch {
    // ignore
  }

  for (const name of branchNames) {
    if (protectedBranches.includes(name)) {
      results.push({ branch: name, success: false, message: `Cannot delete protected branch "${name}"` });
      continue;
    }
    if (currentBranch === name) {
      results.push({ branch: name, success: false, message: `Cannot delete branch "${name}" — it is currently checked out` });
      continue;
    }
    try {
      await git(repoPath, ['branch', force ? '-D' : '-d', name]);
      results.push({ branch: name, success: true, message: `Branch "${name}" deleted` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      results.push({ branch: name, success: false, message });
    }
  }

  return { success: results.every((r) => r.success), results };
}
