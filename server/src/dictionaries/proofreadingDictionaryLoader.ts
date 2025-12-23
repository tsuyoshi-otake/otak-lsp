/**
 * 校正辞書ローダー
 * Feature: proofreading-settings-compat
 * タスク6: 辞書ローダーの実装
 *
 * JSON辞書/単語リスト/ルール辞書を読み込み、カテゴリ別に索引化する
 */

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
}

/**
 * 校正辞書ローダークラス
 */
export class ProofreadingDictionaryLoader {
  /**
   * JSON辞書をパース
   * @param json JSON文字列
   * @returns 辞書エントリのリスト
   */
  parseJsonDictionary(json: string): DictionaryEntry[] {
    try {
      const data = JSON.parse(json);
      if (!Array.isArray(data)) {
        console.warn('Dictionary is not an array');
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
      console.warn('Failed to parse JSON dictionary:', e);
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
        console.warn('Rule dictionary is not an array');
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
      console.warn('Failed to parse rule dictionary:', e);
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
      const fs = await import('fs').then(m => m.promises);
      const content = await fs.readFile(filePath, 'utf-8');
      const entries = this.parseJsonDictionary(content);
      return { success: true, entries };
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.warn(`Failed to load dictionary from ${filePath}:`, errorMessage);
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
      const fs = await import('fs').then(m => m.promises);
      const content = await fs.readFile(filePath, 'utf-8');
      const entries = this.parseSpellDictionary(content);
      return { success: true, entries };
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.warn(`Failed to load spell dictionary from ${filePath}:`, errorMessage);
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
      const fs = await import('fs').then(m => m.promises);
      const content = await fs.readFile(filePath, 'utf-8');
      const entries = this.parseRuleDictionary(content);
      return { success: true, entries };
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.warn(`Failed to load rule dictionary from ${filePath}:`, errorMessage);
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
        allEntries.push(...result.entries);
      }
      // 失敗した場合は警告ログのみ（解析は継続）
    }

    return allEntries;
  }
}
