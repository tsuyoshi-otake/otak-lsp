/**
 * 校正辞書ローダー
 * Feature: proofreading-settings-compat
 * タスク6: 辞書ローダーの実装
 *
 * JSON辞書/単語リスト/ルール辞書を読み込み、カテゴリ別に索引化する
 */

import { Logger } from '../utils/logger';
import { logWarning, formatError } from '../utils/errorHandler';

// 設定から指定される各辞書の読込上限。超過時は途中の結果を採用しない。
const MAX_DICTIONARY_BYTES = 2 * 1024 * 1024;

async function readDictionaryFile(filePath: string): Promise<string> {
  const fs = await import('fs').then(m => m.promises);
  const file = await fs.open(filePath, 'r');
  try {
    const stat = await file.stat();
    if (!stat.isFile()) throw new Error('Dictionary path is not a regular file');
    if (stat.size > MAX_DICTIONARY_BYTES) throw new Error(`Dictionary exceeds ${MAX_DICTIONARY_BYTES} bytes`);

    // stat後のファイル変更も考慮し、上限+1バイト以上は読まない。
    const buffer = Buffer.allocUnsafe(MAX_DICTIONARY_BYTES + 1);
    let total = 0;
    while (total < buffer.length) {
      const { bytesRead } = await file.read(buffer, total, buffer.length - total, null);
      if (bytesRead === 0) break;
      total += bytesRead;
    }
    if (total > MAX_DICTIONARY_BYTES) throw new Error(`Dictionary exceeds ${MAX_DICTIONARY_BYTES} bytes`);
    return buffer.toString('utf8', 0, total);
  } finally {
    await file.close();
  }
}

function jsonArrayLength(content: string): number {
  const data: unknown = JSON.parse(content);
  if (!Array.isArray(data)) throw new Error('Dictionary JSON must be an array');
  return data.length;
}

/**
 * 辞書エントリ
 */
export interface DictionaryEntry {
  /** カテゴリ（typo, term, etc.） */
  category: string;
  /** 検出文字列 */
  match: string;
  /** 修正案（省略可） */
  replace?: string;
  /** メッセージ（省略可） */
  message?: string;
  /** 検出モード */
  mode: 'exact' | 'regex';
  /** ルール辞書が指定する重要度。校正用辞書は従来どおり情報。 */
  severity?: 'info' | 'warn';
}

/**
 * ルール辞書エントリ
 */
export interface RuleDictionaryEntry {
  /** 正規表現パターン */
  pattern: string;
  /** メッセージ */
  message: string;
  /** 重要度 */
  severity: 'info' | 'warn';
}

/**
 * スペル辞書エントリ
 */
export interface SpellDictionaryEntry {
  /** 単語 */
  word: string;
}

/**
 * 辞書読み込み結果
 */
export interface DictionaryLoadResult<T> {
  /** 成功したかどうか */
  success: boolean;
  /** エントリ */
  entries: T[];
  /** エラーメッセージ */
  error?: string;
  /** 必須フィールドの形式が不正で読み飛ばした項目数 */
  invalidEntries?: number;
}

/**
 * 校正辞書ローダークラス
 */
export class ProofreadingDictionaryLoader {
  private logger: Logger | undefined;

  constructor(logger?: Logger) {
    this.logger = logger;
  }

  /**
   * JSON辞書をパース
   * @param json JSON文字列
   * @returns 辞書エントリのリスト
   */
  parseJsonDictionary(json: string): DictionaryEntry[] {
    try {
      const data = JSON.parse(json);
      if (!Array.isArray(data)) {
        logWarning(this.logger, 'Dictionary is not an array', 'Invalid dictionary format');
        return [];
      }

      const entries: DictionaryEntry[] = [];
      for (const item of data) {
        if (!item || typeof item !== 'object') {
          continue;
        }

        if (typeof item.match !== 'string') {
          continue;
        }

        entries.push({
          category: typeof item.category === 'string' ? item.category : 'default',
          match: item.match,
          replace: typeof item.replace === 'string' ? item.replace : undefined,
          message: typeof item.message === 'string' ? item.message : undefined,
          mode: item.mode === 'regex' ? 'regex' : 'exact'
        });
      }

      return entries;
    } catch (e) {
      logWarning(this.logger, 'Failed to parse JSON dictionary', e);
      return [];
    }
  }

