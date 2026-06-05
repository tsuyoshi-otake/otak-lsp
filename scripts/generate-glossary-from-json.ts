/**
 * ja.json → TypeScriptソースコード生成スクリプト
 *
 * ja.json（9,552エントリ、226ドメイン）を読み込み、
 * GlossaryIdごとにグルーピングされたTypeScriptファイルを生成する。
 *
 * 使い方:
 *   npx ts-node scripts/generate-glossary-from-json.ts
 *
 * 出力:
 *   server/src/hover/generatedGlossaryData.ts
 *   server/src/hover/generatedGlossaryData/*.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { GlossaryId } from '../shared/src/types';
import { GlossaryEntry } from '../server/src/hover/glossaryTypes';

export interface GeneratedGlossarySourceFile {
  relativePath: string;
  source: string;
}

const GLOSSARY_ENTRIES_PER_FILE = 250;

// ============================================================
// ja.json エントリの型定義
// ============================================================

/** ja.jsonの1エントリの型 */
export interface JaJsonEntry {
  term: string;
  reading: string;
  senses: Array<{
    definition: string;
    domain: string;
    normalizedDomain: string;
    normalizedKeywords: string[];
  }>;
  normalizedTerms: string[];
}

/** ja.json全体の型 */
interface JaJsonRoot {
  entries: JaJsonEntry[];
}

// ============================================================
// ドメイン → GlossaryId マッピング（設計書準拠・226ドメイン）
// ============================================================

/**
 * ja.jsonの226ドメインを既存のGlossaryIdにマッピングするテーブル。
 * 設計書のマッピング表に完全準拠。
 */
