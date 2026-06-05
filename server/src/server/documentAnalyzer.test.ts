/**
 * DocumentAnalyzer Module Tests
 * Feature: main-ts-refactoring
 * TDD: RED -> GREEN -> REFACTOR
 */

import { createDocumentAnalyzer, DocumentAnalyzer, AnalysisResult } from './documentAnalyzer';
import { MeCabAnalyzer } from '../mecab/analyzer';
import { CommentExtractor } from '../parser/commentExtractor';
import { MarkdownFilter } from '../parser/markdownFilter';
import { TokenFilter } from '../semantic/tokenFilter';
import { GrammarChecker } from '../grammar/checker';
import { AdvancedRulesManager } from '../grammar/advancedRulesManager';
import { ProofreadingRulesManager } from '../proofreading/proofreadingRulesManager';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Configuration, SupportedLanguage, GLOSSARY_GROUPS } from '../../../shared/src/types';
import { DEFAULT_ADVANCED_RULES_CONFIG } from '../../../shared/src/advancedTypes';
import { DEFAULT_ENABLED_GLOSSARIES } from '../hover/glossary';
import { createLogger } from '../utils/logger';

describe('documentAnalyzer', () => {
  let mecabAnalyzer: MeCabAnalyzer;
  let commentExtractor: CommentExtractor;
  let markdownFilter: MarkdownFilter;
  let tokenFilter: TokenFilter;
  let grammarChecker: GrammarChecker;
  let advancedRulesManager: AdvancedRulesManager;
  let proofreadingRulesManager: ProofreadingRulesManager;
  let documentAnalyzer: DocumentAnalyzer;
  const logs: string[] = [];

  // Default configuration for tests
  const defaultConfig: Configuration = {
    enableGrammarCheck: true,
    enableSemanticHighlight: true,
    excludeTableDelimiters: true,
    enableProfileLogs: false,
    markdown: {
      analyzeCodeBlocks: true,
      analyzeTables: true,
    },
    targetLanguages: ['markdown', 'plaintext', 'javascript', 'typescript'] as SupportedLanguage[],
    debounceDelay: 250,
    hover: {
      enableWikipedia: true,
      enableGlossary: true,
      enabledGlossaries: [...DEFAULT_ENABLED_GLOSSARIES],
      enabledGlossaryGroups: GLOSSARY_GROUPS.map(g => g.id),
    },
  };

  beforeEach(async () => {
    logs.length = 0;
    mecabAnalyzer = new MeCabAnalyzer();
    commentExtractor = new CommentExtractor();
    markdownFilter = new MarkdownFilter();
    tokenFilter = new TokenFilter();
    grammarChecker = new GrammarChecker();
    advancedRulesManager = new AdvancedRulesManager();
    proofreadingRulesManager = new ProofreadingRulesManager();

    documentAnalyzer = createDocumentAnalyzer(
      mecabAnalyzer,
      commentExtractor,
      markdownFilter,
      tokenFilter,
      grammarChecker,
      advancedRulesManager,
      proofreadingRulesManager,
      createLogger((msg: string) => logs.push(msg), true)
    );
  });

  describe('createDocumentAnalyzer', () => {
    it('should create a document analyzer instance', () => {
      expect(documentAnalyzer).toBeDefined();
      expect(typeof documentAnalyzer.analyze).toBe('function');
    });
  });

  describe('DocumentAnalyzer.analyze', () => {
    it('should analyze a simple Japanese text', async () => {
      const document = TextDocument.create(
        'test://uri',
        'plaintext',
        1,
        'これはテストです。'
      );

      const result = await documentAnalyzer.analyze(
        document,
        defaultConfig,
        DEFAULT_ADVANCED_RULES_CONFIG,
        false
      );

      expect(result).toBeDefined();
      expect(result.tokens).toBeDefined();
      expect(result.tokens.length).toBeGreaterThan(0);
      expect(result.diagnostics).toBeDefined();
      expect(result.excludedRanges).toBeDefined();
      expect(result.lineStarts).toBeDefined();
    }, 10000);

    it('should return empty result for unsupported language', async () => {
      const document = TextDocument.create(
        'test://uri',
        'unsupported' as any,
        1,
        'This is a test.'
      );

      const config = { ...defaultConfig, targetLanguages: ['markdown'] as SupportedLanguage[] };

      const result = await documentAnalyzer.analyze(
        document,
        config,
        DEFAULT_ADVANCED_RULES_CONFIG,
        false
      );

      expect(result.tokens).toHaveLength(0);
      expect(result.diagnostics).toHaveLength(0);
    }, 10000);

    it('should return empty result for empty text', async () => {
      const document = TextDocument.create(
        'test://uri',
        'plaintext',
        1,
        '   '
      );

      const result = await documentAnalyzer.analyze(
        document,
        defaultConfig,
        DEFAULT_ADVANCED_RULES_CONFIG,
        false
      );

      expect(result.tokens).toHaveLength(0);
    }, 10000);

    it('should detect grammar errors', async () => {
      // Text with double particle error
      const document = TextDocument.create(
        'test://uri',
        'plaintext',
        1,
        '私はは学校に行く。'
      );

      const result = await documentAnalyzer.analyze(
        document,
        defaultConfig,
        DEFAULT_ADVANCED_RULES_CONFIG,
        false
      );

      expect(result.diagnostics.length).toBeGreaterThan(0);
    }, 10000);

    it('should handle markdown documents with code blocks', async () => {
      const document = TextDocument.create(
        'test://uri',
        'markdown',
        1,
        '# タイトル\n\nこれはテストです。\n\n```javascript\nconst x = 1;\n```\n'
      );

      const result = await documentAnalyzer.analyze(
        document,
        defaultConfig,
        DEFAULT_ADVANCED_RULES_CONFIG,
        false
      );

      expect(result).toBeDefined();
      expect(result.excludedRanges.length).toBeGreaterThan(0);
    }, 10000);

    it('should extract comments from code files', async () => {
      const document = TextDocument.create(
        'test://uri',
        'javascript',
        1,
        '// これはコメントです\nconst x = 1;'
      );

      const result = await documentAnalyzer.analyze(
        document,
        defaultConfig,
        DEFAULT_ADVANCED_RULES_CONFIG,
        false
      );

      expect(result.tokens.length).toBeGreaterThan(0);
    }, 10000);

    it('should preserve original offsets for tokens extracted from code comments', async () => {
      const text = 'const x = 1;\n// これはコメントです\nconst y = 2;';
      const document = TextDocument.create(
        'test://uri',
        'javascript',
        1,
        text
      );

      const result = await documentAnalyzer.analyze(
        document,
        defaultConfig,
        DEFAULT_ADVANCED_RULES_CONFIG,
        false
      );

      const commentStart = text.indexOf('//');
      const commentEnd = text.indexOf('\n', commentStart);
      const commentTokens = result.tokens.filter(token => token.start >= commentStart && token.end <= commentEnd);

      expect(commentTokens.length).toBeGreaterThan(0);
      expect(commentTokens.some(token => token.surface === 'コメント')).toBe(true);
      for (const token of commentTokens) {
        expect(text.slice(token.start, token.end)).toBe(token.surface);
      }
      expect(result.tokens.every(token => text.slice(token.start, token.end) === token.surface)).toBe(true);
      expect(result.tokens.some(token => token.surface === 'const')).toBe(false);
    }, 10000);

    it('should run lightweight rules only when lightweightOnly is true', async () => {
      const document = TextDocument.create(
        'test://uri',
        'plaintext',
        1,
        'これはテストです。'
      );

      const lightweightResult = await documentAnalyzer.analyze(
        document,
        defaultConfig,
        DEFAULT_ADVANCED_RULES_CONFIG,
        true // lightweightOnly
      );

      const fullResult = await documentAnalyzer.analyze(
        document,
        defaultConfig,
        DEFAULT_ADVANCED_RULES_CONFIG,
        false // full analysis
      );

      // Both should return results (may be same or different depending on content)
      expect(lightweightResult).toBeDefined();
      expect(fullResult).toBeDefined();
    }, 15000);

    it('should compute line starts correctly', async () => {
      const document = TextDocument.create(
        'test://uri',
        'plaintext',
        1,
        '行1\n行2\n行3'
      );

      const result = await documentAnalyzer.analyze(
        document,
        defaultConfig,
        DEFAULT_ADVANCED_RULES_CONFIG,
        false
      );

      // "行1\n行2\n行3" - each line is 3 chars including \n
      // Line 1: starts at 0
      // Line 2: starts at 3 (after "行1\n")
      // Line 3: starts at 6 (after "行2\n")
      expect(result.lineStarts).toEqual([0, 3, 6]);
    }, 10000);
  });

  describe('AnalysisResult interface', () => {
    it('should have all required properties', async () => {
      const document = TextDocument.create(
        'test://uri',
        'plaintext',
        1,
        'テスト'
      );

      const result: AnalysisResult = await documentAnalyzer.analyze(
        document,
        defaultConfig,
        DEFAULT_ADVANCED_RULES_CONFIG,
        false
      );

      expect('tokens' in result).toBe(true);
      expect('diagnostics' in result).toBe(true);
      expect('excludedRanges' in result).toBe(true);
      expect('lineStarts' in result).toBe(true);
    }, 10000);
  });
});
