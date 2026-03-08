/**
 * テストユーティリティ
 * 
 * テスト全体で共通利用されるヘルパー関数を提供する
 */

import { TextDocument } from 'vscode-languageserver-textdocument';

/**
 * テスト用のTextDocumentを生成
 * 
 * @param uri - ドキュメントURI
 * @param version - ドキュメントバージョン
 * @param text - ドキュメントテキスト
 * @returns TextDocumentインスタンス
 */
export function createMockTextDocument(
  uri: string,
  version: number,
  text: string
): TextDocument {
  return TextDocument.create(uri, 'markdown', version, text);
}

/**
 * テスト用のロガー（何も出力しない）
 */
export const testLogger = {
  debug: (_msg: string) => {},
  info: (_msg: string) => {},
  warn: (_msg: string) => {},
  error: (_msg: string) => {},
};

/**
 * テスト用のロガー（メッセージを配列に記録）
 */
export function createTestLogger(): {
  logger: { debug: (msg: string) => void; info: (msg: string) => void; warn: (msg: string) => void; error: (msg: string) => void };
  messages: { level: string; message: string }[];
} {
  const messages: { level: string; message: string }[] = [];
  
  return {
    logger: {
      debug: (msg: string) => messages.push({ level: 'debug', message: msg }),
      info: (msg: string) => messages.push({ level: 'info', message: msg }),
      warn: (msg: string) => messages.push({ level: 'warn', message: msg }),
      error: (msg: string) => messages.push({ level: 'error', message: msg }),
    },
    messages,
  };
}
