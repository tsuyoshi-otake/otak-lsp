/**
 * Language Server Entry Point
 * otak-lsp - Japanese Grammar Analyzer
 * Feature: main-ts-refactoring
 *
 * このファイルはエントリーポイントとして、コンポーネントの初期化と接続のみを行う
 */

import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { MeCabAnalyzer } from './mecab/analyzer';
import { CommentExtractor } from './parser/commentExtractor';
import { MarkdownFilter } from './parser/markdownFilter';
import { GrammarChecker } from './grammar/checker';
import { AdvancedRulesManager } from './grammar/advancedRulesManager';
import { ProofreadingRulesManager } from './proofreading/proofreadingRulesManager';
import { SemanticTokenProvider } from './semantic/tokenProvider';
import { TokenFilter } from './semantic/tokenFilter';
import { HoverProvider } from './hover/provider';
import { WikipediaClient } from './wikipedia/client';
import { AnalysisStateManager } from './server/languageServer';
import { createConfigManager } from './server/configManager';
import { createDiagnosticsPublisher } from './server/diagnosticsPublisher';
import { createDocumentAnalyzer } from './server/documentAnalyzer';
import { createAnalysisScheduler } from './server/analysisScheduler';
import { createConnectionHandler } from './server/connection';

// Create connection
const connection = createConnection(ProposedFeatures.all);

// Create document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Initialize components
const mecabAnalyzer = new MeCabAnalyzer();
const commentExtractor = new CommentExtractor();
const markdownFilter = new MarkdownFilter();
const tokenFilter = new TokenFilter();
const grammarChecker = new GrammarChecker();
const advancedRulesManager = new AdvancedRulesManager();
const proofreadingRulesManager = new ProofreadingRulesManager();
const semanticTokenProvider = new SemanticTokenProvider();
const wikipediaClient = new WikipediaClient();
const hoverProvider = new HoverProvider(wikipediaClient);

// Analysis state management
const analysisStates = new AnalysisStateManager();

// Debug logs
const DEBUG_LOGS = process.env.OTAK_LCP_DEBUG === '1';
if (DEBUG_LOGS) {
  analysisStates.setDebugLogCallback((message: string) => {
    connection.console.log(`[DEBUG] ${message}`);
  });
}

// Create managers
const configManager = createConfigManager(
  advancedRulesManager,
  proofreadingRulesManager,
  hoverProvider,
  DEBUG_LOGS ? (msg) => connection.console.log(msg) : undefined
);

const diagnosticsPublisher = createDiagnosticsPublisher(
  (params) => connection.sendDiagnostics(params as any)
);

const documentAnalyzer = createDocumentAnalyzer(
  mecabAnalyzer,
  commentExtractor,
  markdownFilter,
  tokenFilter,
  grammarChecker,
  advancedRulesManager,
  proofreadingRulesManager,
  DEBUG_LOGS ? (msg) => connection.console.log(msg) : undefined
);

// Create analysis scheduler with execute function
// Note: executeAnalysis is provided by connectionHandler, but we need scheduler first
// So we create a placeholder and update it after connectionHandler is created
let executeAnalysisFn = async (uri: string, lightweightOnly: boolean): Promise<void> => {};

const analysisScheduler = createAnalysisScheduler(
  analysisStates,
  configManager,
  (uri, lightweightOnly) => executeAnalysisFn(uri, lightweightOnly),
  DEBUG_LOGS ? (msg) => connection.console.log(msg) : undefined
);

// Create connection handler
const connectionHandler = createConnectionHandler(
  connection,
  documents,
  configManager,
  analysisScheduler,
  documentAnalyzer,
  diagnosticsPublisher,
  hoverProvider,
  semanticTokenProvider,
  analysisStates,
  advancedRulesManager,
  DEBUG_LOGS ? (msg) => connection.console.log(msg) : undefined
);

// Connect executeAnalysis function from connectionHandler to analysisScheduler
executeAnalysisFn = connectionHandler.getExecuteAnalysis();

// Initialize connection handlers
connectionHandler.initialize();

// Listen for document events
documents.listen(connection);

// Start server
connection.listen();

connection.console.log('otak-lsp Language Server started');

/**
 * 漢字の読み方を取得する
 * @param char 漢字文字（複数文字の場合は最初の文字のみ処理）
 * @returns 読み方の配列（漢字でない場合は空配列）
 */
