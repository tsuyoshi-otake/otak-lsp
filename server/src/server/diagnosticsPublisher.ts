/**
 * DiagnosticsPublisher Module
 * Feature: main-ts-refactoring
 * Requirements: 1.1, 1.2, 2.5, 4.5
 *
 * 診断結果のLSPクライアントへの送信を担当
 */

import { DiagnosticSeverity as LSPDiagnosticSeverity, Diagnostic as LSPDiagnostic } from 'vscode-languageserver/node';

/**
 * DiagnosticsPublisherインターフェース
 */
export interface DiagnosticsPublisher {
  /**
   * 診断結果を送信
   */
  publish(uri: string, diagnostics: LSPDiagnostic[]): void;

  /**
   * 診断結果をクリア
   */
  clear(uri: string): void;
}

/**
 * 診断重大度を変換
 */
export function convertSeverity(severity: number): LSPDiagnosticSeverity {
  switch (severity) {
    case 0:
      return LSPDiagnosticSeverity.Error;
    case 1:
      return LSPDiagnosticSeverity.Warning;
    case 2:
      return LSPDiagnosticSeverity.Information;
    case 3:
      return LSPDiagnosticSeverity.Hint;
    default:
      return LSPDiagnosticSeverity.Warning;
  }
}

/**
 * DiagnosticsPublisherを作成
 *
 * @param sendDiagnostics 診断情報送信関数（connection.sendDiagnostics）
 */
export function createDiagnosticsPublisher(
  sendDiagnostics: (params: { uri: string; diagnostics: LSPDiagnostic[] }) => void
): DiagnosticsPublisher {
  return {
    publish(uri: string, diagnostics: LSPDiagnostic[]): void {
      sendDiagnostics({ uri, diagnostics });
    },

    clear(uri: string): void {
      sendDiagnostics({ uri, diagnostics: [] });
    },
  };
}
