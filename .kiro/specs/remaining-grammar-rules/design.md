# 残り文法ルール設計書

## 概要

日本語文法解析システムにおいて、現在未実装の23の高度な文法ルールを実装します。これらのルールは、サ変動詞、主語の欠如、ねじれ文、同音異義語、敬語の誤用、副詞の呼応、修飾語の位置、曖昧な指示語、受身の多用、名詞の連続、接続詞の誤用、送り仮名の揺れ、表記ゆれ、全角半角混在、カタカナ長音、半角カナ、数字表記混在、スペース過不足、括弧不一致、日付表記ゆれ、記号不統一、中黒過不足、全角記号混在を検出し、より包括的な日本語文法チェック機能を提供します。

## アーキテクチャ

### システム構成

```
Grammar Analysis System
├── Core Engine
│   ├── Morphological Analyzer (MeCab)
│   ├── Syntax Parser
│   └── Semantic Analyzer
├── Advanced Rule Engine
│   ├── Sahen Verb Checker
│   ├── Subject Omission Detector
│   ├── Twisted Sentence Analyzer
│   ├── Homophone Validator
│   ├── Honorific Expression Checker
│   ├── Adverb Agreement Validator
│   ├── Modifier Position Analyzer
│   ├── Demonstrative Clarity Checker
│   ├── Passive Voice Monitor
│   ├── Noun Chain Detector
│   ├── Conjunction Usage Validator
│   ├── Okurigana Variant Checker
│   ├── Orthography Variant Detector
│   ├── Number Width Mix Validator
│   ├── Katakana Chouon Checker
│   ├── Halfwidth Kana Detector
│   ├── Numeral Style Mix Validator
│   ├── Space Around Unit Checker
│   ├── Bracket Quote Mismatch Detector
│   ├── Date Format Variant Validator
│   ├── Dash Tilde Normalizer
│   ├── Nakaguro Usage Checker
│   └── Symbol Width Mix Validator
└── Integration Layer
    ├── Rule Coordinator
    ├── Result Aggregator
    └── Suggestion Generator
```

### 処理フロー

1. **前処理**: テキストの形態素解析と構文解析
2. **ルール適用**: 各専門チェッカーによる並列処理
3. **結果統合**: 検出結果の統合と優先度付け
4. **提案生成**: 修正提案の生成と出力

## コンポーネントとインターフェース

### 1. Sahen Verb Checker

```typescript
interface SahenVerbChecker {
  checkSahenConjugation(tokens: Token[]): GrammarIssue[];
  validateSahenUsage(verb: string, context: Context): boolean;
  suggestCorrectForm(incorrectForm: string): string[];
}
```

### 2. Subject Omission Detector

```typescript
interface SubjectOmissionDetector {
  detectMissingSubject(sentence: Sentence): GrammarIssue[];
  analyzeSubjectClarity(context: Context[]): ClarityScore;
  suggestSubjectInsertion(sentence: Sentence): string[];
}
```

### 3. Twisted Sentence Analyzer

```typescript
interface TwistedSentenceAnalyzer {
  detectStructuralTwist(sentence: Sentence): GrammarIssue[];
  analyzeSubjectPredicateAlignment(tokens: Token[]): AlignmentResult;
  suggestStructuralFix(twistedSentence: Sentence): string[];
}
```

### 4. Homophone Validator

```typescript
interface HomophoneValidator {
  detectHomophoneMisuse(tokens: Token[], context: Context): GrammarIssue[];
  validateContextualAppropriatenss(word: string, context: Context): boolean;
  suggestCorrectHomophone(word: string, context: Context): string[];
}
```

### 5. Honorific Expression Checker

```typescript
interface HonorificExpressionChecker {
  detectHonorificMisuse(tokens: Token[]): GrammarIssue[];
  validateHonorificConsistency(sentence: Sentence): boolean;
  classifyHonorificType(expression: string): HonorificType;
  suggestCorrectHonorific(incorrect: string, context: Context): string[];
}
```

### 6. Adverb Agreement Validator

```typescript
interface AdverbAgreementValidator {
  detectAgreementViolation(adverb: Token, sentence: Sentence): GrammarIssue[];
  validateAdverbEndingPair(adverb: string, ending: string): boolean;
  suggestCompatibleEnding(adverb: string): string[];
}
```

### 7. Modifier Position Analyzer

