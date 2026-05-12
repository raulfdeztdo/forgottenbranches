import { createApp } from './app';
import { execFile } from 'child_process';

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

async function openBrowser(url: string) {
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

async function main() {
  const port = await findPort(3001);
  const app = createApp();
  const repoPath = process.argv[2] || '';
  const urlPath = repoPath
    ? `?path=${encodeURIComponent(repoPath)}`
    : '';

  app.listen(port, '127.0.0.1', () => {
    const url = `http://localhost:${port}/${urlPath}`;
    console.log(`\n  ⚡ Forgotten Branches → ${url}\n`);
    console.log(`  Press Ctrl+C to stop.\n`);
    openBrowser(url);
  });
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