export const DOMAIN_MAPPING: Record<string, GlossaryId> = {
  // --- it ---
  'software-engineering': 'it',
  'programming': 'it',
  'testing': 'it',
  'code-quality': 'it',
  'development': 'it',
  'development-practices': 'it',
  'anti-patterns': 'it',
  'it-vocabulary': 'it',
  'it-basics': 'it',
  'computer-basics': 'it',
  'computer-architecture': 'it',
  'documentation': 'it',
  'writing': 'it',
  'knowledge': 'it',
  'knowledge-management': 'it',
  'General': 'it',
  'general': 'it',
  'software': 'it',
  'product': 'it',
  'product-management': 'it',
  'service': 'it',
  'chat': 'it',
  'data': 'it',
  'data-analysis': 'it',
  'data-integration': 'it',
  'reporting': 'it',
  'cross-cutting': 'it',
  'maintainability': 'it',
  'technology-selection': 'it',
  'hardware': 'it',
  'os': 'it',
  'virtualization': 'it',
  'vs-code': 'it',

  // --- cloud ---
  'cloud': 'cloud',
  'Cloud': 'cloud',
  'IaaS': 'cloud',
  'PaaS': 'cloud',
  'SaaS': 'cloud',
  'storage': 'cloud',

  // --- awsServices ---
  'aws': 'awsServices',
  'AWS': 'awsServices',

  // --- azureServices ---
  'azure': 'azureServices',
  'Azure': 'azureServices',

  // --- gcpServices ---
  'google-cloud': 'gcpServices',

  // --- ociServices ---
  'oci': 'ociServices',
  'oci-apex': 'ociServices',
  'oracle-apex': 'ociServices',
  'apex': 'ociServices',

  // --- backend ---
  'backend': 'backend',
  'web-api': 'backend',
  'api': 'backend',

  // --- frontend ---
  'frontend': 'frontend',
  'css': 'frontend',
  'html': 'frontend',
  'react': 'frontend',
  'javascript': 'frontend',
  'typescript': 'frontend',
  'web': 'frontend',
  'web-analytics': 'frontend',
  'mobile': 'frontend',
  'ux-design': 'frontend',
  'ui-design': 'frontend',
  'ux': 'frontend',
  'UX': 'frontend',
  'ui_design': 'frontend',
  'accessibility': 'frontend',
  'Accessibility': 'frontend',
  'fe-dev-management': 'frontend',
  'fe-security': 'frontend',
  'fe-fundamentals': 'frontend',
  'fe-architecture-os': 'frontend',
  'fe-database': 'frontend',
  'fe-network': 'frontend',

  // --- ddd ---
  'ddd': 'ddd',
  'DDD': 'ddd',
  'modeling': 'ddd',
  'design-patterns': 'ddd',
  'Design Patterns': 'ddd',
  'design-principles': 'ddd',
  'design': 'ddd',
  'Design': 'ddd',
  'oop': 'ddd',

  // --- tdd ---
  'tdd': 'tdd',
  'pbt': 'tdd',
  'Testing': 'tdd',
  'hypothesis': 'tdd',
  'jqwik': 'tdd',
  'junit': 'tdd',
  'quality': 'tdd',
  'quality-management': 'tdd',
  'Code Quality': 'tdd',

  // --- pmbok ---
  'project-management': 'pmbok',
  'Project Management': 'pmbok',
  'estimation': 'pmbok',
  'team': 'pmbok',
  'organization': 'pmbok',
  'Organizational Management': 'pmbok',
  'Organizational Culture': 'pmbok',
  'process-management': 'pmbok',
  'change-management': 'pmbok',
  'requirements': 'pmbok',
  'proposal': 'pmbok',
  'project_management': 'pmbok',

  // --- java ---
  'java': 'java',
  'spring': 'java',
  'spring-boot': 'java',

  // --- nextjs ---
  'nextjs': 'nextjs',

  // --- dotnet ---
  'dotnet': 'dotnet',
  'visual-studio': 'dotnet',

  // --- security ---
  'security': 'security',
  'Security': 'security',
  'compliance': 'security',
  'Compliance': 'security',
  'audit': 'security',
  'Audit': 'security',
  'governance': 'security',
  'Governance': 'security',
  'risk-management': 'security',
  'Risk Management': 'security',
  'incident-response': 'security',
  'Incident Response': 'security',
  'information-management': 'security',

  // --- networkHttp ---
  'network': 'networkHttp',
  'Network': 'networkHttp',

  // --- dbSqlTx ---
  'database': 'dbSqlTx',
  'Database': 'dbSqlTx',
  'sql': 'dbSqlTx',
  'data-store': 'dbSqlTx',
  'data-engineering': 'dbSqlTx',

  // --- apiDesign ---
  'api-design': 'apiDesign',

  // --- devopsCicd ---
  'devops': 'devopsCicd',
  'ci-cd': 'devopsCicd',
  'CI/CD': 'devopsCicd',
  'version-control': 'devopsCicd',
  'release': 'devopsCicd',
  'build': 'devopsCicd',
  'dependency-management': 'devopsCicd',
  'Dependency Management': 'devopsCicd',

  // --- containersK8s ---
  'container': 'containersK8s',
  'kubernetes': 'containersK8s',

  // --- observabilitySre ---
  'sre': 'observabilitySre',
  'SRE': 'observabilitySre',
  'monitoring': 'observabilitySre',
  'Monitoring': 'observabilitySre',
  'observability': 'observabilitySre',
  'Observability': 'observabilitySre',
  'Operations Monitoring': 'observabilitySre',
  'logging': 'observabilitySre',
  'operations': 'observabilitySre',
  'Operations': 'observabilitySre',
  'support': 'observabilitySre',
  'metrics': 'observabilitySre',
  'FinOps': 'observabilitySre',
  'finops': 'observabilitySre',

  // --- distributedSystems ---
  'distributed-systems': 'distributedSystems',
  'Distributed Systems': 'distributedSystems',

  // --- performanceCache ---
  'performance': 'performanceCache',
  'Performance': 'performanceCache',
  'capacity': 'performanceCache',
  'Capacity': 'performanceCache',

  // --- architecturePatterns ---
  'architecture': 'architecturePatterns',
  'Architecture': 'architecturePatterns',
  'design-document': 'architecturePatterns',
  'Design Document': 'architecturePatterns',
  'Development': 'architecturePatterns',
  'UML': 'architecturePatterns',
  'uml': 'architecturePatterns',

  // --- agileProduct ---
  'agile': 'agileProduct',
  'Agile': 'agileProduct',
  'methodology': 'agileProduct',
  'culture': 'agileProduct',

  // --- aiLlm ---
  'ai': 'aiLlm',
  'AI': 'aiLlm',
  'machine-learning': 'aiLlm',
  'llm': 'aiLlm',
  'LLM': 'aiLlm',
  'rag': 'aiLlm',
  'RAG': 'aiLlm',
  'agent': 'aiLlm',
  'Agent': 'aiLlm',
  'ai-integration': 'aiLlm',
  'ai-dev': 'aiLlm',

  // --- contractLegal ---
  'legal': 'contractLegal',
  'finance': 'contractLegal',
  'accounting': 'contractLegal',
  'billing': 'contractLegal',
  'trading': 'contractLegal',
  'real-estate': 'contractLegal',
  'labor': 'contractLegal',
  'hr': 'contractLegal',
  'international-business': 'contractLegal',
  'sales-engineering': 'contractLegal',
  'Sales': 'contractLegal',
  'marketing': 'contractLegal',
  'Marketing': 'contractLegal',
  'manufacturing': 'contractLegal',
  'sustainability': 'contractLegal',
  'business': 'contractLegal',
  'business-analysis': 'contractLegal',
  'business-process': 'contractLegal',
  'business-improvement': 'contractLegal',
  'business-strategy': 'contractLegal',
  'business-management': 'contractLegal',
  'Business Strategy': 'contractLegal',
  'Data Analytics': 'contractLegal',
  'corporate-management': 'contractLegal',
  'Corporate Operations': 'contractLegal',

  // --- git ---
  'git': 'git',
  'github': 'git',
  'github-actions': 'git',
  'github-codespaces': 'git',
  'github-projects': 'git',
  'svn': 'git',

  // --- npm ---
  'npm': 'npm',
  'package-management': 'npm',

  // --- yarn ---
  'yarn': 'yarn',

  // --- pnpm ---
  'pnpm': 'pnpm',

  // --- pip ---
  'pip': 'pip',
  'python': 'pip',
  'postgresql': 'pip',

  // --- docker ---
  'docker': 'docker',

  // --- linux ---
  'linux': 'linux',
  'shell': 'linux',

  // --- windows ---
  'windows': 'windows',
  'vba': 'windows',

  // --- powershell ---
  'powershell': 'powershell',

  // --- oracle ---
  'oracle': 'oracle',

  // --- mysql ---
  'mysql': 'mysql',

  // --- maven ---
  'maven': 'maven',

  // --- gradle ---
  'gradle': 'gradle',

  // --- iotEmbedded ---
  'embedded': 'iotEmbedded',
  'iot': 'iotEmbedded',

  // --- enterpriseArch ---
  'enterprise': 'enterpriseArch',
  'integration': 'enterpriseArch',
  'migration': 'enterpriseArch',
  'Migration': 'enterpriseArch',

  // --- 設計書に明示されていないが ja.json に存在するドメイン ---
  'Frontend': 'frontend',
  'Generic': 'it',
  'bi': 'contractLegal',
  'design_patterns': 'ddd',
  'engineering': 'it',
  'infrastructure': 'cloud',
  'management': 'pmbok',
};