```typescript
interface ModifierPositionAnalyzer {
  detectAmbiguousModification(sentence: Sentence): GrammarIssue[];
  analyzeModifierScope(modifier: Token, sentence: Sentence): ScopeResult;
  suggestClarification(ambiguousSentence: Sentence): string[];
}
```

### 8. Demonstrative Clarity Checker

```typescript
interface DemonstrativeClarityChecker {
  detectAmbiguousDemonstrative(tokens: Token[], context: Context): GrammarIssue[];
  analyzeReferentClarity(demonstrative: Token, context: Context): ClarityScore;
  suggestClarification(demonstrative: Token, context: Context): string[];
}
```

### 9. Passive Voice Monitor

```typescript
interface PassiveVoiceMonitor {
  detectPassiveOveruse(document: Document): GrammarIssue[];
  calculatePassiveRatio(sentences: Sentence[]): number;
  suggestActiveAlternative(passiveSentence: Sentence): string[];
}
```

### 10. Noun Chain Detector

```typescript
interface NounChainDetector {
  detectExcessiveNounChain(tokens: Token[]): GrammarIssue[];
  analyzeNounChainLength(sequence: Token[]): number;
  suggestChainBreaking(nounChain: Token[]): string[];
}
```

### 11. Conjunction Usage Validator

```typescript
interface ConjunctionUsageValidator {
  detectConjunctionMisuse(conjunction: Token, context: Context): GrammarIssue[];
  validateLogicalConsistency(conjunction: string, precedingContext: Context, followingContext: Context): boolean;
  suggestAppropriateConjunction(context: Context): string[];
}
```

### 12. Okurigana Variant Checker

```typescript
interface OkuriganaVariantChecker {
  detectOkuriganaVariant(tokens: Token[]): GrammarIssue[];
  validateStandardOkurigana(word: string, okurigana: string): boolean;
  suggestStandardForm(incorrectForm: string): string[];
}
```

### 13. Orthography Variant Detector

```typescript
interface OrthographyVariantDetector {
  detectOrthographyInconsistency(document: Document): GrammarIssue[];
  analyzeWordVariants(words: string[]): VariantGroup[];
  suggestUnifiedNotation(variants: string[]): string;
}
```

### 14. Number Width Mix Validator

```typescript
interface NumberWidthMixValidator {
  detectNumberWidthMix(tokens: Token[]): GrammarIssue[];
  validateNumberWidthConsistency(numbers: Token[]): boolean;
  suggestUnifiedWidth(mixedNumbers: Token[]): string[];
}
```

### 15. Katakana Chouon Checker

```typescript
interface KatakanaChouonChecker {
  detectChouonError(katakanaWord: string): GrammarIssue[];
  validateChouonUsage(word: string): boolean;
  suggestCorrectChouon(incorrectWord: string): string[];
}
```

### 16. Halfwidth Kana Detector

```typescript
interface HalfwidthKanaDetector {
  detectHalfwidthKana(text: string): GrammarIssue[];
  convertToFullwidth(halfwidthKana: string): string;
  suggestFullwidthAlternative(halfwidthText: string): string[];
}
```

### 17. Numeral Style Mix Validator

```typescript
interface NumeralStyleMixValidator {
  detectNumeralStyleMix(tokens: Token[]): GrammarIssue[];
  validateNumeralConsistency(numerals: Token[]): boolean;
  suggestUnifiedStyle(mixedNumerals: Token[]): string[];
}
```

### 18. Space Around Unit Checker

```typescript
interface SpaceAroundUnitChecker {
  detectSpaceIssue(tokens: Token[]): GrammarIssue[];
  validateSpaceAroundUnit(number: Token, unit: Token): boolean;
  suggestProperSpacing(text: string): string[];
}
```

### 19. Bracket Quote Mismatch Detector

```typescript
interface BracketQuoteMismatchDetector {
  detectMismatch(text: string): GrammarIssue[];
  validateBracketPairs(brackets: BracketPair[]): boolean;
  suggestCorrectPairing(mismatchedText: string): string[];
}
```

### 20. Date Format Variant Validator

```typescript
interface DateFormatVariantValidator {
  detectDateFormatInconsistency(dates: DateExpression[]): GrammarIssue[];
  validateDateFormatConsistency(document: Document): boolean;
  suggestUnifiedDateFormat(variantDates: DateExpression[]): string[];
}
```

