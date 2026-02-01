# MCP Build Tools Server

An MCP server providing structured access to build, test, lint, and package-management tooling.

## Available Tools

| Tool | Description | Mutates Workspace |
|------|-------------|-------------------|
| `dotnet.build` | Build .NET projects | No |
| `dotnet.test` | Run .NET tests | No |
| `npm.install` | Install npm packages | Yes |
| `pnpm.install` | Install pnpm packages | Yes |
| `eslint.lint` | Run ESLint on files | No |

## Installation

### Claude Code (CLI)

1. Build the server:
   ```bash
   npm install
   npm run build
   ```

2. Add to `~/.claude.json` (user scope). Add `mcpServers` at the **top level** of the file:
   ```json
   {
     "mcpServers": {
       "mcp-build": {
         "type": "stdio",
         "command": "/opt/homebrew/bin/node",
         "args": ["/absolute/path/to/mcp-build/dist/main.js"]
       }
     },
     ... other existing fields ...
   }
   ```

   **Important notes:**
   - Use the full path to `node` (run `which node` to find it) to avoid PATH issues
   - Use an absolute path to `main.js`
   - The config is **NOT** at `~/.claude/mcp.json` or `~/.config/claude/mcp.json`
   - For project-scoped config, use `.mcp.json` in the project root instead

3. Restart Claude Code.

4. Verify with `/mcp` command in Claude Code.

### Claude Desktop

1. Build the server:
   ```bash
   npm install
   npm run build
   ```

2. Add to your Claude Desktop configuration at `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):
   ```json
   {
     "mcpServers": {
       "mcp-build": {
         "command": "node",
         "args": ["/absolute/path/to/mcp-build/dist/main.js"]
       }
     }
   }
   ```

3. Restart Claude Desktop.

## Development

```bash
npm run build      # Compile TypeScript
npm run typecheck  # Type check without emitting
npm run dev        # Watch mode
npm test           # Run tests
```

## Adding a New Plugin

Follow these steps to add a new plugin (e.g., `yarn.install`).

### Step 1: Create Plugin Directory

```bash
mkdir src/plugins/yarn
```

### Step 2: Create the Parser

Create `src/plugins/yarn/parse-yarn.ts`:

```typescript
/**
 * Parser for yarn output
 */

import { createDiagnostic, type Diagnostic } from '../../types/index.js';

export interface ParseYarnOptions {
  tool: string;
  output: string;
}

export function parseYarnOutput(options: ParseYarnOptions): Diagnostic[] {
  const { tool, output } = options;
  const lines = output.split('\n');
  const diagnostics: Diagnostic[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Parse warnings and errors from yarn output
    // Add regex patterns specific to yarn's output format
    if (line.includes('warning')) {
      diagnostics.push(
        createDiagnostic({
          tool,
          severity: 'warning',
          message: line,
          logRange: { startLine: lineNumber, endLine: lineNumber },
        })
      );
    }

    if (line.includes('error')) {
      diagnostics.push(
        createDiagnostic({
          tool,
          severity: 'error',
          message: line,
          logRange: { startLine: lineNumber, endLine: lineNumber },
        })
      );
    }
  }

  return diagnostics;
}
```

### Step 3: Create the Plugin

Create `src/plugins/yarn/yarn-install.ts`:

```typescript
/**
 * yarn.install plugin
 */

import type { Plugin, PluginInput, PluginOutput } from '../types.js';
import { executeCommand } from '../executor.js';
import { parseYarnOutput } from './parse-yarn.js';

export const yarnInstallPlugin: Plugin = {
  name: 'yarn.install',
  description: 'Install yarn packages',
  mutatesWorkspace: true,
  inputSchema: {
    type: 'object',
    properties: {
      args: {
        type: 'array',
        items: { type: 'string' },
        description: 'Arguments passed to yarn install',
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
      command: 'yarn',
      args: ['install', ...args],
      cwd,
      runWriter,
    });

    const diagnostics = parseYarnOutput({
      tool: 'yarn.install',
      output: result.output,
    });

    return {
      success: result.exitCode === 0,
      diagnostics,
      exitCode: result.exitCode,
    };
  },
};
```

### Step 4: Create the Index

Create `src/plugins/yarn/index.ts`:

```typescript
/**
 * yarn plugins
 */

export { yarnInstallPlugin } from './yarn-install.js';
export { parseYarnOutput } from './parse-yarn.js';
```

### Step 5: Export from Plugins Module

Add to `src/plugins/index.ts`:

```typescript
export * from './yarn/index.js';
```

### Step 6: Register the Plugin

Add to `src/main.ts`:

```typescript
import {
  // ... existing imports
  yarnInstallPlugin,
} from './plugins/index.js';

// ... existing code

registry.register(yarnInstallPlugin);
```

### Step 7: Add Tests

Create tests in `tests/plugins/yarn/`:

- `parse-yarn.test.ts` - Test the parser
- `yarn-install.test.ts` - Test the plugin

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/plugins/types.ts` | Plugin interface definition |
| `src/plugins/executor.ts` | Command execution utility |
| `src/plugins/registry.ts` | Plugin registry implementation |
| `src/main.ts` | Server entry point and plugin registration |
| `src/plugins/npm/` | Complete example plugin |