export function getKanjiReadings(char: string): string[] {
  if (!char || char.length === 0) {
    return [];
  }

  const firstChar = char.charAt(0);
  const codePoint = firstChar.codePointAt(0);

  if (codePoint === undefined || codePoint < 0x4E00 || codePoint > 0x9FFF) {
    return [];
  }

  const kanjiReadings: Record<string, string[]> = {
    '日': ['ニチ', 'ジツ', 'ひ', 'か'],
    '月': ['ゲツ', 'ガツ', 'つき'],
    '火': ['カ', 'ひ', 'ほ'],
    '水': ['スイ', 'みず'],
    '木': ['モク', 'ボク', 'き', 'こ'],
    '金': ['キン', 'コン', 'かね', 'かな'],
    '土': ['ド', 'ト', 'つち'],
    '山': ['サン', 'やま'],
    '川': ['セン', 'かわ'],
    '田': ['デン', 'た'],
    '人': ['ジン', 'ニン', 'ひと'],
    '口': ['コウ', 'ク', 'くち'],
    '目': ['モク', 'ボク', 'め', 'ま'],
    '手': ['シュ', 'て', 'た'],
    '足': ['ソク', 'あし', 'た'],
    '本': ['ホン', 'もと'],
    '文': ['ブン', 'モン', 'ふみ'],
    '字': ['ジ', 'あざ'],
    '学': ['ガク', 'まな'],
    '校': ['コウ'],
    '先': ['セン', 'さき'],
    '生': ['セイ', 'ショウ', 'い', 'う', 'は', 'なま'],
    '年': ['ネン', 'とし'],
    '大': ['ダイ', 'タイ', 'おお'],
    '小': ['ショウ', 'ちい', 'こ', 'お'],
    '中': ['チュウ', 'なか'],
    '上': ['ジョウ', 'ショウ', 'うえ', 'うわ', 'かみ', 'あ', 'のぼ'],
    '下': ['カ', 'ゲ', 'した', 'しも', 'もと', 'さ', 'くだ', 'お'],
    '左': ['サ', 'ひだり'],
    '右': ['ウ', 'ユウ', 'みぎ'],
    '男': ['ダン', 'ナン', 'おとこ', 'お'],
    '女': ['ジョ', 'ニョ', 'ニョウ', 'おんな', 'め'],
    '子': ['シ', 'ス', 'こ'],
    '父': ['フ', 'ちち'],
    '母': ['ボ', 'はは'],
    '王': ['オウ'],
    '玉': ['ギョク', 'たま'],
    '国': ['コク', 'くに'],
    '花': ['カ', 'はな'],
    '草': ['ソウ', 'くさ'],
    '虫': ['チュウ', 'むし'],
    '犬': ['ケン', 'いぬ'],
    '空': ['クウ', 'そら', 'あ', 'から'],
    '雨': ['ウ', 'あめ', 'あま'],
    '天': ['テン', 'あめ', 'あま'],
    '気': ['キ', 'ケ'],
    '夕': ['セキ', 'ゆう'],
    '名': ['メイ', 'ミョウ', 'な'],
    '音': ['オン', 'イン', 'おと', 'ね'],
    '休': ['キュウ', 'やす'],
    '見': ['ケン', 'み'],
    '早': ['ソウ', 'サッ', 'はや'],
    '耳': ['ジ', 'みみ'],
    '出': ['シュツ', 'スイ', 'で', 'だ'],
    '入': ['ニュウ', 'い', 'はい'],
    '立': ['リツ', 'リュウ', 'た'],
    '正': ['セイ', 'ショウ', 'ただ', 'まさ'],
    '白': ['ハク', 'ビャク', 'しろ', 'しら'],
    '赤': ['セキ', 'シャク', 'あか'],
    '青': ['セイ', 'ショウ', 'あお'],
    '百': ['ヒャク'],
    '千': ['セン', 'ち'],
    '万': ['マン', 'バン', 'よろず'],
    '円': ['エン', 'まる'],
    '力': ['リョク', 'リキ', 'ちから'],
    '林': ['リン', 'はやし'],
    '森': ['シン', 'もり'],
    '石': ['セキ', 'シャク', 'コク', 'いし'],
    '竹': ['チク', 'たけ'],
    '糸': ['シ', 'いと'],
    '貝': ['バイ', 'かい'],
    '車': ['シャ', 'くるま'],
    '町': ['チョウ', 'まち'],
    '村': ['ソン', 'むら'],
  };

  return kanjiReadings[firstChar] || [];
}