### 21. Dash Tilde Normalizer

```typescript
interface DashTildeNormalizer {
  detectSymbolInconsistency(tokens: Token[]): GrammarIssue[];
  validateSymbolUsage(symbol: string, context: Context): boolean;
  suggestNormalizedSymbol(inconsistentSymbol: string): string[];
}
```

### 22. Nakaguro Usage Checker

```typescript
interface NakaguroUsageChecker {
  detectNakaguroIssue(tokens: Token[]): GrammarIssue[];
  validateNakaguroUsage(sequence: Token[]): boolean;
  suggestProperNakaguro(incorrectSequence: Token[]): string[];
}
```

### 23. Symbol Width Mix Validator

```typescript
interface SymbolWidthMixValidator {
  detectSymbolWidthMix(tokens: Token[]): GrammarIssue[];
  validateSymbolWidthConsistency(symbols: Token[]): boolean;
  suggestUnifiedSymbolWidth(mixedSymbols: Token[]): string[];
}
```

## データモデル

### 基本データ構造

```typescript
interface GrammarIssue {
  id: string;
  type: GrammarRuleType;
  severity: Severity;
  position: TextPosition;
  message: string;
  suggestions: string[];
  confidence: number;
}

interface Context {
  precedingSentences: Sentence[];
  currentSentence: Sentence;
  followingSentences: Sentence[];
  documentType: DocumentType;
}

interface Sentence {
  text: string;
  tokens: Token[];
  syntaxTree: SyntaxNode;
  semanticInfo: SemanticInfo;
}

interface Token {
  surface: string;
  partOfSpeech: string;
  features: string[];
  position: TextPosition;
  reading: string;
  baseForm: string;
}
```

### 専門データ構造

```typescript
interface SahenVerbInfo {
  stem: string;
  conjugationType: ConjugationType;
  isCorrect: boolean;
  expectedForm: string;
}

interface HonorificType {
  category: 'respectful' | 'humble' | 'polite';
  level: number;
  appropriateContext: Context[];
}

interface AdverbEndingPair {
  adverb: string;
  compatibleEndings: string[];
  incompatibleEndings: string[];
}

interface VariantGroup {
  baseForm: string;
  variants: string[];
  recommendedForm: string;
}

interface BracketPair {
  opening: string;
  closing: string;
  position: TextPosition;
}

interface DateExpression {
  text: string;
  format: DateFormat;
  position: TextPosition;
}

interface DateFormat {
  era: 'western' | 'japanese';
  separator: string;
  style: 'numeric' | 'kanji';
}
```

## 正確性プロパティ

*プロパティとは、システムのすべての有効な実行において真であるべき特性や動作のことです。これは、人間が読める仕様と機械で検証可能な正確性保証の橋渡しとなる正式な記述です。*

### プロパティ反映

すべてのプロパティを確認した結果、各文法ルールカテゴリに対して独立したプロパティが必要であり、冗長性は見られませんでした。各プロパティは特定の文法現象を対象とし、相互に補完的な役割を果たします。

### プロパティ1: サ変動詞活用検証
*任意の*不適切なサ変動詞活用に対して、システムは検出し適切な活用形を提案する
**検証対象: 要件 1.1**

### プロパティ2: サ変動詞正用非検出
*任意の*正しいサ変動詞活用に対して、システムはエラーを報告しない
**検証対象: 要件 1.2**

### プロパティ3: サ変動詞複合形検証
*任意の*サ変動詞複合形に対して、システムは適切性を正しく検証する
**検証対象: 要件 1.3**

### プロパティ4: 主語欠如検出
*任意の*主語が欠如し文意が不明瞭な文に対して、システムは主語の欠如を検出する
**検証対象: 要件 2.1**

### プロパティ5: 文脈主語推測
*任意の*文脈から主語が明確に推測できる文に対して、システムはエラーを報告しない
**検証対象: 要件 2.2**

### プロパティ6: 主語一貫性検証
*任意の*複数文で主語が曖昧に変化する文書に対して、システムは一貫性の問題を検出する
**検証対象: 要件 2.3**

### プロパティ7: ねじれ文検出
*任意の*主語と述語の対応関係が不適切な文に対して、システムはねじれ文として検出する
**検証対象: 要件 3.1**

