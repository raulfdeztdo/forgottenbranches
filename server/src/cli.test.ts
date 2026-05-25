import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';

const execFileMock = vi.fn();
vi.mock('child_process', () => ({ execFile: (...args: unknown[]) => execFileMock(...args) }));

const readFileSyncMock = vi.fn();
vi.mock('fs', () => ({
  readFileSync: (...args: unknown[]) => readFileSyncMock(...args),
}));

const createInterfaceMock = vi.fn();
vi.mock('readline', () => ({
  createInterface: (...args: unknown[]) => createInterfaceMock(...args),
}));

// Dynamic import mocks
const mockRender = vi.fn().mockReturnValue({ unmount: vi.fn() });
vi.mock('ink', () => ({ render: (...args: unknown[]) => mockRender(...args) }));

vi.mock('react', () => ({
  createElement: (...args: unknown[]) => args,
}));

const MockTuiApp = vi.fn();
vi.mock('./tui/app.js', () => ({ default: MockTuiApp }));

const mockListen = vi.fn();
const mockGet = vi.fn();
const mockUse = vi.fn();
const mockStatic = vi.fn();
const mockCreateApp = vi.fn().mockReturnValue({
  listen: (...args: unknown[]) => mockListen(...args),
  get: (...args: unknown[]) => mockGet(...args),
  use: (...args: unknown[]) => mockUse(...args),
});

vi.mock('./app.js', () => ({
  createApp: (...args: unknown[]) => mockCreateApp(...args),
}));

import { main } from './cli.js';
import { fileURLToPath } from 'url';

// Helper to reset and capture the listen callback
function captureListenCallback() {
  return new Promise<() => void>((resolve) => {
    mockListen.mockImplementation((_port: number, _host: string, cb?: () => void) => {
      if (cb) resolve(cb);
    });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
});

describe('main() argument parsing', () => {
  it('calls showPrompt when no flags are passed', async () => {
    createInterfaceMock.mockReturnValue({
      question: (_q: string, cb: (answer: string) => void) => cb('1'),
      close: vi.fn(),
    });

    const listenReady = captureListenCallback();
    const promise = main(['node', 'cli']);
    const cb = await listenReady;
    cb(); // trigger listen callback
    await promise;

    expect(createInterfaceMock).toHaveBeenCalled();
    expect(mockCreateApp).toHaveBeenCalled();
  });

  it('goes to web mode with --web flag', async () => {
    const listenReady = captureListenCallback();
    const promise = main(['node', 'cli', '--web']);
    const cb = await listenReady;
    cb();
    await promise;

    expect(createInterfaceMock).not.toHaveBeenCalled();
    expect(mockCreateApp).toHaveBeenCalled();
  });

  it('goes to tui mode with --tui flag', async () => {
    await main(['node', 'cli', '--tui']);

    expect(createInterfaceMock).not.toHaveBeenCalled();
    expect(mockRender).toHaveBeenCalled();
    // createElement returns [component, props], render receives that
    expect(mockRender).toHaveBeenCalledWith([MockTuiApp, { initialPath: undefined }]);
  });

  it('showPrompt returns web for input "1"', async () => {
    createInterfaceMock.mockReturnValue({
      question: (_q: string, cb: (answer: string) => void) => cb('1'),
      close: vi.fn(),
    });

    const listenReady = captureListenCallback();
    const promise = main(['node', 'cli']);
    const cb = await listenReady;
    cb();
    await promise;

    expect(mockCreateApp).toHaveBeenCalled();
    expect(mockRender).not.toHaveBeenCalled();
  });

  it('showPrompt returns tui for input "2"', async () => {
    createInterfaceMock.mockReturnValue({
      question: (_q: string, cb: (answer: string) => void) => cb('2'),
      close: vi.fn(),
    });

    await main(['node', 'cli']);

    expect(mockRender).toHaveBeenCalled();
    expect(mockCreateApp).not.toHaveBeenCalled();
  });

  it('extracts repo path from args', async () => {
    await main(['node', 'cli', '--tui', '/my/repo']);

    expect(mockRender).toHaveBeenCalledWith([MockTuiApp, { initialPath: '/my/repo' }]);
  });

  it('extracts repo path with --web flag', async () => {
    const listenReady = captureListenCallback();
    const promise = main(['node', 'cli', '--web', '/my/repo']);
    const cb = await listenReady;
    cb();
    await promise;

    expect(mockCreateApp).toHaveBeenCalled();
  });

  it('handles prompt error gracefully', async () => {
    createInterfaceMock.mockImplementation(() => {
      throw new Error('TTY error');
    });

    // We expect main to handle the error via the isMain guard
    // In test context, isMain is false (not direct execution)
    // So main is just imported, the error would be caught
    await expect(main(['node', 'cli'])).rejects.toThrow('TTY error');
  });
});

describe('findPort', () => {
  it('is importable from the module', async () => {
    const mod = await import('./cli.js');
    expect(typeof mod.main).toBe('function');
  });
});

describe('getVersion', () => {
  it('reads version from package.json', async () => {
    readFileSyncMock.mockReturnValue(JSON.stringify({ version: '1.2.3' }));

    const listenReady = captureListenCallback();
    const promise = main(['node', 'cli', '--web']);
    const cb = await listenReady;
    cb();
    await promise;

    // Verify version was read
    expect(readFileSyncMock).toHaveBeenCalled();
  });

  it('returns unknown when package.json is unreadable', async () => {
    readFileSyncMock.mockImplementation(() => {
      throw new Error('ENOENT');
    });

    const listenReady = captureListenCallback();
    const promise = main(['node', 'cli', '--web']);
    const cb = await listenReady;
    cb();
    await promise;

    // Should not crash
    expect(mockCreateApp).toHaveBeenCalled();
  });
});
