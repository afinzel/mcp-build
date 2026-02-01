import { describe, it, expect } from 'vitest';
import { parseBuildOutput, parseBuildLine } from '../../../src/plugins/dotnet/parse-build.js';

describe('parseBuildLine', () => {
  it('parses error diagnostic', () => {
    const line =
      'src/Program.cs(42,13): error CS0103: The name \'foo\' does not exist in the current context';
    const result = parseBuildLine(line, 15, 'dotnet.build');

    expect(result.diagnostic).not.toBeNull();
    expect(result.diagnostic!.severity).toBe('error');
    expect(result.diagnostic!.code).toBe('CS0103');
    expect(result.diagnostic!.file).toBe('src/Program.cs');
    expect(result.diagnostic!.line).toBe(42);
    expect(result.diagnostic!.column).toBe(13);
    expect(result.diagnostic!.message).toBe(
      "The name 'foo' does not exist in the current context"
    );
    expect(result.diagnostic!.logRange.startLine).toBe(15);
  });

  it('parses warning diagnostic', () => {
    const line =
      'src/Utils.cs(10,5): warning CS0168: The variable \'x\' is declared but never used';
    const result = parseBuildLine(line, 8, 'dotnet.build');

    expect(result.diagnostic).not.toBeNull();
    expect(result.diagnostic!.severity).toBe('warning');
    expect(result.diagnostic!.code).toBe('CS0168');
  });

  it('returns null for non-diagnostic line', () => {
    const line = 'Build succeeded.';
    const result = parseBuildLine(line, 1, 'dotnet.build');

    expect(result.diagnostic).toBeNull();
  });

  it('handles paths with spaces', () => {
    const line =
      'src/My Project/File.cs(1,1): error CS1234: Some error';
    const result = parseBuildLine(line, 1, 'dotnet.build');

    expect(result.diagnostic).not.toBeNull();
    expect(result.diagnostic!.file).toBe('src/My Project/File.cs');
  });
});

describe('parseBuildOutput', () => {
  it('returns empty array for clean build', () => {
    const output = `
Microsoft (R) Build Engine version 17.0.0
Build succeeded.
    0 Warning(s)
    0 Error(s)
`;
    const diagnostics = parseBuildOutput({ tool: 'dotnet.build', output });

    expect(diagnostics).toEqual([]);
  });

  it('parses multiple diagnostics', () => {
    const output = `
src/A.cs(10,5): error CS0103: Error one
src/B.cs(20,10): warning CS0168: Warning one
src/C.cs(30,15): error CS0246: Error two
`;
    const diagnostics = parseBuildOutput({ tool: 'dotnet.build', output });

    expect(diagnostics).toHaveLength(3);
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[1].severity).toBe('warning');
    expect(diagnostics[2].severity).toBe('error');
  });

  it('assigns correct line numbers', () => {
    const output = `Line 1
src/A.cs(1,1): error CS0001: First error
Line 3
src/B.cs(2,2): error CS0002: Second error`;
    const diagnostics = parseBuildOutput({ tool: 'dotnet.build', output });

    expect(diagnostics[0].logRange.startLine).toBe(2);
    expect(diagnostics[1].logRange.startLine).toBe(4);
  });
});
