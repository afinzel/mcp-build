import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import path from 'node:path';
import {
  executeCommand,
  getUserPathFromShell,
  getFallbackPaths,
  quoteForCmd,
  resetPathCache,
} from '../../src/plugins/executor.js';
import { createStorage } from '../../src/storage/index.js';

const TEST_DIR = '/tmp/mcp-build-executor-test';
const PROJECT_DIR = '/tmp/mcp-build-executor-project';

describe('executeCommand', () => {
  beforeEach(() => {
    process.env.XDG_DATA_HOME = TEST_DIR;
    rmSync(TEST_DIR, { recursive: true, force: true });
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
    delete process.env.XDG_DATA_HOME;
  });

  it('executes command and captures stdout', async () => {
    const storage = createStorage();
    const runWriter = storage.createRun('test', '/tmp', ['echo', 'hello']);

    const result = await executeCommand({
      command: 'echo',
      args: ['hello world'],
      cwd: '/tmp',
      runWriter,
    });

    runWriter.complete(result.exitCode);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('hello world');

    const reader = storage.getRun(runWriter.runId);
    const lines = reader!.getLogLines(1, 10);
    expect(lines[0]).toBe('hello world');
  });

  it('captures stderr', async () => {
    const storage = createStorage();
    const runWriter = storage.createRun('test', '/tmp', ['echo error >&2']);

    const result = await executeCommand({
      command: 'sh',
      args: ['-c', 'echo error >&2'],
      cwd: '/tmp',
      runWriter,
    });

    runWriter.complete(result.exitCode);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('error');
  });

  it('returns non-zero exit code on failure', async () => {
    const storage = createStorage();
    const runWriter = storage.createRun('test', '/tmp', ['exit 42']);

    const result = await executeCommand({
      command: 'sh',
      args: ['-c', 'exit 42'],
      cwd: '/tmp',
      runWriter,
    });

    runWriter.complete(result.exitCode);

    expect(result.exitCode).toBe(42);
  });

  it('returns exit code 127 for command not found', async () => {
    const storage = createStorage();
    const runWriter = storage.createRun('test', '/tmp', ['nonexistent-command']);

    const result = await executeCommand({
      command: 'nonexistent-command-xyz-123',
      args: [],
      cwd: '/tmp',
      runWriter,
    });

    runWriter.complete(result.exitCode);

    expect(result.exitCode).toBe(127);
    expect(result.output).toContain('not found');
  });

  it('passes arguments with shell metacharacters through unsplit', async () => {
    const storage = createStorage();
    const filter = 'FullyQualifiedName~A|FullyQualifiedName~B';
    const runWriter = storage.createRun('test', '/tmp', ['printf', filter]);

    const result = await executeCommand({
      command: 'printf',
      args: ['%s\\n', filter, '$HOME', 'a b; echo injected'],
      cwd: '/tmp',
      runWriter,
    });

    runWriter.complete(result.exitCode);

    expect(result.exitCode).toBe(0);
    expect(result.output).toBe(`${filter}\n$HOME\na b; echo injected\n`);
  });

  it('finds executables in node_modules/.bin', async () => {
    // Create a mock project with node_modules/.bin
    rmSync(PROJECT_DIR, { recursive: true, force: true });
    const binDir = path.join(PROJECT_DIR, 'node_modules', '.bin');
    mkdirSync(binDir, { recursive: true });

    // Create a mock executable script
    const scriptPath = path.join(binDir, 'my-test-tool');
    writeFileSync(scriptPath, '#!/bin/sh\necho "tool output"');
    chmodSync(scriptPath, 0o755);

    const storage = createStorage();
    const runWriter = storage.createRun('test', PROJECT_DIR, ['my-test-tool']);

    const result = await executeCommand({
      command: 'my-test-tool',
      args: [],
      cwd: PROJECT_DIR,
      runWriter,
    });

    runWriter.complete(result.exitCode);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('tool output');

    // Cleanup
    rmSync(PROJECT_DIR, { recursive: true, force: true });
  });
});

describe('getUserPathFromShell', () => {
  beforeEach(() => {
    resetPathCache();
  });

  afterEach(() => {
    resetPathCache();
  });

  it('returns a non-empty path string', () => {
    const userPath = getUserPathFromShell();
    expect(userPath).not.toBeNull();
    expect(typeof userPath).toBe('string');
    expect(userPath!.length).toBeGreaterThan(0);
  });

  it('returns path containing common directories', () => {
    const userPath = getUserPathFromShell();
    expect(userPath).not.toBeNull();
    // Should contain at least /usr/bin which is universal
    expect(userPath).toContain('/usr/bin');
  });

  it('caches the result', () => {
    const first = getUserPathFromShell();
    const second = getUserPathFromShell();
    // Should return the same cached value
    expect(first).toBe(second);
  });

  it('returns fresh value after cache reset', () => {
    const first = getUserPathFromShell();
    resetPathCache();
    const second = getUserPathFromShell();
    // Values should be equal (same system) but verifies cache was cleared
    expect(first).toEqual(second);
  });
});

describe('getFallbackPaths', () => {
  it('returns array of paths', () => {
    const paths = getFallbackPaths();
    expect(Array.isArray(paths)).toBe(true);
    expect(paths.length).toBeGreaterThan(0);
  });

  it('includes common tool directories on Unix', () => {
    if (process.platform !== 'win32') {
      const paths = getFallbackPaths();
      expect(paths).toContain('/usr/local/bin');
      expect(paths).toContain('/usr/bin');
    }
  });

  it('includes homebrew path on macOS', () => {
    if (process.platform === 'darwin') {
      const paths = getFallbackPaths();
      expect(paths).toContain('/opt/homebrew/bin');
    }
  });

  it('includes dotnet paths', () => {
    const paths = getFallbackPaths();
    if (process.platform === 'win32') {
      expect(paths.some((p) => p.includes('dotnet'))).toBe(true);
    } else {
      expect(paths).toContain('/usr/local/share/dotnet');
    }
  });
});

describe('resetPathCache', () => {
  it('clears the cached path', () => {
    // Populate cache
    getUserPathFromShell();
    // Reset it
    resetPathCache();
    // Should work without error (cache was cleared)
    const path = getUserPathFromShell();
    expect(path).not.toBeNull();
  });
});

describe('quoteForCmd', () => {
  it('leaves a plain argument unquoted', () => {
    expect(quoteForCmd('--no-build')).toBe('--no-build');
  });

  it('quotes an argument holding a pipe', () => {
    expect(quoteForCmd('Name~A|Name~B')).toBe('"Name~A|Name~B"');
  });

  it('quotes an argument holding a space', () => {
    expect(quoteForCmd('my project')).toBe('"my project"');
  });

  it('doubles embedded double quotes', () => {
    expect(quoteForCmd('say "hi"')).toBe('"say ""hi"""');
  });

  it('quotes an empty argument', () => {
    expect(quoteForCmd('')).toBe('""');
  });
});
