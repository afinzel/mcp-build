/**
 * Tool response types
 */

import type { Diagnostic, DiagnosticSummary } from './diagnostic.js';

export interface ToolResponse {
  /** Whether the operation succeeded */
  success: boolean;
  /** Error diagnostics */
  errors: Diagnostic[];
  /** Warning diagnostics */
  warnings: Diagnostic[];
  /** Counts summary */
  summary: DiagnosticSummary;
  /** Run ID for raw output retrieval */
  runId: string;
}

/**
 * Create a successful tool response
 */
export function createSuccessResponse(
  runId: string,
  warnings: Diagnostic[] = []
): ToolResponse {
  return {
    success: true,
    errors: [],
    warnings,
    summary: {
      errorCount: 0,
      warningCount: warnings.length,
    },
    runId,
  };
}

/**
 * Create a failed tool response
 */
export function createErrorResponse(
  runId: string,
  errors: Diagnostic[],
  warnings: Diagnostic[] = []
): ToolResponse {
  return {
    success: false,
    errors,
    warnings,
    summary: {
      errorCount: errors.length,
      warningCount: warnings.length,
    },
    runId,
  };
}
