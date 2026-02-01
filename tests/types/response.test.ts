import { describe, it, expect } from 'vitest';
import { createSuccessResponse, createErrorResponse } from '../../src/types/response.js';
import { createDiagnostic } from '../../src/types/diagnostic.js';

describe('createSuccessResponse', () => {
  it('creates response with no warnings', () => {
    const response = createSuccessResponse('run-123');

    expect(response).toEqual({
      success: true,
      errors: [],
      warnings: [],
      summary: { errorCount: 0, warningCount: 0 },
      runId: 'run-123',
    });
  });

  it('creates response with warnings', () => {
    const warning = createDiagnostic({
      tool: 'npm.install',
      severity: 'warning',
      message: 'Deprecated package',
    });

    const response = createSuccessResponse('run-456', [warning]);

    expect(response.success).toBe(true);
    expect(response.warnings).toHaveLength(1);
    expect(response.summary.warningCount).toBe(1);
  });
});

describe('createErrorResponse', () => {
  it('creates response with errors', () => {
    const error = createDiagnostic({
      tool: 'dotnet.build',
      severity: 'error',
      message: 'Compilation failed',
    });

    const response = createErrorResponse('run-789', [error]);

    expect(response).toMatchObject({
      success: false,
      summary: { errorCount: 1, warningCount: 0 },
      runId: 'run-789',
    });
    expect(response.errors).toHaveLength(1);
  });

  it('creates response with errors and warnings', () => {
    const error = createDiagnostic({
      tool: 'dotnet.build',
      severity: 'error',
      message: 'Compilation failed',
    });
    const warning = createDiagnostic({
      tool: 'dotnet.build',
      severity: 'warning',
      message: 'Unused variable',
    });

    const response = createErrorResponse('run-abc', [error], [warning]);

    expect(response.success).toBe(false);
    expect(response.errors).toHaveLength(1);
    expect(response.warnings).toHaveLength(1);
    expect(response.summary).toEqual({ errorCount: 1, warningCount: 1 });
  });
});
