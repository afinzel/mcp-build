/**
 * Plugin module
 */

export * from './types.js';
export { createPluginRegistry } from './registry.js';
export { executeCommand } from './executor.js';
export type { ExecuteCommandOptions, ExecuteCommandResult } from './executor.js';

// Built-in plugins
export * from './dotnet/index.js';
export * from './npm/index.js';
export * from './pnpm/index.js';
export * from './eslint/index.js';
