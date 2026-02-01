/**
 * Command execution utilities for plugins
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import type { RunWriter } from '../storage/index.js';

export interface ExecuteCommandOptions {
  command: string;
  args: string[];
  cwd: string;
  runWriter: RunWriter;
}

export interface ExecuteCommandResult {
  exitCode: number;
  output: string;
}

function buildEnvWithNodeModulesBin(cwd: string): NodeJS.ProcessEnv {
  const nodeModulesBin = path.join(cwd, 'node_modules', '.bin');
  const currentPath = process.env['PATH'] ?? '';
  const pathSeparator = process.platform === 'win32' ? ';' : ':';

  return {
    ...process.env,
    PATH: `${nodeModulesBin}${pathSeparator}${currentPath}`,
  };
}

export function executeCommand(
  options: ExecuteCommandOptions
): Promise<ExecuteCommandResult> {
  const { command, args, cwd, runWriter } = options;

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    const child = spawn(command, args, {
      cwd,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: buildEnvWithNodeModulesBin(cwd),
    });

    child.stdout.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      runWriter.appendLog(chunk);
    });

    child.stderr.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      runWriter.appendLog(chunk);
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      const output = Buffer.concat(chunks).toString('utf-8');
      resolve({ exitCode: code ?? 1, output });
    });
  });
}
