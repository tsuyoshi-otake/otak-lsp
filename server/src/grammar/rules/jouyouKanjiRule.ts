/**
 * JouyouKanji Rule
 * 常用漢字表にない漢字を検出する
 * Feature: official-document-rules
 * 要件: 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { Token, DiagnosticSeverity } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic
} from '../../../../shared/src/advancedTypes';
import {
  isJouyouKanji,
  isKanji,
  getAlternative,
  NonJouyouAlternative
} from '../../../../shared/src/jouyouKanjiData';

/**
 * 常用漢字外の漢字検出結果
 */
interface NonJouyouKanjiMatch {
  kanji: string;
  position: number;
  isProperNoun: boolean;
  suggestion?: NonJouyouAlternative;
}

/**
 * 固有名詞を判定するための品詞パターン
 */
const PROPER_NOUN_POS_PATTERNS = [
  '固有名詞',
  '人名',
  '地名',
  '組織'
];


/**
 * 常用漢字表にない漢字を検出するルール
 *
 * 根拠: 常用漢字表（平成22年内閣告示第2号）
 * - 2136字の常用漢字を基準
 * - 固有名詞は除外オプションあり
 *
 * 公文書では常用漢字表にない漢字の使用を避け、
 * ひらがな表記または代替漢字を使用することが推奨される。
 */
export class JouyouKanjiRule implements AdvancedGrammarRule {
  name = 'jouyou-kanji';
  description = '常用漢字表にない漢字を検出します';

  /**
   * トークンが固有名詞かどうかを判定
   */
  isProperNoun(token: Token): boolean {
    const pos = token.pos || '';
    const posDetail = token.posDetail1 || '';
    
    // 品詞または品詞詳細に固有名詞パターンが含まれるかチェック
    return PROPER_NOUN_POS_PATTERNS.some(pattern => 
      pos.includes(pattern) || posDetail.includes(pattern)
    );
  }

  /**
   * テキスト中の常用漢字外の漢字を検出
   */
  findNonJouyouKanji(
    text: string,
    tokens: Token[],
    excludeProperNouns: boolean
  ): NonJouyouKanjiMatch[] {
    const matches: NonJouyouKanjiMatch[] = [];
    
    // トークンごとに処理
    for (const token of tokens) {
      const surface = token.surface || '';
      const tokenStart = token.start;
      
      // 固有名詞除外オプションが有効で、トークンが固有名詞の場合はスキップ
      const isTokenProperNoun = this.isProperNoun(token);
      if (excludeProperNouns && isTokenProperNoun) {
        continue;
      }
      
      // トークン内の各文字をチェック
      for (let i = 0; i < surface.length; i++) {
        const char = surface[i];
        
        // 漢字かどうかをチェック
        if (!isKanji(char)) {
          continue;
        }
        
        // 常用漢字かどうかをチェック
        if (isJouyouKanji(char)) {
          continue;
        }
        
        // 常用漢字外の漢字を検出
        const position = tokenStart + i;
        const suggestion = getAlternative(char);
        
        matches.push({
          kanji: char,
          position,
          isProperNoun: isTokenProperNoun,
          suggestion
        });
      }
    }
    
    return matches;
  }


  /**
   * 診断メッセージを生成
   */
  createDiagnosticMessage(match: NonJouyouKanjiMatch): string {
    const { kanji, suggestion } = match;
    
    let message = `「${kanji}」は常用漢字表にありません。`;
    
    if (suggestion) {
      if (suggestion.alternative) {
        message += `「${suggestion.alternative}」または「${suggestion.hiragana}」への書き換えを検討してください。`;
      } else {
        message += `「${suggestion.hiragana}」への書き換えを検討してください。`;
      }
    } else {
      message += 'ひらがな表記への書き換えを検討してください。';
    }
    
    message += '（根拠: 常用漢字表 平成22年内閣告示第2号）';
    
    return message;
  }

  /**
   * 修正提案を生成
   */
  createSuggestions(match: NonJouyouKanjiMatch): string[] {
    const suggestions: string[] = [];
    const { suggestion } = match;
    
    if (suggestion) {
      if (suggestion.alternative) {
        suggestions.push(`「${suggestion.alternative}」に変更する`);
      }
      suggestions.push(`「${suggestion.hiragana}」に変更する`);
    } else {
      suggestions.push('ひらがな表記に変更する');
    }
    
    return suggestions;
  }

  /**
   * 文法チェックを実行
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const excludeProperNouns = context.config.excludeProperNounsFromJouyouKanji;
    
    // 常用漢字外の漢字を検出
    const matches = this.findNonJouyouKanji(
      context.documentText,
      tokens,
      excludeProperNouns
    );
    
    // 各検出結果に対して診断を生成
    for (const match of matches) {
      const message = this.createDiagnosticMessage(match);
      const suggestions = this.createSuggestions(match);
      
      diagnostics.push(new AdvancedDiagnostic({
        range: {
          start: { line: 0, character: match.position },
          end: { line: 0, character: match.position + 1 }
        },
        message,
        code: 'jouyou-kanji',
        ruleName: this.name,
        suggestions,
        severity: DiagnosticSeverity.Information
      }));
    }
    
    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableJouyouKanji;
  }
}
