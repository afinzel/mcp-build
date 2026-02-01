/**
 * Parser for dotnet build (MSBuild) output
 */

import { createDiagnostic, type Diagnostic, type Severity } from '../../types/index.js';

const MSBUILD_DIAGNOSTIC_REGEX =
  /^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+(\w+):\s*(.+)$/;

export interface ParseBuildOptions {
  tool: string;
  output: string;
}

export interface ParsedLine {
  lineNumber: number;
  diagnostic: Diagnostic | null;
}

export function parseBuildLine(
  line: string,
  lineNumber: number,
  tool: string
): ParsedLine {
  const match = line.match(MSBUILD_DIAGNOSTIC_REGEX);

  if (!match) {
    return { lineNumber, diagnostic: null };
  }

  const [, file, lineStr, colStr, severityStr, code, message] = match;
  const severity: Severity = severityStr === 'error' ? 'error' : 'warning';

  const diagnostic = createDiagnostic({
    tool,
    severity,
    message: message.trim(),
    code,
    file: file.trim(),
    line: parseInt(lineStr, 10),
    column: parseInt(colStr, 10),
    logRange: { startLine: lineNumber, endLine: lineNumber },
  });

  return { lineNumber, diagnostic };
}

export function parseBuildOutput(options: ParseBuildOptions): Diagnostic[] {
  const { tool, output } = options;
  const lines = output.split('\n');
  const diagnostics: Diagnostic[] = [];

  for (let i = 0; i < lines.length; i++) {
    const { diagnostic } = parseBuildLine(lines[i], i + 1, tool);
    if (diagnostic) {
      diagnostics.push(diagnostic);
    }
  }

  return diagnostics;
}
