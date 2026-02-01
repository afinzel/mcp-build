#!/usr/bin/env node
/**
 * MCP Build Tools Server entry point
 */

import { createStorage } from './storage/index.js';
import {
  createPluginRegistry,
  dotnetBuildPlugin,
  dotnetTestPlugin,
  npmInstallPlugin,
  pnpmInstallPlugin,
  eslintLintPlugin,
} from './plugins/index.js';
import { createMcpServer } from './server/index.js';

const storage = createStorage();
storage.cleanup();

const registry = createPluginRegistry();
registry.register(dotnetBuildPlugin);
registry.register(dotnetTestPlugin);
registry.register(npmInstallPlugin);
registry.register(pnpmInstallPlugin);
registry.register(eslintLintPlugin);

const server = createMcpServer({
  name: 'mcp-build',
  version: '0.1.0',
  registry,
  storage,
  defaultCwd: process.cwd(),
});

server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
