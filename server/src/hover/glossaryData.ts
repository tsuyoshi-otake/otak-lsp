/**
 * 用語図鑑のデータ定義
 * BASE_GLOSSARIES、GLOSSARIES、DEFAULT_ENABLED_GLOSSARIES、GLOSSARY_INDEXを提供
 */

import { GlossaryId } from '../../../shared/src/types';
import { GlossaryDefinition, GlossaryEntry, GlossaryHit } from './glossaryTypes';
import { normalizeKey } from './glossaryUtils';
import { TERM_NOTATION_DICTIONARIES, TermNotationDictionaryId } from '../dictionaries/termNotationDictionary';
import { GENERATED_GLOSSARY_DATA } from './generatedGlossaryData';

/**
 * otak-lsp設定用語（ja.jsonに含まれないため手動定義を維持）
 */
const OTAK_LSP_SETTINGS_ENTRIES: ReadonlyArray<GlossaryEntry> = [
  { term: 'otakLsp.enableGrammarCheck', aliases: ['enableGrammarCheck', '.enableGrammarCheck'], description: '文法チェック機能の有効/無効。' },
  { term: 'otakLsp.enableSemanticHighlight', aliases: ['enableSemanticHighlight', '.enableSemanticHighlight'], description: '品詞ベースのセマンティックハイライト機能の有効/無効。' },
  { term: 'otakLsp.excludeTableDelimiters', aliases: ['excludeTableDelimiters', '.excludeTableDelimiters'], description: 'Markdownテーブルの区切り記号（|---|）をハイライト対象に含めるかの設定。' },
  { term: 'otakLsp.debounceDelay', aliases: ['debounceDelay'], description: 'テキスト編集後に解析を開始するまでの遅延時間（ミリ秒）。' },
  { term: 'otakLsp.enableProfileLogs', aliases: ['enableProfileLogs'], description: '解析パイプラインの計測ログを出力する設定（開発者向け）。' },
  { term: 'otakLsp.targetLanguages', aliases: ['targetLanguages'], description: '解析対象とする言語IDの一覧。' },
  { term: 'otakLsp.showStatus', aliases: ['showStatus', '.showStatus'], description: '拡張コマンド。言語サーバの状態を表示する。' },
  { term: 'otakLsp.markdown.analyzeTables', description: 'Markdownテーブル内も文法チェック対象にする設定。' },
  { term: 'otakLsp.markdown.analyzeCodeBlocks', description: 'Markdownコードブロック内も文法チェック対象にする設定。' },
  { term: 'otakLsp.hover.enableWikipedia', description: 'ホバーにWikipediaサマリーを表示する設定。' },
  { term: 'otakLsp.hover.enableGlossary', description: 'ホバーに用語図鑑（オフライン）を表示する設定。' },
  { term: 'otakLsp.hover.enabledGlossaries', description: 'ホバーで有効にする用語図鑑カテゴリ（ID）の一覧。' },
  { term: 'otakLsp.advanced.enableStyleConsistency', description: '文体の混在検出（敬体/常体）を有効にする設定。' },
  { term: 'otakLsp.advanced.enableRaNukiDetection', description: 'ら抜き言葉の検出を有効にする設定。' },
  { term: 'otakLsp.advanced.enableDoubleNegation', description: '二重否定の検出を有効にする設定。' },
  { term: 'otakLsp.advanced.enableParticleRepetition', description: '同じ助詞の連続使用検出を有効にする設定。' },
  { term: 'otakLsp.advanced.enableConjunctionRepetition', description: '同じ接続詞の連続使用検出を有効にする設定。' },
  { term: 'otakLsp.advanced.enableAdversativeGa', description: '逆接「が」の連続使用検出を有効にする設定。' },
  { term: 'otakLsp.advanced.enableAlphabetWidth', description: '全角/半角アルファベット混在検出を有効にする設定。' },
  { term: 'otakLsp.advanced.enableWeakExpression', description: '弱い表現の検出を有効にする設定。' },
  { term: 'otakLsp.advanced.enableCommaCount', description: '読点数チェックを有効にする設定。' },
  { term: 'otakLsp.advanced.enableTermNotation', description: '技術用語表記統一チェックを有効にする設定。' },
  { term: 'otakLsp.advanced.enableKanjiOpening', description: '漢字開き（送り仮名/表記）チェックを有効にする設定。' },
  { term: 'otakLsp.advanced.enableRedundantExpression', description: '冗長表現の検出を有効にする設定。' },
  { term: 'otakLsp.advanced.enableTautology', description: '重複表現（同語反復）の検出を有効にする設定。' },
  { term: 'otakLsp.advanced.enableNoParticleChain', description: '助詞「の」連続の検出を有効にする設定。' },
  { term: 'otakLsp.advanced.enableMonotonousEnding', description: '文末表現の単調さ検出を有効にする設定。' },
  { term: 'otakLsp.advanced.enableLongSentence', description: '長文検出を有効にする設定。' },
  { term: 'otakLsp.advanced.enableSentenceEndingColon', description: '文末コロンを検出する設定。' },
  { term: 'otakLsp.advanced.enableWebTechDictionary', description: 'ウェブ技術用語辞典を有効にする設定。' },
  { term: 'otakLsp.advanced.enableGenerativeAIDictionary', description: '生成AI関連用語辞典を有効にする設定。' },
  { term: 'otakLsp.advanced.enableAWSDictionary', description: 'AWS関連用語辞典を有効にする設定。' },
  { term: 'otakLsp.advanced.enableAzureDictionary', description: 'Azure関連用語辞典を有効にする設定。' },
  { term: 'otakLsp.advanced.enableOCIDictionary', description: 'OCI関連用語辞典を有効にする設定。' },
  { term: 'otakLsp.advanced.commaCountThreshold', description: '読点数チェックの警告閾値。' },
  { term: 'otakLsp.advanced.weakExpressionLevel', description: '弱い表現の検出レベル（strict/normal/loose）。' },
  { term: 'otakLsp.advanced.noParticleChainThreshold', description: '助詞「の」連続と判定する閾値。' },
  { term: 'otakLsp.advanced.monotonousEndingThreshold', description: '文末表現の単調さと判定する閾値。' },
  { term: 'otakLsp.advanced.longSentenceThreshold', description: '長文と判定する文字数の閾値。' },
  { term: 'Style Consistency', aliases: ['文体混在'], description: '敬体/常体など文体が混在していないかを検出するルール。' },
  { term: 'Ra-nuki Detection', aliases: ['ら抜き言葉', 'ら抜き'], description: '「食べれる」などのら抜き言葉を検出するルール。' },
  { term: 'Conjunction Repetition', aliases: ['接続詞連続'], description: '同じ接続詞の連続使用（例: 「そして、そして」）を検出するルール。' },
  { term: 'Adversative Ga', aliases: ['逆接が連続', '逆接「が」連続'], description: '逆接の「が」の連続使用（例: 「…だが、…だが」）を検出するルール。' },
];