// ============================================================
// ドメイン日本語ラベルマップ（複数sense結合時に使用）
// ============================================================

/**
 * ドメイン名 → 日本語ラベルのマッピング。
 * 複数senseを持つエントリのdescription結合時に【ラベル】形式で使用する。
 */
export const DOMAIN_LABEL_MAP: Record<string, string> = {
  'software-engineering': 'ソフトウェアエンジニアリング',
  'programming': 'プログラミング',
  'testing': 'テスト',
  'code-quality': 'コード品質',
  'development': '開発',
  'development-practices': '開発プラクティス',
  'anti-patterns': 'アンチパターン',
  'it-vocabulary': 'IT用語',
  'it-basics': 'IT基礎',
  'computer-basics': 'コンピュータ基礎',
  'computer-architecture': 'コンピュータアーキテクチャ',
  'documentation': 'ドキュメント',
  'writing': 'ライティング',
  'knowledge': 'ナレッジ',
  'knowledge-management': 'ナレッジ管理',
  'General': '一般',
  'general': '一般',
  'software': 'ソフトウェア',
  'product': 'プロダクト',
  'product-management': 'プロダクト管理',
  'service': 'サービス',
  'chat': 'チャット',
  'data': 'データ',
  'data-analysis': 'データ分析',
  'data-integration': 'データ統合',
  'reporting': 'レポーティング',
  'cross-cutting': '横断的関心事',
  'maintainability': '保守性',
  'technology-selection': '技術選定',
  'hardware': 'ハードウェア',
  'os': 'OS',
  'virtualization': '仮想化',
  'vs-code': 'VS Code',
  'cloud': 'クラウド',
  'Cloud': 'クラウド',
  'IaaS': 'IaaS',
  'PaaS': 'PaaS',
  'SaaS': 'SaaS',
  'storage': 'ストレージ',
  'aws': 'AWS',
  'AWS': 'AWS',
  'azure': 'Azure',
  'Azure': 'Azure',
  'google-cloud': 'Google Cloud',
  'oci': 'OCI',
  'oci-apex': 'OCI APEX',
  'oracle-apex': 'Oracle APEX',
  'apex': 'APEX',
  'backend': 'バックエンド',
  'web-api': 'Web API',
  'api': 'API',
  'frontend': 'フロントエンド',
  'css': 'CSS',
  'html': 'HTML',
  'react': 'React',
  'javascript': 'JavaScript',
  'typescript': 'TypeScript',
  'web': 'Web',
  'web-analytics': 'Webアナリティクス',
  'mobile': 'モバイル',
  'ux-design': 'UXデザイン',
  'ui-design': 'UIデザイン',
  'ux': 'UX',
  'UX': 'UX',
  'ui_design': 'UIデザイン',
  'accessibility': 'アクセシビリティ',
  'Accessibility': 'アクセシビリティ',
  'fe-dev-management': 'フロントエンド開発管理',
  'fe-security': 'フロントエンドセキュリティ',
  'fe-fundamentals': 'フロントエンド基礎',
  'fe-architecture-os': 'フロントエンドアーキテクチャ',
  'fe-database': 'フロントエンドDB',
  'fe-network': 'フロントエンドネットワーク',
  'ddd': 'DDD',
  'DDD': 'DDD',
  'modeling': 'モデリング',
  'design-patterns': 'デザインパターン',
  'Design Patterns': 'デザインパターン',
  'design-principles': '設計原則',
  'design': '設計',
  'Design': '設計',
  'oop': 'オブジェクト指向',
  'tdd': 'TDD',
  'pbt': 'PBT',
  'Testing': 'テスト',
  'hypothesis': 'Hypothesis',
  'jqwik': 'jqwik',
  'junit': 'JUnit',
  'quality': '品質',
  'quality-management': '品質管理',
  'Code Quality': 'コード品質',
  'project-management': 'プロジェクト管理',
  'Project Management': 'プロジェクト管理',
  'estimation': '見積',
  'team': 'チーム',
  'organization': '組織',
  'Organizational Management': '組織管理',
  'Organizational Culture': '組織文化',
  'process-management': 'プロセス管理',
  'change-management': '変更管理',
  'requirements': '要件',
  'proposal': '提案',
  'project_management': 'プロジェクト管理',
  'java': 'Java',
  'spring': 'Spring',
  'spring-boot': 'Spring Boot',
  'nextjs': 'Next.js',
  'dotnet': '.NET',
  'visual-studio': 'Visual Studio',
  'security': 'セキュリティ',
  'Security': 'セキュリティ',
  'compliance': 'コンプライアンス',
  'Compliance': 'コンプライアンス',
  'audit': '監査',
  'Audit': '監査',
  'governance': 'ガバナンス',
  'Governance': 'ガバナンス',
  'risk-management': 'リスク管理',
  'Risk Management': 'リスク管理',
  'incident-response': 'インシデント対応',
  'Incident Response': 'インシデント対応',
  'information-management': '情報管理',
  'network': 'ネットワーク',
  'Network': 'ネットワーク',
  'database': 'データベース',
  'Database': 'データベース',
  'sql': 'SQL',
  'data-store': 'データストア',
  'data-engineering': 'データエンジニアリング',
  'api-design': 'API設計',
  'devops': 'DevOps',
  'ci-cd': 'CI/CD',
  'CI/CD': 'CI/CD',
  'version-control': 'バージョン管理',
  'release': 'リリース',
  'build': 'ビルド',
  'dependency-management': '依存関係管理',
  'Dependency Management': '依存関係管理',
  'container': 'コンテナ',
  'kubernetes': 'Kubernetes',
  'sre': 'SRE',
  'SRE': 'SRE',
  'monitoring': '監視',
  'Monitoring': '監視',
  'observability': 'オブザーバビリティ',
  'Observability': 'オブザーバビリティ',
  'Operations Monitoring': '運用監視',
  'logging': 'ロギング',
  'operations': '運用',
  'Operations': '運用',
  'support': 'サポート',
  'metrics': 'メトリクス',
  'FinOps': 'FinOps',
  'finops': 'FinOps',
  'distributed-systems': '分散システム',
  'Distributed Systems': '分散システム',
  'performance': 'パフォーマンス',
  'Performance': 'パフォーマンス',
  'capacity': 'キャパシティ',
  'Capacity': 'キャパシティ',
  'architecture': 'アーキテクチャ',
  'Architecture': 'アーキテクチャ',
  'design-document': '設計ドキュメント',
  'Design Document': '設計ドキュメント',
  'Development': '開発',
  'UML': 'UML',
  'uml': 'UML',
  'agile': 'アジャイル',
  'Agile': 'アジャイル',
  'methodology': '方法論',
  'culture': '文化',
  'ai': 'AI',
  'AI': 'AI',
  'machine-learning': '機械学習',
  'llm': 'LLM',
  'LLM': 'LLM',
  'rag': 'RAG',
  'RAG': 'RAG',
  'agent': 'エージェント',
  'Agent': 'エージェント',
  'ai-integration': 'AI統合',
  'ai-dev': 'AI開発',
  'legal': '法務',
  'finance': '金融',
  'accounting': '会計',
  'billing': '請求',
  'trading': '取引',
  'real-estate': '不動産',
  'labor': '労務',
  'hr': '人事',
  'international-business': '国際ビジネス',
  'sales-engineering': 'セールスエンジニアリング',
  'Sales': '営業',
  'marketing': 'マーケティング',
  'Marketing': 'マーケティング',
  'manufacturing': '製造',
  'sustainability': 'サステナビリティ',
  'business': 'ビジネス',
  'business-analysis': 'ビジネス分析',
  'business-process': 'ビジネスプロセス',
  'business-improvement': 'ビジネス改善',
  'business-strategy': 'ビジネス戦略',
  'business-management': 'ビジネス管理',
  'Business Strategy': 'ビジネス戦略',
  'Data Analytics': 'データアナリティクス',
  'corporate-management': '企業経営',
  'Corporate Operations': '企業運営',
  'git': 'Git',
  'github': 'GitHub',
  'github-actions': 'GitHub Actions',
  'github-codespaces': 'GitHub Codespaces',
  'github-projects': 'GitHub Projects',
  'svn': 'SVN',
  'npm': 'npm',
  'package-management': 'パッケージ管理',
  'yarn': 'Yarn',
  'pnpm': 'pnpm',
  'pip': 'pip',
  'python': 'Python',
  'postgresql': 'PostgreSQL',
  'docker': 'Docker',
  'linux': 'Linux',
  'shell': 'シェル',
  'windows': 'Windows',
  'vba': 'VBA',
  'powershell': 'PowerShell',
  'oracle': 'Oracle',
  'mysql': 'MySQL',
  'maven': 'Maven',
  'gradle': 'Gradle',
  'embedded': '組み込み',
  'iot': 'IoT',
  'enterprise': 'エンタープライズ',
  'integration': 'インテグレーション',
  'migration': 'マイグレーション',
  'Migration': 'マイグレーション',
  'Frontend': 'フロントエンド',
  'Generic': '一般',
  'bi': 'BI',
  'design_patterns': 'デザインパターン',
  'engineering': 'エンジニアリング',
  'infrastructure': 'インフラストラクチャ',
  'management': 'マネジメント',
};


