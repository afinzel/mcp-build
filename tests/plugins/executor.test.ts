import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { executeCommand } from '../../src/plugins/executor.js';
import { createStorage } from '../../src/storage/index.js';

const TEST_DIR = '/tmp/mcp-build-executor-test';

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
});
