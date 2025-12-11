/**
 * Term Notation Rule
 * 技術用語の表記を統一する
 * Feature: advanced-grammar-rules
 * 要件: 10.1, 10.2, 10.3, 10.4, 10.5, 12.1, 12.2, 12.3, 12.4, 12.5, 13.4
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic
} from '../../../../shared/src/advancedTypes';

/**
 * 基本的なウェブ技術用語
 */
const WEB_TECH_NOTATION_RULES: Map<string, string> = new Map([
  ['Javascript', 'JavaScript'],
  ['javascript', 'JavaScript'],
  ['Typescript', 'TypeScript'],
  ['typescript', 'TypeScript'],
  ['Github', 'GitHub'],
  ['github', 'GitHub'],
  ['Nodejs', 'Node.js'],
  ['nodejs', 'Node.js'],
  ['NodeJs', 'Node.js'],
  ['Vscode', 'VS Code'],
  ['vscode', 'VS Code'],
  ['VScode', 'VS Code'],
  ['Webpack', 'webpack'],
  ['ReactJs', 'React'],
  ['Reactjs', 'React'],
  ['VueJs', 'Vue.js'],
  ['Vuejs', 'Vue.js'],
  ['vuejs', 'Vue.js'],
  ['AngularJs', 'Angular'],
  ['Angularjs', 'Angular'],
  ['Nextjs', 'Next.js'],
  ['nextjs', 'Next.js'],
  ['NextJs', 'Next.js']
]);

/**
 * 生成AI関連用語
 */
const GENERATIVE_AI_NOTATION_RULES: Map<string, string> = new Map([
  ['chatgpt', 'ChatGPT'],
  ['Chatgpt', 'ChatGPT'],
  ['chat-gpt', 'ChatGPT'],
  ['openai', 'OpenAI'],
  ['Openai', 'OpenAI'],
  ['Open AI', 'OpenAI'],
  ['claude', 'Claude'],
  ['gpt-4', 'GPT-4'],
  ['gpt4', 'GPT-4'],
  ['GPT4', 'GPT-4'],
  ['llm', 'LLM'],
  ['Llm', 'LLM'],
  ['rag', 'RAG'],
  ['Rag', 'RAG'],
  ['gemini', 'Gemini'],
  ['copilot', 'Copilot'],
  ['Co-pilot', 'Copilot'],
  ['midjourney', 'Midjourney'],
  ['Mid Journey', 'Midjourney'],
  ['stable diffusion', 'Stable Diffusion'],
  ['StableDiffusion', 'Stable Diffusion'],
  ['anthropic', 'Anthropic']
]);

/**
 * AWS関連用語
 */
const AWS_NOTATION_RULES: Map<string, string> = new Map([
  ['aws', 'AWS'],
  ['Aws', 'AWS'],
  ['ec2', 'EC2'],
  ['s3', 'S3'],
  ['lambda', 'Lambda'],
  ['dynamodb', 'DynamoDB'],
  ['Dynamodb', 'DynamoDB'],
  ['rds', 'RDS'],
  ['cloudformation', 'CloudFormation'],
  ['Cloud Formation', 'CloudFormation'],
  ['cloudwatch', 'CloudWatch'],
  ['Cloud Watch', 'CloudWatch'],
  ['ecs', 'ECS'],
  ['eks', 'EKS'],
  ['fargate', 'Fargate'],
  ['sagemaker', 'SageMaker'],
  ['Sagemaker', 'SageMaker'],
  ['Sage Maker', 'SageMaker'],
  ['bedrock', 'Bedrock']
]);

/**
 * Azure関連用語
 */
const AZURE_NOTATION_RULES: Map<string, string> = new Map([
  ['azure', 'Azure'],
  ['AZURE', 'Azure'],
  ['azure functions', 'Azure Functions'],
  ['azure devops', 'Azure DevOps'],
  ['AzureDevOps', 'Azure DevOps'],
  ['azure ad', 'Azure AD'],
  ['AzureAD', 'Azure AD'],
  ['cosmos db', 'Cosmos DB'],
  ['CosmosDB', 'Cosmos DB'],
  ['app service', 'App Service'],
  ['azure openai', 'Azure OpenAI'],
  ['AzureOpenAI', 'Azure OpenAI']
]);