// ============================================================
// カテゴリタイトルマップ
// ============================================================

/** GlossaryId → カテゴリタイトルのマッピング */
const CATEGORY_TITLE_MAP: Record<GlossaryId, string> = {
  'it': 'IT用語図鑑',
  'otakLspSettings': 'otak-lsp設定用語図鑑',
  'cloud': 'クラウド用語図鑑',
  'awsServices': 'AWSサービス用語図鑑',
  'azureServices': 'Azureサービス用語図鑑',
  'gcpServices': 'GCPサービス用語図鑑',
  'ociServices': 'OCIサービス用語図鑑',
  'iotEmbedded': 'IoT・組み込み用語図鑑',
  'backend': 'バックエンド用語図鑑',
  'frontend': 'フロントエンド用語図鑑',
  'ddd': 'DDD・設計パターン用語図鑑',
  'tdd': 'TDD・テスト用語図鑑',
  'pmbok': 'プロジェクト管理用語図鑑',
  'java': 'Java用語図鑑',
  'nextjs': 'Next.js用語図鑑',
  'dotnet': '.NET用語図鑑',
  'security': 'セキュリティ用語図鑑',
  'networkHttp': 'ネットワーク・HTTP用語図鑑',
  'authIam': '認証・IAM用語図鑑',
  'dbSqlTx': 'DB・SQL・トランザクション用語図鑑',
  'apiDesign': 'API設計用語図鑑',
  'devopsCicd': 'DevOps・CI/CD用語図鑑',
  'containersK8s': 'コンテナ・Kubernetes用語図鑑',
  'observabilitySre': 'オブザーバビリティ・SRE用語図鑑',
  'distributedSystems': '分散システム用語図鑑',
  'messagingEda': 'メッセージング・EDA用語図鑑',
  'performanceCache': 'パフォーマンス・キャッシュ用語図鑑',
  'architecturePatterns': 'アーキテクチャパターン用語図鑑',
  'agileProduct': 'アジャイル・プロダクト用語図鑑',
  'aiLlm': 'AI・LLM用語図鑑',
  'contractLegal': '契約・法務・ビジネス用語図鑑',
  'git': 'Git用語図鑑',
  'npm': 'npm用語図鑑',
  'yarn': 'Yarn用語図鑑',
  'pnpm': 'pnpm用語図鑑',
  'pip': 'pip・Python用語図鑑',
  'docker': 'Docker用語図鑑',
  'linux': 'Linux用語図鑑',
  'windows': 'Windows用語図鑑',
  'powershell': 'PowerShell用語図鑑',
  'oracle': 'Oracle用語図鑑',
  'mysql': 'MySQL用語図鑑',
  'javaCli': 'Java CLI用語図鑑',
  'maven': 'Maven用語図鑑',
  'gradle': 'Gradle用語図鑑',
  'devProcess': '開発プロセス用語図鑑',
  'ipaMetrics': 'IPA・メトリクス用語図鑑',
  'enterpriseArch': 'エンタープライズアーキテクチャ用語図鑑',
};