  /**
   * スペル辞書（単語リスト）をパース
   * @param content テキスト内容（1行1単語）
   * @returns スペル辞書エントリのリスト
   */
  parseSpellDictionary(content: string): SpellDictionaryEntry[] {
    const lines = content.split(/\r?\n/);
    const entries: SpellDictionaryEntry[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // 空行とコメント行を無視
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      entries.push({ word: trimmed });
    }

    return entries;
  }

  /**
   * ルール辞書をパース
   * @param json JSON文字列
   * @returns ルール辞書エントリのリスト
   */
  parseRuleDictionary(json: string): RuleDictionaryEntry[] {
    try {
      const data = JSON.parse(json);
      if (!Array.isArray(data)) {
        logWarning(this.logger, 'Rule dictionary is not an array', 'Invalid dictionary format');
        return [];
      }

      const entries: RuleDictionaryEntry[] = [];
      for (const item of data) {
        if (!item || typeof item !== 'object') {
          continue;
        }

        if (typeof item.pattern !== 'string' || typeof item.message !== 'string') {
          continue;
        }

        entries.push({
          pattern: item.pattern,
          message: item.message,
          severity: item.severity === 'info' ? 'info' : 'warn'
        });
      }

      return entries;
    } catch (e) {
      logWarning(this.logger, 'Failed to parse rule dictionary', e);
      return [];
    }
  }

  /**
   * カテゴリ別に索引化
   * @param entries 辞書エントリのリスト
   * @returns カテゴリ別のマップ
   */
  indexByCategory(entries: DictionaryEntry[]): Map<string, DictionaryEntry[]> {
    const indexed = new Map<string, DictionaryEntry[]>();

    for (const entry of entries) {
      const existing = indexed.get(entry.category);
      if (existing) {
        existing.push(entry);
      } else {
        indexed.set(entry.category, [entry]);
      }
    }

    return indexed;
  }

  /**
   * ファイルからJSON辞書を読み込み
   * @param filePath ファイルパス
   * @returns 読み込み結果
   */
  async loadJsonDictionary(filePath: string): Promise<DictionaryLoadResult<DictionaryEntry>> {
    try {
      const content = await readDictionaryFile(filePath);
      const total = jsonArrayLength(content);
      const entries = this.parseJsonDictionary(content);
      return { success: true, entries, invalidEntries: total - entries.length };
    } catch (e) {
      const errorMessage = formatError(e);
      logWarning(this.logger, `Failed to load dictionary from ${filePath}`, e);
      return { success: false, entries: [], error: errorMessage };
    }
  }

  /**
   * ファイルからスペル辞書を読み込み
   * @param filePath ファイルパス
   * @returns 読み込み結果
   */
  async loadSpellDictionary(filePath: string): Promise<DictionaryLoadResult<SpellDictionaryEntry>> {
    try {
      const content = await readDictionaryFile(filePath);
      const entries = this.parseSpellDictionary(content);
      return { success: true, entries };
    } catch (e) {
      const errorMessage = formatError(e);
      logWarning(this.logger, `Failed to load spell dictionary from ${filePath}`, e);
      return { success: false, entries: [], error: errorMessage };
    }
  }

  /**
   * ファイルからルール辞書を読み込み
   * @param filePath ファイルパス
   * @returns 読み込み結果
   */
  async loadRuleDictionary(filePath: string): Promise<DictionaryLoadResult<RuleDictionaryEntry>> {
    try {
      const content = await readDictionaryFile(filePath);
      const total = jsonArrayLength(content);
      const entries = this.parseRuleDictionary(content);
      return { success: true, entries, invalidEntries: total - entries.length };
    } catch (e) {
      const errorMessage = formatError(e);
      logWarning(this.logger, `Failed to load rule dictionary from ${filePath}`, e);
      return { success: false, entries: [], error: errorMessage };
    }
  }

  /**
   * 複数の辞書ファイルを読み込んでマージ
   * @param filePaths ファイルパスのリスト
   * @returns マージされた辞書エントリ
   */
  async loadAndMergeDictionaries(filePaths: string[]): Promise<DictionaryEntry[]> {
    const allEntries: DictionaryEntry[] = [];

    for (const filePath of filePaths) {
      const result = await this.loadJsonDictionary(filePath);
      if (result.success) {
        for (const entry of result.entries) allEntries.push(entry);
      }
      // 失敗した場合は警告ログのみ（解析は継続）
    }

    return allEntries;
  }
}