/**
 * 基本用語図鑑定義（用語表記統一の統合前）
 * 生成データからカテゴリを構築し、otakLspSettings手動定義を維持する
 */
const BASE_GLOSSARIES: ReadonlyArray<GlossaryDefinition> = (() => {
  const result: GlossaryDefinition[] = [];

  // 生成データからカテゴリを構築
  for (const category of GENERATED_GLOSSARY_DATA) {
    result.push({ id: category.id, title: category.title, entries: [...category.entries] });
  }

  // otakLspSettingsは手動定義を維持（ja.jsonに含まれない）
  result.push({
    id: 'otakLspSettings',
    title: 'otak-lsp設定用語図鑑',
    entries: [...OTAK_LSP_SETTINGS_ENTRIES],
  });

  return result;
})();

/**
 * 用語表記統一辞書をBASE_GLOSSARIESに統合
 */
function mergeTermNotationIntoGlossaries(glossaries: ReadonlyArray<GlossaryDefinition>): ReadonlyArray<GlossaryDefinition> {
  type EntryRef = { glossaryIndex: number; entryIndex: number };

  type MutableGlossaryDefinition = {
    id: GlossaryId;
    title: string;
    entries: GlossaryEntry[];
  };

  const targets: Readonly<Record<TermNotationDictionaryId, GlossaryId>> = {
    webTech: 'it',
    generativeAI: 'aiLlm',
    aws: 'awsServices',
    azure: 'azureServices',
    oci: 'ociServices'
  };

  const mergedGlossaries: MutableGlossaryDefinition[] = glossaries.map((glossary) => ({
    id: glossary.id,
    title: glossary.title,
    entries: [...glossary.entries]
  }));

  const refsByTermKey = new Map<string, EntryRef[]>();
  for (let glossaryIndex = 0; glossaryIndex < mergedGlossaries.length; glossaryIndex += 1) {
    const entries = mergedGlossaries[glossaryIndex].entries;
    for (let entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
      const key = normalizeKey(entries[entryIndex].term);
      const bucket = refsByTermKey.get(key) ?? [];
      bucket.push({ glossaryIndex, entryIndex });
      refsByTermKey.set(key, bucket);
    }
  }

  interface TermNotationGroup {
    correct: string;
    kind: TermNotationDictionaryId;
    aliases: Set<string>;
  }

  const groups = new Map<string, TermNotationGroup>();
  for (const [kind, rules] of Object.entries(TERM_NOTATION_DICTIONARIES) as Array<
    [TermNotationDictionaryId, ReadonlyArray<readonly [string, string]>]
  >) {
    for (const [incorrect, correct] of rules) {
      const correctKey = normalizeKey(correct);
      const group = groups.get(correctKey) ?? {
        correct,
        kind,
        aliases: new Set<string>()
      };

      if (normalizeKey(incorrect) !== correctKey) {
        group.aliases.add(incorrect);
      }

      groups.set(correctKey, group);
    }
  }

  const mergeAliases = (
    term: string,
    existing: ReadonlyArray<string> | undefined,
    additions: ReadonlyArray<string>
  ): string[] | undefined => {
    if (additions.length === 0) {
      return existing ? [...existing] : undefined;
    }

    const termKey = normalizeKey(term);
    const base = [...(existing ?? [])];
    const seen = new Set<string>(base.map((v) => normalizeKey(v)));
    const extra: string[] = [];

    for (const value of additions) {
      const key = normalizeKey(value);
      if (!key || key === termKey || seen.has(key)) {
        continue;
      }
      seen.add(key);
      extra.push(value);
    }

    if (extra.length === 0) {
      return existing ? [...existing] : undefined;
    }

    return [...base, ...extra];
  };

  for (const group of groups.values()) {
    const correctKey = normalizeKey(group.correct);
    const refs = refsByTermKey.get(correctKey);

    if (refs && refs.length > 0) {
      if (group.aliases.size === 0) {
        continue;
      }

      const additions = [...group.aliases];
      for (const ref of refs) {
        const glossary = mergedGlossaries[ref.glossaryIndex];
        const entry = glossary.entries[ref.entryIndex];
        const merged = mergeAliases(entry.term, entry.aliases, additions);
        if (merged) {
          glossary.entries[ref.entryIndex] = { ...entry, aliases: merged };
        }
      }
      continue;
    }

    const targetId = targets[group.kind];
    const targetIndex = mergedGlossaries.findIndex((g) => g.id === targetId);
    if (targetIndex === -1) {
      continue;
    }

    const aliases = [...group.aliases];
    const newEntry: GlossaryEntry = {
      term: group.correct,
      aliases: aliases.length > 0 ? aliases : undefined,
      description: `技術用語の推奨表記は「${group.correct}」です。`
    };

    const newGlossary = mergedGlossaries[targetIndex];
    mergedGlossaries[targetIndex] = {
      ...newGlossary,
      entries: [...newGlossary.entries, newEntry]
    };

    refsByTermKey.set(correctKey, [
      { glossaryIndex: targetIndex, entryIndex: mergedGlossaries[targetIndex].entries.length - 1 }
    ]);
  }

  return mergedGlossaries;
}