// ============================================================
// コア変換ロジック
// ============================================================

/**
 * ドメイン名からGlossaryIdを解決する。
 * マッピングに存在しないドメインは 'it' にフォールバックし、警告を出力する。
 */
export function resolveGlossaryId(domain: string, mapping: Record<string, GlossaryId>): GlossaryId {
  const id = mapping[domain];
  if (id !== undefined) {
    return id;
  }
  process.stderr.write(`警告: 未知のドメイン "${domain}" を 'it' にフォールバックします\n`);
  return 'it';
}

/**
 * ドメイン名の日本語ラベルを取得する。
 * DOMAIN_LABEL_MAPに存在しない場合はドメイン名をそのまま返す。
 */
export function getDomainLabel(domain: string): string {
  return DOMAIN_LABEL_MAP[domain] ?? domain;
}

/**
 * ja.jsonの1エントリをGlossaryEntryに変換し、所属カテゴリを決定する。
 *
 * - term: そのまま設定
 * - aliases: normalizedTermsからtermとreadingを除外した残り（空ならundefined）
 * - description: 単一senseならそのまま、複数senseなら【ドメインラベル】付きで結合
 * - カテゴリ: 最初のsenseのdomainで決定
 */
export function convertJaJsonEntry(
  entry: JaJsonEntry,
  mapping: Record<string, GlossaryId>,
): { glossaryId: GlossaryId; entry: GlossaryEntry } {
  // term
  const term = entry.term;

  // aliases: normalizedTermsからtermとreadingを除外
  const aliases = entry.normalizedTerms.filter(
    (nt) => nt !== entry.term && nt !== entry.reading,
  );

  // description: 単一sense vs 複数sense
  let description: string;
  if (entry.senses.length === 1) {
    description = entry.senses[0].definition;
  } else {
    description = entry.senses
      .map((s) => `【${getDomainLabel(s.domain)}】${s.definition}`)
      .join(' ');
  }

  // カテゴリ決定: 最初のsenseのdomainで決定
  const glossaryId = resolveGlossaryId(entry.senses[0].domain, mapping);

  return {
    glossaryId,
    entry: {
      term,
      aliases: aliases.length > 0 ? aliases : undefined,
      description,
    },
  };
}

