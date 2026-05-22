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
  for (let port = start; port < start + 100; port++) {
    const free = await new Promise<boolean>((resolve) => {
      const server = net.createServer();
      server.unref();
      server.on('error', () => resolve(false));
      server.listen(port, '127.0.0.1', () => {
        server.close(() => resolve(true));
      });
    });
    if (free) return port;
  }
  return start;
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

async function startWebMode(repoPath?: string) {
  const port = await findPort(3001);
  const app = createApp();
  const urlPath = repoPath
    ? `?path=${encodeURIComponent(repoPath)}`
    : '';

  app.listen(port, '127.0.0.1', () => {
    const url = `http://localhost:${port}/${urlPath}`;
    console.log(`\n  ⚡ Forgotten Branches v${getVersion()} → ${url}\n`);
    console.log(`  Press Ctrl+C to stop.\n`);
    openBrowser(url);
  });
}

// ── TUI mode ──

async function startTuiMode(repoPath?: string) {
  const { render } = await import('ink');
  const { default: TuiApp } = await import('./tui/app.js');
  const { unmount } = render(TuiApp({ initialPath: repoPath }));
  process.on('SIGINT', () => {
    unmount();
    process.exit(0);
  });
  // Ink handles the terminal cleanup
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
  const repoPath = args.filter((a) => a !== '--tui' && a !== '--web').find((a) => !a.startsWith('--'));

  let mode: 'web' | 'tui';

  if (modeFlag === '--tui') {
    mode = 'tui';
  } else if (modeFlag === '--web') {
    mode = 'web';
  } else {
    mode = await showPrompt();
  }

  if (mode === 'tui') {
    await startTuiMode(repoPath);
  } else {
    await startWebMode(repoPath);
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