/**
 * 用語表記統一を統合した最終的な用語図鑑定義
 */
export const GLOSSARIES: ReadonlyArray<GlossaryDefinition> = mergeTermNotationIntoGlossaries(BASE_GLOSSARIES);

/**
 * グループ優先度ベースのデフォルト有効カテゴリ
 */
export const DEFAULT_ENABLED_GLOSSARIES: ReadonlyArray<GlossaryId> = (() => {
  return GLOSSARIES.map((g) => g.id);
})();

/**
 * 用語検索用インデックス（正規化キー → GlossaryHit配列）
 */
export const GLOSSARY_INDEX: ReadonlyMap<string, ReadonlyArray<GlossaryHit>> = (() => {
  const index = new Map<string, GlossaryHit[]>();

  for (const glossary of GLOSSARIES) {
    for (const entry of glossary.entries) {
      const candidates = [entry.term, ...(entry.aliases ?? []), ...(entry.synonyms ?? [])];
      for (const candidate of candidates) {
        const key = normalizeKey(candidate);
        if (!key) {
          continue;
        }

        const bucket = index.get(key) ?? [];
        bucket.push({
          id: glossary.id,
          title: glossary.title,
          term: entry.term,
          description: entry.description,
          aliases: entry.aliases,
          synonyms: entry.synonyms,
          antonyms: entry.antonyms,
        });
        index.set(key, bucket);
      }
    }
  }

  return index;
})();