### プロパティ8: 複雑修飾構造検出
*任意の*修飾関係が複雑で構造が不明瞭な文に対して、システムは構造の問題を指摘する
**検証対象: 要件 3.2**

### プロパティ9: 文中主語変化検出
*任意の*文の途中で主語が変化し論理的整合性が失われる文に対して、システムは論理エラーを検出する
**検証対象: 要件 3.3**

### プロパティ10: 同音異義語誤用検出
*任意の*文脈に適さない同音異義語使用に対して、システムは誤用を検出し正しい語を提案する
**検証対象: 要件 4.1**

### プロパティ11: 同音異義語正用非検出
*任意の*文脈に適した同音異義語使用に対して、システムはエラーを報告しない
**検証対象: 要件 4.2**

### プロパティ12: 同音異義語曖昧性警告
*任意の*同音異義語の判別が文脈から困難な場合に対して、システムは注意喚起を行う
**検証対象: 要件 4.3**

### プロパティ13: 敬語混同検出
*任意の*尊敬語と謙譲語が混同して使用される文に対して、システムは敬語の誤用を検出する
**検証対象: 要件 5.1**

### プロパティ14: 敬語正用非検出
*任意の*正しい敬語使用に対して、システムはエラーを報告しない
**検証対象: 要件 5.2**

### プロパティ15: 敬語過剰使用検証
*任意の*「させていただく」の過剰使用や不適切な使用に対して、システムは適切性を検証する
**検証対象: 要件 5.3**

### プロパティ16: 副詞呼応エラー検出
*任意の*副詞と文末表現の呼応が不適切な文に対して、システムは呼応エラーを検出する
**検証対象: 要件 6.1**

### プロパティ17: 副詞呼応正用非検出
*任意の*適切な副詞呼応関係に対して、システムはエラーを報告しない
**検証対象: 要件 6.2**

### プロパティ18: 複数副詞競合検証
*任意の*複数の副詞が競合し呼応関係が複雑になる文に対して、システムは整合性を検証する
**検証対象: 要件 6.3**

### プロパティ19: 修飾語曖昧性検出
*任意の*修飾語の位置により複数の解釈が可能になる文に対して、システムは曖昧性を検出する
**検証対象: 要件 7.1**

### プロパティ20: 係り受け曖昧性検出
*任意の*係り受けの曖昧さがある文に対して、システムは構造の問題を指摘する
**検証対象: 要件 7.2**

### プロパティ21: 修飾語適切配置非検出
*任意の*修飾語が適切に配置され意味が明確な文に対して、システムはエラーを報告しない
**検証対象: 要件 7.3**

### プロパティ22: 指示語曖昧性検出
*任意の*指示語の指す対象が不明確な文に対して、システムは曖昧性を検出する
**検証対象: 要件 8.1**

### プロパティ23: 指示語明確性非検出
*任意の*指示語が明確な先行詞を持つ文に対して、システムはエラーを報告しない
**検証対象: 要件 8.2**

### プロパティ24: 指示語対象特定困難警告
*任意の*複数の候補があり指示語の対象が特定困難な文に対して、システムは明確化を促す
**検証対象: 要件 8.3**

### プロパティ25: 受身表現多用検出
*任意の*文章内で受身表現が過度に使用される文書に対して、システムは多用を検出する
**検証対象: 要件 9.1**

### プロパティ26: 受身表現適切使用非検出
*任意の*受身表現が適切に使用され自然な文章に対して、システムはエラーを報告しない
**検証対象: 要件 9.2**

### プロパティ27: 受身表現閾値警告
*任意の*受身表現の使用頻度が設定された閾値を超える文書に対して、システムは警告を発する
**検証対象: 要件 9.3**

### プロパティ28: 名詞連続検出
*任意の*名詞が連続して使用され読みにくくなる文に対して、システムは名詞連続を検出する
**検証対象: 要件 10.1**

### プロパティ29: 複合語適切性非検出
*任意の*複合語として適切な名詞連続に対して、システムはエラーを報告しない
**検証対象: 要件 10.2**

### プロパティ30: 名詞連続長閾値警告
*任意の*名詞の連続が設定された長さを超える文に対して、システムは改善を提案する
**検証対象: 要件 10.3**

### プロパティ31: 接続詞誤用検出
*任意の*文脈に適さない接続詞使用に対して、システムは誤用を検出し適切な接続詞を提案する
**検証対象: 要件 11.1**

