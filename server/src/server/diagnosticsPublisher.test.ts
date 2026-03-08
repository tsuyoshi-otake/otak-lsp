/**
 * DiagnosticsPublisher Module Tests
 * Feature: main-ts-refactoring
 * TDD: RED -> GREEN -> REFACTOR
 */

import { createDiagnosticsPublisher, DiagnosticsPublisher, convertSeverity } from './diagnosticsPublisher';
import { Diagnostic as LSPDiagnostic, DiagnosticSeverity as LSPDiagnosticSeverity } from 'vscode-languageserver/node';

describe('diagnosticsPublisher', () => {
  describe('createDiagnosticsPublisher', () => {
    it('should create a diagnostics publisher instance', () => {
      const publishedDiagnostics: Array<{ uri: string; diagnostics: LSPDiagnostic[] }> = [];
      const sendDiagnostics = (params: { uri: string; diagnostics: LSPDiagnostic[] }) => {
        publishedDiagnostics.push(params);
      };

      const publisher = createDiagnosticsPublisher(sendDiagnostics);

      expect(publisher).toBeDefined();
      expect(typeof publisher.publish).toBe('function');
      expect(typeof publisher.clear).toBe('function');
    });
  });

  describe('DiagnosticsPublisher.publish', () => {
    it('should publish diagnostics to the specified URI', () => {
      const publishedDiagnostics: Array<{ uri: string; diagnostics: LSPDiagnostic[] }> = [];
      const sendDiagnostics = (params: { uri: string; diagnostics: LSPDiagnostic[] }) => {
        publishedDiagnostics.push(params);
      };

      const publisher = createDiagnosticsPublisher(sendDiagnostics);

      const diagnostics: LSPDiagnostic[] = [
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 5 },
          },
          severity: LSPDiagnosticSeverity.Warning,
          message: 'Test error',
          code: 'test-code',
          source: 'otak-lsp',
        },
      ];

      publisher.publish('test://uri', diagnostics);

      expect(publishedDiagnostics).toHaveLength(1);
      expect(publishedDiagnostics[0].uri).toBe('test://uri');
      expect(publishedDiagnostics[0].diagnostics).toHaveLength(1);
      expect(publishedDiagnostics[0].diagnostics[0].message).toBe('Test error');
    });

    it('should publish multiple diagnostics', () => {
      const publishedDiagnostics: Array<{ uri: string; diagnostics: LSPDiagnostic[] }> = [];
      const sendDiagnostics = (params: { uri: string; diagnostics: LSPDiagnostic[] }) => {
        publishedDiagnostics.push(params);
      };

      const publisher = createDiagnosticsPublisher(sendDiagnostics);

      const diagnostics: LSPDiagnostic[] = [
        {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
          severity: LSPDiagnosticSeverity.Warning,
          message: 'Error 1',
          code: 'e1',
          source: 'otak-lsp',
        },
        {
          range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } },
          severity: LSPDiagnosticSeverity.Information,
          message: 'Error 2',
          code: 'e2',
          source: 'otak-lsp',
        },
      ];

      publisher.publish('test://uri', diagnostics);

      expect(publishedDiagnostics[0].diagnostics).toHaveLength(2);
    });
  });

  describe('DiagnosticsPublisher.clear', () => {
    it('should clear diagnostics by publishing empty array', () => {
      const publishedDiagnostics: Array<{ uri: string; diagnostics: LSPDiagnostic[] }> = [];
      const sendDiagnostics = (params: { uri: string; diagnostics: LSPDiagnostic[] }) => {
        publishedDiagnostics.push(params);
      };

      const publisher = createDiagnosticsPublisher(sendDiagnostics);

      publisher.clear('test://uri');

      expect(publishedDiagnostics).toHaveLength(1);
      expect(publishedDiagnostics[0].uri).toBe('test://uri');
      expect(publishedDiagnostics[0].diagnostics).toHaveLength(0);
    });
  });

  describe('convertSeverity', () => {
    it('should convert severity 0 to Error', () => {
      expect(convertSeverity(0)).toBe(LSPDiagnosticSeverity.Error);
    });

    it('should convert severity 1 to Warning', () => {
      expect(convertSeverity(1)).toBe(LSPDiagnosticSeverity.Warning);
    });

    it('should convert severity 2 to Information', () => {
      expect(convertSeverity(2)).toBe(LSPDiagnosticSeverity.Information);
    });

    it('should convert severity 3 to Hint', () => {
      expect(convertSeverity(3)).toBe(LSPDiagnosticSeverity.Hint);
    });

    it('should convert unknown severity to Warning', () => {
      expect(convertSeverity(99)).toBe(LSPDiagnosticSeverity.Warning);
      expect(convertSeverity(-1)).toBe(LSPDiagnosticSeverity.Warning);
    });
  });
});
