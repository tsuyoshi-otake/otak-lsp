/**
 * Update README with Evals Results
 * Feature: advanced-grammar-rules
 * Task: 28. README.md評価結果埋め込み機能
 *
 * npm run evals:update-readme で実行されるスクリプト
 */

import * as fs from 'fs';
import * as path from 'path';
import { EvalsRunner } from './evals-runner';
import { EvalsReporter } from './evals-reporter';

const START_MARKER = '<!-- EVALS-START -->';
const END_MARKER = '<!-- EVALS-END -->';

/**
 * README.mdを更新
 */
async function main(): Promise<void> {
  console.log('Updating README.md with Evals results...');
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

    // README用のセクションを生成
    const readmeSection = EvalsReporter.generateReadmeSection(result);

    // README.mdを読み込み
    const readmePath = path.join(__dirname, '..', '..', '..', '..', 'README.md');
    let readmeContent: string;

    try {
      readmeContent = fs.readFileSync(readmePath, 'utf-8');
    } catch (e) {
      console.error('Error reading README.md:', e);
      process.exit(1);
    }

    // マーカーを探す
    const startIndex = readmeContent.indexOf(START_MARKER);
    const endIndex = readmeContent.indexOf(END_MARKER);

    if (startIndex === -1 || endIndex === -1) {
      // マーカーがない場合は追加を促す
      console.log('');
      console.log('Markers not found in README.md.');
      console.log('Please add the following markers to README.md where you want the evals section:');
      console.log('');
      console.log(START_MARKER);
      console.log(END_MARKER);
      console.log('');
      console.log('Generated section (copy this manually):');
      console.log('');
      console.log(START_MARKER);
      console.log(readmeSection);
      console.log(END_MARKER);
      process.exit(0);
    }

    if (startIndex >= endIndex) {
      console.error('Invalid marker positions: START must come before END');
      process.exit(1);
    }

    // マーカー間のコンテンツを置換
    const newContent =
      readmeContent.substring(0, startIndex + START_MARKER.length) +
      '\n' +
      readmeSection +
      readmeContent.substring(endIndex);

    // README.mdを更新
    fs.writeFileSync(readmePath, newContent, 'utf-8');
    console.log('README.md updated successfully!');
    console.log('');

    // コンソールサマリーを出力
    const consoleSummary = EvalsReporter.generateConsoleSummary(result);
    console.log(consoleSummary);

    process.exit(0);

  } catch (error) {
    console.error('Error updating README:', error);
    process.exit(1);
  }
}

// 実行
main();