### プロパティ32: 接続詞適切使用非検出
*任意の*論理的に適切な接続詞使用に対して、システムはエラーを報告しない
**検証対象: 要件 11.2**

### プロパティ33: 接続詞論理矛盾検出
*任意の*接続詞の使用により論理的矛盾が生じる文に対して、システムは論理エラーを検出する
**検証対象: 要件 11.3**

### プロパティ34: 送り仮名誤り検出
*任意の*動詞や形容詞の送り仮名が標準形と異なる場合に対して、システムは送り仮名の誤りを検出し標準形を提案する
**検証対象: 要件 12.1**

### プロパティ35: 送り仮名標準形非検出
*任意の*標準的な送り仮名使用に対して、システムはエラーを報告しない
**検証対象: 要件 12.2**

### プロパティ36: 補助動詞送り仮名検証
*任意の*補助動詞「いただく」「ください」の送り仮名誤りに対して、システムは適切な表記を提案する
**検証対象: 要件 12.3**

### プロパティ37: 表記不統一検出
*任意の*同一語が漢字とひらがなで混在して使用される文書に対して、システムは表記の不統一を検出する
**検証対象: 要件 13.1**

### プロパティ38: 表記統一非検出
*任意の*表記が統一されている文書に対して、システムはエラーを報告しない
**検証対象: 要件 13.2**

### プロパティ39: 表記複数パターン統一促進
*任意の*文書内で同一語の表記が複数パターン存在する場合に対して、システムは統一を促す
**検証対象: 要件 13.3**

### プロパティ40: 全角半角混在検出
*任意の*同一文書内で数字や記号の全角半角が混在する場合に対して、システムは混在を検出し統一を提案する
**検証対象: 要件 14.1**

### プロパティ41: 全角半角統一非検出
*任意の*数字や記号が一貫して全角または半角で使用される文書に対して、システムはエラーを報告しない
**検証対象: 要件 14.2**

### プロパティ42: 全角半角混在統一提案
*任意の*全角半角混在がある文書に対して、システムは統一された表記を提案する
**検証対象: 要件 14.3**

### プロパティ43: カタカナ長音誤り検出
*任意の*外来語の長音記号が欠落または過剰に使用される場合に対して、システムは長音の誤りを検出する
**検証対象: 要件 15.1**

### プロパティ44: カタカナ長音標準非検出
*任意の*標準的な長音表記使用に対して、システムはエラーを報告しない
**検証対象: 要件 15.2**

### プロパティ45: カタカナ長音誤り提案
*任意の*誤った長音表記に対して、システムは正しい表記を提案する
**検証対象: 要件 15.3**

### プロパティ46: 半角カナ検出
*任意の*和文中の半角カナ使用に対して、システムは半角カナを検出し全角カナへの変換を提案する
**検証対象: 要件 16.1**

### プロパティ47: 全角カナ適切使用非検出
*任意の*全角カナの適切な使用に対して、システムはエラーを報告しない
**検証対象: 要件 16.2**

### プロパティ48: 半角カナ変換提案
*任意の*半角カナに対して、システムは全角カナへの変換を提案する
**検証対象: 要件 16.3**

### プロパティ49: 数字表記混在検出
*任意の*同一文脈での漢数字とアラビア数字の混在に対して、システムは数字表記の不統一を検出する
**検証対象: 要件 17.1**

### プロパティ50: 数字表記統一非検出
*任意の*統一された数字表記使用に対して、システムはエラーを報告しない
**検証対象: 要件 17.2**

### プロパティ51: 数字表記混在統一提案
*任意の*数字表記混在に対して、システムは統一された表記を提案する
**検証対象: 要件 17.3**

### プロパティ52: スペース過不足検出
*任意の*英字と数字、数字と単位の間の不適切なスペースに対して、システムはスペースの過不足を検出する
**検証対象: 要件 18.1**

### プロパティ53: スペース適切使用非検出
*任意の*適切なスペース使用に対して、システムはエラーを報告しない
**検証対象: 要件 18.2**

### プロパティ54: スペース不足提案
*任意の*スペース不足に対して、システムは適切なスペースを提案する
**検証対象: 要件 18.3**

### プロパティ55: 括弧引用符不一致検出
*任意の*開き括弧・引用符と閉じの不対応に対して、システムは括弧・引用符の不一致を検出する
**検証対象: 要件 19.1**

