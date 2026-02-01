# Core Types

All shared types and interfaces used across the MCP Build Tools Server.

---

## Severity Enum

```typescript
type Severity = 'error' | 'warning' | 'info';
```

---

## Diagnostic Schema

Each diagnostic emitted by a plugin:

```typescript
interface Diagnostic {
  tool: string;           // e.g. "dotnet.build", "eslint.lint"
  severity: Severity;
  message: string;
  code?: string;          // compiler/linter error code if available
  file?: string;          // absolute or workspace-relative path
  line?: number;          // 1-indexed
  column?: number;        // 1-indexed
  logRange: {
    startLine: number;    // 0 if not available
    endLine: number;      // 0 if not available
  };
  byteOffsets: {
    start: number;        // 0 if not available
    end: number;          // 0 if not available
  };
}
```

**Note:** `logRange` and `byteOffsets` are always present. Set to `0` values when the plugin cannot determine them.

---

## Response Shape

All tool responses follow this structure:

```typescript
interface ToolResponse {
  success: boolean;
  errors: Diagnostic[];
  warnings: Diagnostic[];
  summary: {
    errorCount: number;
    warningCount: number;
  };
  runId: string;          // for raw output retrieval
}
```

---

## Run Metadata

Stored alongside each run:

```typescript
interface RunMeta {
  runId: string;
  tool: string;
  startedAt: string;      // ISO 8601
  completedAt: string;    // ISO 8601
  exitCode: number;
  cwd: string;
  command: string[];      // full command array
}
```

---

## Cross-References

- Storage format: see `02-storage.md`
- Plugin interface: see `03-plugin-architecture.md`
- Tool definitions: see `04-mcp-tools.md`
