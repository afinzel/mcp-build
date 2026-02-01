/**
 * Tests for Jest output parser
 */

import { describe, it, expect } from 'vitest';
import { parseJestOutput } from '../../../src/plugins/jest/parse-jest.js';

describe('parseJestOutput', () => {
  it('returns empty array for clean output', () => {
    const output = `
PASS __tests__/foo.test.ts
  describe block
    ✓ test passes (5 ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
`;
    const diagnostics = parseJestOutput({ tool: 'npm.test', output });
    expect(diagnostics).toEqual([]);
  });

  it('parses single failed test', () => {
    const output = `
FAIL __tests__/foo.test.ts
  describe block
    ✕ should do something (10 ms)

  ● describe block › should do something

    expect(received).toBe(expected)

    Expected: 200
    Received: 500

      at Object.<anonymous> (__tests__/foo.test.ts:15:10)
`;
    const diagnostics = parseJestOutput({ tool: 'npm.test', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[0].file).toBe('__tests__/foo.test.ts');
    expect(diagnostics[0].line).toBe(15);
    expect(diagnostics[0].column).toBe(10);
    expect(diagnostics[0].message).toContain('describe block › should do something');
    expect(diagnostics[0].message).toContain('Expected: 200');
    expect(diagnostics[0].message).toContain('Received: 500');
  });

  it('parses multiple failed tests in same file', () => {
    const output = `
FAIL __tests__/foo.test.ts
  ● test one

    Error: failure 1

      at Object.<anonymous> (__tests__/foo.test.ts:10:5)

  ● test two

    Error: failure 2

      at Object.<anonymous> (__tests__/foo.test.ts:20:5)
`;
    const diagnostics = parseJestOutput({ tool: 'npm.test', output });

    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0].message).toContain('test one');
    expect(diagnostics[0].line).toBe(10);
    expect(diagnostics[1].message).toContain('test two');
    expect(diagnostics[1].line).toBe(20);
  });

  it('parses multiple failed files', () => {
    const output = `
FAIL __tests__/a.test.ts
  ● test in a

    Error: a failed

      at Object.<anonymous> (__tests__/a.test.ts:5:1)

FAIL __tests__/b.test.ts
  ● test in b

    Error: b failed

      at Object.<anonymous> (__tests__/b.test.ts:10:1)
`;
    const diagnostics = parseJestOutput({ tool: 'npm.test', output });

    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0].file).toBe('__tests__/a.test.ts');
    expect(diagnostics[1].file).toBe('__tests__/b.test.ts');
  });

  it('handles nested describe blocks', () => {
    const output = `
FAIL __tests__/nested.test.ts
  ● outer › inner › deeply nested test

    Expected: true
    Received: false

      at Object.<anonymous> (__tests__/nested.test.ts:25:10)
`;
    const diagnostics = parseJestOutput({ tool: 'npm.test', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain('outer › inner › deeply nested test');
  });

  it('falls back to FAIL file when stack trace missing', () => {
    const output = `
FAIL __tests__/fallback.test.ts
  ● test without stack trace

    Some error occurred
`;
    const diagnostics = parseJestOutput({ tool: 'npm.test', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].file).toBe('__tests__/fallback.test.ts');
    expect(diagnostics[0].line).toBeUndefined();
  });

  it('captures assertion type', () => {
    const output = `
FAIL __tests__/assert.test.ts
  ● assertion test

    expect(received).toEqual(expected)

      at Object.<anonymous> (__tests__/assert.test.ts:5:1)
`;
    const diagnostics = parseJestOutput({ tool: 'npm.test', output });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain('expect(received).toEqual(expected)');
  });

  it('sets tool name correctly', () => {
    const output = `
FAIL __tests__/tool.test.ts
  ● test

    Error

      at Object.<anonymous> (__tests__/tool.test.ts:1:1)
`;
    const diagnostics = parseJestOutput({ tool: 'pnpm.test', output });

    expect(diagnostics[0].tool).toBe('pnpm.test');
  });

  it('assigns correct log line numbers', () => {
    const output = `line 1
line 2
FAIL __tests__/log.test.ts
line 4
line 5
  ● test name

    Error

      at Object.<anonymous> (__tests__/log.test.ts:1:1)
`;
    const diagnostics = parseJestOutput({ tool: 'npm.test', output });

    // ● is on line 6 (line 1-5 are: line 1, line 2, FAIL, line 4, line 5)
    expect(diagnostics[0].logRange.startLine).toBe(6);
  });
});