/**
 * OCI関連用語
 */
const OCI_NOTATION_RULES: Map<string, string> = new Map([
  ['oci', 'OCI'],
  ['Oci', 'OCI'],
  ['oracle cloud infrastructure', 'Oracle Cloud Infrastructure'],
  ['oracle cloud', 'Oracle Cloud'],
  ['compute instance', 'Compute Instance'],
  ['object storage', 'Object Storage'],
  ['autonomous database', 'Autonomous Database'],
  ['oci generative ai', 'OCI Generative AI']
]);

/**
 * 技術用語表記統一ルール
 */
export class TermNotationRule implements AdvancedGrammarRule {
  name = 'term-notation';
  description = '技術用語の表記を統一します';

  private customRules: Map<string, string> = new Map();

  /**
   * 有効な辞書を取得
   */
  getActiveDictionaries(config: AdvancedRulesConfig): Map<string, string> {
    const combined = new Map<string, string>();

    if (config.enableWebTechDictionary) {
      WEB_TECH_NOTATION_RULES.forEach((v, k) => combined.set(k, v));
    }
    if (config.enableGenerativeAIDictionary) {
      GENERATIVE_AI_NOTATION_RULES.forEach((v, k) => combined.set(k, v));
    }
    if (config.enableAWSDictionary) {
      AWS_NOTATION_RULES.forEach((v, k) => combined.set(k, v));
    }
    if (config.enableAzureDictionary) {
      AZURE_NOTATION_RULES.forEach((v, k) => combined.set(k, v));
    }
    if (config.enableOCIDictionary) {
      OCI_NOTATION_RULES.forEach((v, k) => combined.set(k, v));
    }

    // カスタムルールを追加
    if (config.customNotationRules) {
      config.customNotationRules.forEach((v, k) => combined.set(k, v));
    }
    this.customRules.forEach((v, k) => combined.set(k, v));

    return combined;
  }

  /**
   * カスタムルールを追加
   */
  addCustomRule(incorrect: string, correct: string): void {
    this.customRules.set(incorrect, correct);
  }

  /**
   * 正しい表記を取得
   */
  getCorrectNotation(term: string, config: AdvancedRulesConfig): string | null {
    const dictionaries = this.getActiveDictionaries(config);
    return dictionaries.get(term) || null;
  }

  /**
   * テキスト内の誤った表記を検出
   */
  detectIncorrectNotation(text: string, config: AdvancedRulesConfig): Array<{ incorrect: string; correct: string; index: number }> {
    const results: Array<{ incorrect: string; correct: string; index: number }> = [];
    const dictionaries = this.getActiveDictionaries(config);

    for (const [incorrect, correct] of dictionaries) {
      // 既に正しい表記の場合はスキップ
      if (incorrect === correct) continue;

      // 大文字小文字を区別して検索
      const regex = new RegExp(`\\b${this.escapeRegex(incorrect)}\\b`, 'g');
      let match;
      while ((match = regex.exec(text)) !== null) {
        results.push({
          incorrect: match[0],
          correct,
          index: match.index
        });
      }
    }

    return results;
  }

  /**
   * 正規表現のエスケープ
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 文法チェックを実行
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const errors = this.detectIncorrectNotation(context.documentText, context.config);

    for (const error of errors) {
      diagnostics.push(new AdvancedDiagnostic({
        range: {
          start: { line: 0, character: error.index },
          end: { line: 0, character: error.index + error.incorrect.length }
        },
        message: `技術用語の表記「${error.incorrect}」は「${error.correct}」に統一してください。`,
        code: 'term-notation',
        ruleName: this.name,
        suggestions: [`「${error.correct}」に変更する`]
      }));
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableTermNotation;
  }
}
