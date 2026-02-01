/**
 * dotnet.test plugin
 */

import type { Plugin, PluginInput, PluginOutput } from '../types.js';
import { executeCommand } from '../executor.js';
import { parseTestOutput } from './parse-test.js';

export const dotnetTestPlugin: Plugin = {
  name: 'dotnet.test',
  description: 'Run .NET tests',
  mutatesWorkspace: false,
  inputSchema: {
    type: 'object',
    properties: {
      args: {
        type: 'array',
        items: { type: 'string' },
        description: 'Arguments passed to dotnet test',
      },
      cwd: {
        type: 'string',
        description: 'Working directory',
      },
      confirmed: {
        type: 'boolean',
        description: 'Confirmation for mutating operations',
      },
    },
  },

  async execute(input: PluginInput): Promise<PluginOutput> {
    const { args, cwd, runWriter } = input;

    const result = await executeCommand({
      command: 'dotnet',
      args: ['test', ...args],
      cwd,
      runWriter,
    });

    const diagnostics = parseTestOutput({
      tool: 'dotnet.test',
      output: result.output,
    });

    return {
      success: result.exitCode === 0,
      diagnostics,
      exitCode: result.exitCode,
    };
  },
};
