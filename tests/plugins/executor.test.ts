import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import path from 'node:path';
import { executeCommand } from '../../src/plugins/executor.js';
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
    const runWriter = storage.createRun('test', '/tmp', ['sh', '-c', 'echo error >&2']);

    const result = await executeCommand({
      command: 'sh',
      args: ['-c', 'echo error >&2'],
      cwd: '/tmp',
      runWriter,
    });

    runWriter.complete(result.exitCode);

    expect(result.exitCode).toBe(0);

    const reader = storage.getRun(runWriter.runId);
    const lines = reader!.getLogLines(1, 10);
    expect(lines[0]).toBe('error');
  });

  it('returns non-zero exit code on failure', async () => {
    const storage = createStorage();
    const runWriter = storage.createRun('test', '/tmp', ['sh', '-c', 'exit 42']);

    const result = await executeCommand({
      command: 'sh',
      args: ['-c', 'exit 42'],
      cwd: '/tmp',
      runWriter,
    });

    runWriter.complete(result.exitCode);

    expect(result.exitCode).toBe(42);
  });

  it('rejects on command not found', async () => {
    const storage = createStorage();
    const runWriter = storage.createRun('test', '/tmp', ['nonexistent-command']);

    await expect(
      executeCommand({
        command: 'nonexistent-command-xyz-123',
        args: [],
        cwd: '/tmp',
        runWriter,
      })
    ).rejects.toThrow();
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
