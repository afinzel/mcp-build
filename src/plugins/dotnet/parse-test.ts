/**
 * Parser for dotnet test output
 */

import { createDiagnostic, type Diagnostic } from '../../types/index.js';

const FAILED_TEST_REGEX = /^\s*Failed\s+(.+?)\s+\[/;
const STACK_TRACE_REGEX = /in\s+(.+?):line\s+(\d+)/;

interface TestFailure {
  testName: string;
  errorMessage: string;
  file?: string;
  line?: number;
  startLine: number;
  endLine: number;
}

export interface ParseTestOptions {
  tool: string;
  output: string;
}

export function parseTestOutput(options: ParseTestOptions): Diagnostic[] {
  const { tool, output } = options;
  const lines = output.split('\n');
  const diagnostics: Diagnostic[] = [];
  const failures: TestFailure[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const failedMatch = line.match(FAILED_TEST_REGEX);

    if (failedMatch) {
      const testName = failedMatch[1];
      const startLine = i + 1;
      let errorMessage = '';
      let file: string | undefined;
      let fileLine: number | undefined;
      let endLine = startLine;

      i++;
      while (i < lines.length) {
        const nextLine = lines[i];

        if (nextLine.match(FAILED_TEST_REGEX) || nextLine.trim() === '') {
          if (nextLine.trim() === '') {
            i++;
          }
          break;
        }

        if (nextLine.includes('Error Message:')) {
          i++;
          if (i < lines.length) {
            errorMessage = lines[i].trim();
          }
        }

        const stackMatch = nextLine.match(STACK_TRACE_REGEX);
        if (stackMatch && !file) {
          file = stackMatch[1];
          fileLine = parseInt(stackMatch[2], 10);
        }

        endLine = i + 1;
        i++;
      }

      failures.push({
        testName,
        errorMessage: errorMessage || `Test ${testName} failed`,
        file,
        line: fileLine,
        startLine,
        endLine,
      });
    } else {
      i++;
    }
  }

  for (const failure of failures) {
    diagnostics.push(
      createDiagnostic({
        tool,
        severity: 'error',
        message: failure.errorMessage,
        code: 'TestFailure',
        file: failure.file,
        line: failure.line,
        logRange: { startLine: failure.startLine, endLine: failure.endLine },
      })
    );
  }

  return diagnostics;
}