### プロパティ56: 括弧引用符適切対応非検出
*任意の*括弧・引用符の適切な対応に対して、システムはエラーを報告しない
**検証対象: 要件 19.2**

### プロパティ57: 括弧引用符不一致提案
*任意の*括弧・引用符の不一致に対して、システムは正しい対応を提案する
**検証対象: 要件 19.3**

### プロパティ58: 日付表記不統一検出
*任意の*西暦・和暦や区切り記号の不統一に対して、システムは日付表記の不統一を検出する
**検証対象: 要件 20.1**

### プロパティ59: 日付表記一貫性非検出
*任意の*一貫した日付表記使用に対して、システムはエラーを報告しない
**検証対象: 要件 20.2**

### プロパティ60: 日付表記混在統一提案
*任意の*日付表記混在に対して、システムは統一された形式を提案する
**検証対象: 要件 20.3**

### プロパティ61: 記号不統一検出
*任意の*範囲や接続での記号種混在に対して、システムは記号の不統一を検出する
**検証対象: 要件 21.1**

### プロパティ62: 記号統一非検出
*任意の*ハイフン・ダッシュ・チルダの適切な統一に対して、システムはエラーを報告しない
**検証対象: 要件 21.2**

### プロパティ63: 記号混在統一提案
*任意の*記号混在に対して、システムは統一された記号使用を提案する
**検証対象: 要件 21.3**

### プロパティ64: 中黒過不足検出
*任意の*並列表記での中黒「・」の入れ忘れや入れ過ぎに対して、システムは中黒の過不足を検出する
**検証対象: 要件 22.1**

### プロパティ65: 中黒適切使用非検出
*任意の*中黒の適切な使用に対して、システムはエラーを報告しない
**検証対象: 要件 22.2**

### プロパティ66: 中黒過不足提案
*任意の*中黒の過不足に対して、システムは適切な中黒使用を提案する
**検証対象: 要件 22.3**

### プロパティ67: 全角記号混在検出
*任意の*コロン・スラッシュなどの全角と半角の混在に対して、システムは記号の混在を検出する
**検証対象: 要件 23.1**

### プロパティ68: 全角記号統一非検出
*任意の*記号の一貫した全角または半角使用に対して、システムはエラーを報告しない
**検証対象: 要件 23.2**

### プロパティ69: 全角記号混在統一提案
*任意の*全角記号混在に対して、システムは統一された記号使用を提案する
**検証対象: 要件 23.3**

## エラーハンドリング

### エラー分類

1. **解析エラー**: 形態素解析や構文解析の失敗
2. **ルール適用エラー**: 個別ルールチェッカーの処理エラー
3. **統合エラー**: 結果統合時のエラー
4. **リソースエラー**: メモリ不足やタイムアウト

### エラー処理戦略

- **グレースフルデグラデーション**: 一部のルールが失敗しても他のルールは継続実行
- **エラー報告**: 詳細なエラー情報をログに記録
- **フォールバック**: 高度なルールが失敗した場合の基本ルールへの切り替え
- **リトライ機構**: 一時的なエラーに対する再試行

## テスト戦略

### 二重テストアプローチ

システムの正確性を保証するため、単体テストとプロパティベーステストの両方を実装します：

- **単体テスト**: 具体的な例、エッジケース、エラー条件を検証
- **プロパティベーステスト**: すべての入力に対して成り立つべき普遍的プロパティを検証

### 単体テスト

単体テストは以下をカバーします：
- 各ルールチェッカーの基本機能
- 既知の問題パターンに対する検出能力
- エラー条件での適切な動作
- コンポーネント間の統合ポイント

### プロパティベーステスト

- **使用ライブラリ**: fast-check（TypeScript/JavaScript用プロパティベーステストライブラリ）
- **実行回数**: 各プロパティテストは最低30回実行
- **テストタグ**: 各プロパティベーステストには対応する設計書のプロパティ番号をコメントで明記
- **タグ形式**: `**Feature: remaining-grammar-rules, Property {number}: {property_text}**`

プロパティベーステストの要件：
- 各正確性プロパティは単一のプロパティベーステストで実装
- テスト生成器は入力空間を適切に制約
- 実装は既存のライブラリを使用し、独自実装は行わない