// ============================================================
// ja.json 読み込み
// ============================================================

/**
 * ja.jsonを読み込みパースする。
 * ファイル不在・パースエラー時はexit code 1で終了する。
 */
export function loadJaJson(filePath: string): JaJsonEntry[] {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`エラー: ja.jsonの読み込みに失敗しました: ${message}\n`);
    process.exit(1);
  }

  let parsed: JaJsonRoot;
  try {
    parsed = JSON.parse(raw) as JaJsonRoot;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`エラー: ja.jsonのパースに失敗しました: ${message}\n`);
    process.exit(1);
  }

  return parsed.entries;
}

// ============================================================
// TypeScriptコード生成ヘルパー
// ============================================================

/**
 * 文字列をTypeScriptのシングルクォート文字列リテラルとして安全にエスケープする。
 * バックスラッシュ、シングルクォート、改行をエスケープする。
 */
export function escapeForTs(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/**
 * GlossaryEntryをTypeScriptのオブジェクトリテラル文字列に変換する。
 */
function entryToTs(entry: GlossaryEntry): string {
  const parts: string[] = [];
  parts.push(`{ term: '${escapeForTs(entry.term)}'`);
  if (entry.aliases && entry.aliases.length > 0) {
    const aliasLiterals = entry.aliases.map((a) => `'${escapeForTs(a)}'`).join(', ');
    parts.push(`aliases: [${aliasLiterals}]`);
  }
  parts.push(`description: '${escapeForTs(entry.description)}' }`);
  return parts.join(', ');
}

/**
 * グルーピングされたエントリからドメイン統計コメントを生成する。
 * 各GlossaryIdに含まれるドメインとそのエントリ数を集計する。
 */
function buildDomainStats(
  entries: JaJsonEntry[],
  mapping: Record<string, GlossaryId>,
): Map<GlossaryId, Map<string, number>> {
  const stats = new Map<GlossaryId, Map<string, number>>();
  for (const entry of entries) {
    if (!entry.term || !entry.senses || entry.senses.length === 0) continue;
    const domain = entry.senses[0].domain;
    const glossaryId = mapping[domain] ?? 'it';
    const domainMap = stats.get(glossaryId) ?? new Map<string, number>();
    domainMap.set(domain, (domainMap.get(domain) ?? 0) + 1);
    stats.set(glossaryId, domainMap);
  }
  return stats;
}

/**
 * ドメイン統計をコメント文字列に変換する。
 * 例: "// software-engineering (447), programming (223), ..."
 */
function domainStatsToComment(domainMap: Map<string, number>): string {
  const sorted = [...domainMap.entries()].sort((a, b) => b[1] - a[1]);
  const parts = sorted.map(([domain, count]) => `${domain} (${count})`);
  return parts.join(', ');
}

/**
 * TypeScriptソースコード全体を生成する。
 */
export function generateTypeScriptSource(
  grouped: Map<GlossaryId, GlossaryEntry[]>,
  domainStats: Map<GlossaryId, Map<string, number>>,
  totalEntries: number,
  totalDomains: number,
): string {
  const lines: string[] = [];

  // ヘッダコメント
  lines.push('// このファイルは自動生成です。手動で編集しないでください。');
  lines.push(`// 生成元: ja.json (${totalEntries} エントリ, ${totalDomains} ドメイン)`);
  lines.push('// 生成コマンド: npx ts-node scripts/generate-glossary-from-json.ts');
  lines.push('');
  lines.push("import { GlossaryId } from '../../../shared/src/types';");
  lines.push("import { GlossaryEntry } from './glossaryTypes';");
  lines.push('');
  lines.push('export interface GeneratedGlossaryCategory {');
  lines.push('  readonly id: GlossaryId;');
  lines.push('  readonly title: string;');
  lines.push('  readonly entries: ReadonlyArray<GlossaryEntry>;');
  lines.push('}');
  lines.push('');
  lines.push('export const GENERATED_GLOSSARY_DATA: ReadonlyArray<GeneratedGlossaryCategory> = [');

  // カテゴリごとに出力
  const categoryEntries = [...grouped.entries()];
  for (let i = 0; i < categoryEntries.length; i++) {
    const [id, entryList] = categoryEntries[i];
    const title = CATEGORY_TITLE_MAP[id] ?? `${id}用語図鑑`;
    const statsMap = domainStats.get(id);
    const statsComment = statsMap ? domainStatsToComment(statsMap) : '';

    lines.push('  {');
    lines.push(`    id: '${id}',`);
    lines.push(`    title: '${escapeForTs(title)}',`);
    lines.push('    entries: [');
    if (statsComment) {
      lines.push(`      // ${statsComment}`);
    }
    for (const entry of entryList) {
      lines.push(`      ${entryToTs(entry)},`);
    }
    lines.push('    ],');
    lines.push('  },');
  }

  lines.push('];');
  lines.push('');

  return lines.join('\n');
}

/**
 * GlossaryIdを生成ファイル名に変換する。
 */
export function glossaryIdToFileName(id: GlossaryId): string {
  return id.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function chunkEntries(entries: ReadonlyArray<GlossaryEntry>): GlossaryEntry[][] {
  const chunks: GlossaryEntry[][] = [];
  for (let i = 0; i < entries.length; i += GLOSSARY_ENTRIES_PER_FILE) {
    chunks.push(entries.slice(i, i + GLOSSARY_ENTRIES_PER_FILE));
  }
  return chunks;
}

function formatPartName(index: number): string {
  return `part-${String(index + 1).padStart(3, '0')}`;
}

function formatPartExportName(index: number): string {
  return `GLOSSARY_ENTRIES_PART_${String(index + 1).padStart(3, '0')}`;
}

/**
 * カテゴリ別エントリの分割ファイルを生成する。
 */
function generateCategoryPartTypeScriptSource(
  id: GlossaryId,
  entries: ReadonlyArray<GlossaryEntry>,
  statsComment: string,
  partIndex: number,
  totalParts: number,
  totalEntries: number,
  totalDomains: number,
): string {
  const lines: string[] = [];

  lines.push('// このファイルは自動生成です。手動で編集しないでください。');
  lines.push(`// 生成元: ja.json (${totalEntries} エントリ, ${totalDomains} ドメイン)`);
  lines.push(`// カテゴリ: ${id} (${partIndex + 1}/${totalParts})`);
  lines.push('// 生成コマンド: npx ts-node scripts/generate-glossary-from-json.ts');
  lines.push('');
  lines.push("import { GlossaryEntry } from '../../glossaryTypes';");
  lines.push('');
  lines.push(`export const ${formatPartExportName(partIndex)}: ReadonlyArray<GlossaryEntry> = [`);
  if (statsComment && partIndex === 0) {
    lines.push(`  // ${statsComment}`);
  }
  for (const entry of entries) {
    lines.push(`  ${entryToTs(entry)},`);
  }
  lines.push('];');
  lines.push('');

  return lines.join('\n');
}

/**
 * カテゴリ内の分割ファイルを束ねるindexファイルを生成する。
 */
function generateCategoryIndexTypeScriptSource(partCount: number): string {
  const lines: string[] = [];

  lines.push('// このファイルは自動生成です。手動で編集しないでください。');
  lines.push('// 生成コマンド: npx ts-node scripts/generate-glossary-from-json.ts');
  lines.push('');
  lines.push("import { GlossaryEntry } from '../../glossaryTypes';");

  for (let i = 0; i < partCount; i++) {
    lines.push(`import { ${formatPartExportName(i)} } from './${formatPartName(i)}';`);
  }

  lines.push('');
  lines.push('export const GLOSSARY_ENTRIES: ReadonlyArray<GlossaryEntry> = [');
  for (let i = 0; i < partCount; i++) {
    lines.push(`  ...${formatPartExportName(i)},`);
  }
  lines.push('];');
  lines.push('');

  return lines.join('\n');
}

/**
 * 分割されたTypeScriptソースコード群を生成する。
 */
export function generateSplitTypeScriptSources(
  grouped: Map<GlossaryId, GlossaryEntry[]>,
  domainStats: Map<GlossaryId, Map<string, number>>,
  totalEntries: number,
  totalDomains: number,
): GeneratedGlossarySourceFile[] {
  const files: GeneratedGlossarySourceFile[] = [];
  const categoryEntries = [...grouped.entries()];
  const aggregateLines: string[] = [];

  aggregateLines.push('// このファイルは自動生成です。手動で編集しないでください。');
  aggregateLines.push(`// 生成元: ja.json (${totalEntries} エントリ, ${totalDomains} ドメイン)`);
  aggregateLines.push('// 生成コマンド: npx ts-node scripts/generate-glossary-from-json.ts');
  aggregateLines.push('');
  aggregateLines.push("import { GlossaryId } from '../../../shared/src/types';");
  aggregateLines.push("import { GlossaryEntry } from './glossaryTypes';");

  for (const [id] of categoryEntries) {
    const importAlias = `${id}Entries`;
    aggregateLines.push(
      `import { GLOSSARY_ENTRIES as ${importAlias} } from './generatedGlossaryData/${glossaryIdToFileName(id)}';`
    );
  }

  aggregateLines.push('');
  aggregateLines.push('export interface GeneratedGlossaryCategory {');
  aggregateLines.push('  readonly id: GlossaryId;');
  aggregateLines.push('  readonly title: string;');
  aggregateLines.push('  readonly entries: ReadonlyArray<GlossaryEntry>;');
  aggregateLines.push('}');
  aggregateLines.push('');
  aggregateLines.push('export const GENERATED_GLOSSARY_DATA: ReadonlyArray<GeneratedGlossaryCategory> = [');

  for (const [id, entryList] of categoryEntries) {
    const title = CATEGORY_TITLE_MAP[id] ?? `${id}用語図鑑`;
    const fileName = glossaryIdToFileName(id);
    const importAlias = `${id}Entries`;

    const chunks = chunkEntries(entryList);
    const statsMap = domainStats.get(id);
    const statsComment = statsMap ? domainStatsToComment(statsMap) : '';

    files.push({
      relativePath: path.join('generatedGlossaryData', fileName, 'index.ts'),
      source: generateCategoryIndexTypeScriptSource(chunks.length),
    });

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      files.push({
        relativePath: path.join('generatedGlossaryData', fileName, `${formatPartName(chunkIndex)}.ts`),
        source: generateCategoryPartTypeScriptSource(
          id,
          chunks[chunkIndex],
          statsComment,
          chunkIndex,
          chunks.length,
          totalEntries,
          totalDomains
        ),
      });
    }

    aggregateLines.push('  {');
    aggregateLines.push(`    id: '${id}',`);
    aggregateLines.push(`    title: '${escapeForTs(title)}',`);
    aggregateLines.push(`    entries: ${importAlias},`);
    aggregateLines.push('  },');
  }

  aggregateLines.push('];');
  aggregateLines.push('');

  files.unshift({
    relativePath: 'generatedGlossaryData.ts',
    source: aggregateLines.join('\n'),
  });

  return files;
}

// ============================================================
// メイン処理（スクリプト実行時のみ）
// ============================================================

/* istanbul ignore next -- スクリプト実行時のみ */
function main(): void {
  const jaJsonPath = path.resolve(__dirname, '..', 'ja.json');
  const outputPath = path.resolve(__dirname, '..', 'server', 'src', 'hover', 'generatedGlossaryData.ts');

  // ja.json読み込み
  const entries = loadJaJson(jaJsonPath);
  process.stdout.write(`ja.json: ${entries.length} エントリを読み込みました\n`);

  // エントリ変換・グルーピング
  const grouped = new Map<GlossaryId, GlossaryEntry[]>();
  let skipped = 0;

  for (const entry of entries) {
    // バリデーション: termがない場合はスキップ
    if (!entry.term) {
      process.stderr.write(`警告: termが空のエントリをスキップします\n`);
      skipped++;
      continue;
    }
    // バリデーション: sensesがない/空の場合はスキップ
    if (!entry.senses || entry.senses.length === 0) {
      process.stderr.write(`警告: sensesが空のエントリをスキップします: "${entry.term}"\n`);
      skipped++;
      continue;
    }

    const result = convertJaJsonEntry(entry, DOMAIN_MAPPING);
    const list = grouped.get(result.glossaryId) ?? [];
    list.push(result.entry);
    grouped.set(result.glossaryId, list);
  }

  if (skipped > 0) {
    process.stdout.write(`${skipped} エントリをスキップしました\n`);
  }

  process.stdout.write(`${grouped.size} カテゴリに分類しました\n`);
  for (const [id, list] of grouped) {
    process.stdout.write(`  ${id}: ${list.length} エントリ\n`);
  }

  // ドメイン統計を集計
  const domainStats = buildDomainStats(entries, DOMAIN_MAPPING);

  // ユニークドメイン数を計算
  const allDomains = new Set<string>();
  for (const entry of entries) {
    if (entry.senses) {
      for (const sense of entry.senses) {
        allDomains.add(sense.domain);
      }
    }
  }

  // TypeScriptソースコード生成
  const generatedFiles = generateSplitTypeScriptSources(grouped, domainStats, entries.length, allDomains.size);

  // ファイル出力
  try {
    // 出力先ディレクトリが存在することを確認
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const categoryOutputDir = path.resolve(outputDir, 'generatedGlossaryData');
    fs.rmSync(categoryOutputDir, { recursive: true, force: true });

    for (const file of generatedFiles) {
      const filePath = path.resolve(outputDir, file.relativePath);
      const fileDir = path.dirname(filePath);
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }
      fs.writeFileSync(filePath, file.source, 'utf-8');
      process.stdout.write(`生成完了: ${filePath}\n`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`エラー: ファイルの書き込みに失敗しました: ${message}\n`);
    process.exit(1);
  }

  process.stdout.write('変換完了\n');
}

// スクリプトとして直接実行された場合のみmainを呼ぶ
if (require.main === module) {
  main();
}
