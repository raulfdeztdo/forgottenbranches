import { createApp } from './app.js';
import { execFile } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as readline from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Shared helpers ──

function getVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'));
    return pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

async function findPort(start: number): Promise<number> {
  const net = await import('net');
  const ports = Array.from({ length: 100 }, (_, i) => start + i);
  const results = await Promise.all(
    ports.map(
      (port) =>
        new Promise<boolean>((resolve) => {
          const server = net.createServer();
          server.unref();
          server.on('error', () => resolve(false));
          server.listen(port, '127.0.0.1', () => {
            server.close(() => resolve(true));
          });
        })
    )
  );
  const freePort = ports.find((_, i) => results[i]);
  return freePort ?? start;
}

function openBrowser(url: string): void {
  const platform = process.platform;
  const [cmd, ...args]: string[] =
    platform === 'darwin'
      ? ['open', url]
      : platform === 'win32'
        ? ['cmd', '/c', 'start', '', url]
        : ['xdg-open', url];

  execFile(cmd, args, (err) => {
    if (err) {
      console.log(`  Could not open browser automatically.`);
      console.log(`  Open this URL manually: ${url}`);
    }
  });
}

// ── Web mode ──

async function startWebMode(repoPath?: string, locked = false) {
  const port = await findPort(3001);
  const app = createApp();
  const params = new URLSearchParams();
  if (repoPath) params.set('path', repoPath);
  if (locked) params.set('locked', '1');
  const urlPath = params.toString() ? `?${params.toString()}` : '';

  app.listen(port, '127.0.0.1', () => {
    const url = `http://localhost:${port}/${urlPath}`;
    console.log(`\n  ⚡ Forgotten Branches v${getVersion()} → ${url}\n`);
    console.log(`  Press Ctrl+C to stop.\n`);
    openBrowser(url);
  });
}

// ── TUI mode ──

async function startTuiMode(repoPath?: string, locked = false) {
  const [{ render }, { createElement }, { default: TuiApp }] = await Promise.all([
    import('ink'),
    import('react'),
    import('./tui/app.js'),
  ]);
  const { unmount } = render(createElement(TuiApp, { initialPath: repoPath, locked }));
  process.on('SIGINT', () => {
    unmount();
    process.exit(0);
  });
}

// ── Prompt mode ──

function showPrompt(): Promise<'web' | 'tui'> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('');
    console.log(`  ⚡ Forgotten Branches v${getVersion()}`);
    console.log('');
    console.log('  How would you like to proceed?');
    console.log('');
    console.log('    1. Web UI    (opens in your browser)');
    console.log('    2. Terminal  (interactive TUI)');
    console.log('');
    rl.question('  Enter 1 or 2: ', (answer) => {
      rl.close();
      const trimmed = answer.trim();
      if (trimmed === '2') resolve('tui');
      else resolve('web');
    });
  });
}

// ── Entry point ──

export async function main(argv: string[] = process.argv) {
  const args = argv.slice(2);
  const modeFlag = args.find((a) => a === '--tui' || a === '--web');
  const explicitPath = args.filter((a) => a !== '--tui' && a !== '--web').find((a) => !a.startsWith('--'));
  // Auto-detect project path when installed as dependency (use cwd)
  const repoPath = explicitPath || process.cwd();
  // Detect if installed as local project dependency (not global)
  const isLocalDep = process.argv[1]?.includes('node_modules/');

  let mode: 'web' | 'tui';

  if (modeFlag === '--tui') {
    mode = 'tui';
  } else if (modeFlag === '--web') {
    mode = 'web';
  } else {
    mode = await showPrompt();
  }

  if (mode === 'tui') {
    await startTuiMode(repoPath, isLocalDep);
  } else {
    await startWebMode(repoPath, isLocalDep);
  }
}

// Direct execution (ESM)
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1]);
if (isMain) {
  main().catch((err) => {
    console.error('Failed to start:', err);
    process.exit(1);
  });
}
