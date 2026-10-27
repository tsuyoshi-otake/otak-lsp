import * as path from 'path';
import { fileURLToPath } from 'url';
import { Diagnostic } from '../../../shared/src/types';
import { Logger } from '../utils/logger';
import { ConcurrencyLimiter } from '../utils/concurrencyLimiter';
import { SpellCheckConfig } from '../proofreading/proofreadingTypes';
import { DictionaryExecutor } from './dictionaryExecutor';
import { DictionaryEntry, DictionaryLoadResult, ProofreadingDictionaryLoader, SpellDictionaryEntry } from './proofreadingDictionaryLoader';

const loaderLimiter = new ConcurrencyLimiter(() => 2);
type DictionaryKind = 'proofreading' | 'rule';

/** 辞書は文書ごとの設定で選び、実行中の同じファイル読込だけ共有する。 */
export class ProofreadingDictionaryService {
  private readonly loader: ProofreadingDictionaryLoader;
  private readonly loading = new Map<string, Promise<DictionaryLoadResult<DictionaryEntry>>>();
  private readonly loadingSpell = new Map<string, Promise<DictionaryLoadResult<SpellDictionaryEntry>>>();

  constructor(private readonly executor: DictionaryExecutor, logger?: Logger) {
    this.loader = new ProofreadingDictionaryLoader(logger);
  }

  private load(file: string, kind: DictionaryKind): Promise<DictionaryLoadResult<DictionaryEntry>> {
    const key = `${kind}\0${file}`;
    const existing = this.loading.get(key);
    if (existing) return existing;
    const loading = loaderLimiter.run(async () => {
      if (kind === 'proofreading') return this.loader.loadJsonDictionary(file);
      const result = await this.loader.loadRuleDictionary(file);
      return { ...result, entries: result.entries.map(entry => ({
        category: 'rule', match: entry.pattern, message: entry.message, severity: entry.severity, mode: 'regex' as const,
      })) };
    });
    this.loading.set(key, loading);
    const clear = () => { if (this.loading.get(key) === loading) this.loading.delete(key); };
    void loading.then(clear, clear);
    return loading;
  }

  private loadSpell(file: string): Promise<DictionaryLoadResult<SpellDictionaryEntry>> {
    const existing = this.loadingSpell.get(file);
    if (existing) return existing;
    const loading = loaderLimiter.run(() => this.loader.loadSpellDictionary(file));
    this.loadingSpell.set(file, loading);
    const clear = () => { if (this.loadingSpell.get(file) === loading) this.loadingSpell.delete(file); };
    void loading.then(clear, clear);
    return loading;
  }

  async checkSpell(text: string, uri: string, files: string[], excludedRanges: Array<{ start: number; end: number }>, options: Pick<SpellCheckConfig, 'checkRepeat' | 'checkUppercase' | 'checkAllCaps'>): Promise<{
    diagnostics: Diagnostic[]; errors: string[]; truncated: boolean;
  }> {
    const errors: string[] = [];
    if (files.length > 3) errors.push('スペル辞書は3件までです。超過分を読み込んでいません。');
    const paths = new Set<string>();
    for (const file of files.slice(0, 3)) {
      try {
        if (!file.trim()) throw new Error('空のパス');
        paths.add(path.isAbsolute(file) ? file : path.resolve(path.dirname(fileURLToPath(uri)), file));
      } catch (error) {
        errors.push(`スペル辞書のパスを解決できません: ${file} (${error instanceof Error ? error.message : String(error)})`);
      }
    }
    const words = new Set<string>();
    for (const file of paths) {
      const result = await this.loadSpell(file);
      if (result.success) for (const entry of result.entries) words.add(entry.word);
      else errors.push(`スペル辞書を読み込めません: ${file} (${result.error ?? '不明なエラー'})`);
    }
    try {
      const result = await this.executor.runSpell({ kind: 'spell', text, words: [...words], excludedRanges,
        checkRepeat: options.checkRepeat, checkUppercase: options.checkUppercase, checkAllCaps: options.checkAllCaps });
      return { ...result, errors };
    } catch (error) {
      errors.push(`スペル検査に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
      return { diagnostics: [], errors, truncated: false };
    }
  }

  async check(text: string, uri: string, files: string[], checkInBrackets: boolean, excludedRanges: Array<{ start: number; end: number }> = [], kind: DictionaryKind = 'proofreading'): Promise<{
    diagnostics: Diagnostic[]; errors: string[]; truncated: boolean;
  }> {
    const errors: string[] = [];
    const label = kind === 'rule' ? 'ルール辞書' : '校正用辞書';
    const maxFiles = kind === 'rule' ? 3 : 5;
    if (files.length > maxFiles) errors.push(`${label}は${maxFiles}件までです。超過分を読み込んでいません。`);
    const paths = new Set<string>();
    for (const file of files.slice(0, maxFiles)) {
      try {
        if (!file.trim()) throw new Error('空のパス');
        const resolved = path.isAbsolute(file) ? file : path.resolve(path.dirname(fileURLToPath(uri)), file);
        paths.add(resolved);
      } catch (error) {
        errors.push(`${label}のパスを解決できません: ${file} (${error instanceof Error ? error.message : String(error)})`);
      }
    }
    const entries: DictionaryEntry[] = [];
    for (const file of paths) {
      const result = await this.load(file, kind);
      if (result.success) {
        for (const entry of result.entries) entries.push(entry);
        if (result.invalidEntries) errors.push(`${label}の形式が不正な項目を${result.invalidEntries}件読み飛ばしました: ${file}`);
      } else errors.push(`${label}を読み込めません: ${file} (${result.error ?? '不明なエラー'})`);
    }
    if (entries.length === 0) return { diagnostics: [], errors, truncated: false };
    try {
      const result = await this.executor.run({ text, entries, checkInBrackets, excludedRanges });
      if (result.invalidPatterns > 0) errors.push(`${label}の空のパターンまたは不正な正規表現を${result.invalidPatterns}件読み飛ばしました。`);
      return {
        diagnostics: result.diagnostics.map(diagnostic => ({ ...diagnostic, source: 'otak-lsp-proofreading' })),
        truncated: result.truncated,
        errors,
      };
    } catch (error) {
      errors.push(`${label}の検査に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
      return { diagnostics: [], errors, truncated: false };
    }
  }
}
