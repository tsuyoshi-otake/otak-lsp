/**
 * Evals CLI Runner
 * Feature: advanced-grammar-rules
 * Task: 26. Evalsコマンドの作成
 *
 * npm run evals で実行されるスクリプト
 */

import * as fs from 'fs';
import * as path from 'path';
import { EvalsRunner } from './evals-runner';
import { EvalsReporter } from './evals-reporter';

/**
 * Evalsを実行してレポートを出力
 */
async function main(): Promise<void> {
  console.log('Starting Japanese Grammar Evals...');
  console.log('');

  try {
    // Evalsを実行
    const runner = new EvalsRunner();
    console.log('Initializing tokenizer (loading dictionary)...');
    await runner.initialize();
    console.log('Dictionary loaded successfully.');
    console.log('');

    console.log('Running evaluations...');
    const result = await runner.runEvals();
    console.log('Evaluations completed.');
    console.log('');

    // コンソールサマリーを出力
    const consoleSummary = EvalsReporter.generateConsoleSummary(result);
    console.log(consoleSummary);

    // Markdownレポートを生成
    const markdownReport = EvalsReporter.generateMarkdownReport(result);

    // レポートファイルを保存
    const reportPath = path.join(__dirname, '..', '..', '..', '..', 'evals-report.md');
    fs.writeFileSync(reportPath, markdownReport, 'utf-8');
    console.log(`Report saved to: ${reportPath}`);
    console.log('');

    // 終了コードを設定（失敗がある場合は1）
    const hasFailures = result.categories.some(c => c.status === 'FAIL');
    if (hasFailures) {
      console.log('Some categories have detection failures.');
      process.exit(1);
    }

    console.log('All evaluations passed!');
    process.exit(0);

  } catch (error) {
    console.error('Error running evals:', error);
    process.exit(1);
  }
}

// 実行
main();
