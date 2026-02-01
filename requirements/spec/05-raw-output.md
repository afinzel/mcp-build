# Raw Output Access

Opt-in APIs for accessing raw build/test logs.

---

## Design Principle

Raw output is **always captured** but **never returned by default**.

Use raw logs for: debugging parser failures, investigating unexpected errors, accessing output not in diagnostics.

---

## run.raw

Byte-offset paged access to raw output.

**Input:**
```typescript
{ runId: string, offset?: number, length?: number }  // defaults: 0, 4096
```

**Output:**
```typescript
{
  data: string,        // UTF-8 decoded
  offset: number,
  length: number,
  totalBytes: number,
  hasMore: boolean
}
```

---

## run.logRange

Line-based access using indexed ranges.

**Input:**
```typescript
{ runId: string, startLine: number, lineCount?: number }  // 1-indexed, default 50
```

**Output:**
```typescript
{
  lines: string[],
  startLine: number,
  endLine: number,
  totalLines: number,
  hasMore: boolean
}
```

---

## Diagnostic Log References

Each diagnostic includes log location hints:

```typescript
{ logRange: { startLine: 42, endLine: 44 }, byteOffsets: { start: 1024, end: 1156 } }
```

Fetch context around an error:
```typescript
run.logRange({ runId, startLine: diagnostic.logRange.startLine - 5, lineCount: 10 })
```

---

## Paging

For large logs, use `hasMore` and increment `offset` or `startLine` accordingly.

---

## Cross-References

- Run storage format: see `02-storage.md`
- Diagnostic schema: see `01-core-types.md`
