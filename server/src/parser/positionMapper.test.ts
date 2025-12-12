/**
 * Position Mapper Tests
 * 位置マッピング機能のテスト
 */

import { PositionMapper } from './positionMapper';
import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';

describe('PositionMapper', () => {
  describe('基本的な位置マッピング', () => {
    it('除外範囲がない場合は同じ位置を返す', () => {
      const originalText = 'これはテストです。';
      const filteredText = 'これはテストです。';
      const excludedRanges: ExcludedRange[] = [];

      const mapper = new PositionMapper(originalText, filteredText, excludedRanges);

      const result = mapper.mapToOriginal(5);
      expect(result).toEqual({ line: 0, character: 5 });
    });

    it('単一の除外範囲がある場合の位置マッピング', () => {
      const originalText = 'これは`コード`です。';
      const filteredText = 'これは      です。'; // `コード`が6つのスペースに置換
      const excludedRanges: ExcludedRange[] = [
        {
          start: 3,
          end: 8,
          type: 'inline-code',
          content: '`コード`',
          reason: 'インラインコード検出'
        }
      ];

      const mapper = new PositionMapper(originalText, filteredText, excludedRanges);

      // 除外範囲より前の位置
      expect(mapper.mapToOriginal(2)).toEqual({ line: 0, character: 2 });
      
      // 除外範囲より後の位置（フィルタリング済みテキストの位置3 = 元のテキストの位置8）
      expect(mapper.mapToOriginal(3)).toEqual({ line: 0, character: 8 });
    });

    it('複数行にわたる除外範囲の位置マッピング', () => {
      const originalText = `これはテストです。
\`\`\`
コードブロック
複数行
\`\`\`
続きのテキストです。`;

      const filteredText = `これはテストです。
   
            
     
   
続きのテキストです。`;

      const excludedRanges: ExcludedRange[] = [
        {
          start: 10, // ```の開始位置
          end: 25,   // ```の終了位置
          type: 'code-block',
          content: '```\nコードブロック\n複数行\n```',
          reason: 'コードブロック検出'
        }
      ];

      const mapper = new PositionMapper(originalText, filteredText, excludedRanges);

      // 除外範囲より前
      expect(mapper.mapToOriginal(5)).toEqual({ line: 0, character: 5 });
      
      // 除外範囲より後（最後の行）
      const lastLineStart = mapper.mapToOriginal(10);
      expect(lastLineStart?.line).toBe(3); // 実際の最後の行
    });
  });

  describe('範囲マッピング', () => {
    it('範囲を正しくマッピングする', () => {
      const originalText = 'これは`コード`です。テスト文章。';
      const filteredText = 'これは      です。テスト文章。';
      const excludedRanges: ExcludedRange[] = [
        {
          start: 3,
          end: 8,
          type: 'inline-code',
          content: '`コード`',
          reason: 'インラインコード検出'
        }
      ];

      const mapper = new PositionMapper(originalText, filteredText, excludedRanges);

      const result = mapper.mapRangeToOriginal(3, 6); // "です"の範囲
      expect(result).toEqual({
        start: { line: 0, character: 8 },
        end: { line: 0, character: 11 }
      });
    });
  });

  describe('逆マッピング', () => {
    it('元のテキストの位置をフィルタリング済みテキストの位置に変換', () => {
      const originalText = 'これは`コード`です。';
      const filteredText = 'これは      です。';
      const excludedRanges: ExcludedRange[] = [
        {
          start: 3,
          end: 8,
          type: 'inline-code',
          content: '`コード`',
          reason: 'インラインコード検出'
        }
      ];

      const mapper = new PositionMapper(originalText, filteredText, excludedRanges);

      // 除外範囲より前
      expect(mapper.mapToFiltered(2)).toBe(2);
      
      // 除外範囲内（マッピングできない）
      expect(mapper.mapToFiltered(5)).toBeNull();
      
      // 除外範囲より後
      expect(mapper.mapToFiltered(8)).toBe(3);
      expect(mapper.mapToFiltered(10)).toBe(5);
    });
  });

  describe('エッジケース', () => {
    it('空のテキストを処理する', () => {
      const mapper = new PositionMapper('', '', []);
      expect(mapper.mapToOriginal(0)).toBeNull();
    });

    it('範囲外の位置を処理する', () => {
      const originalText = 'テスト';
      const filteredText = 'テスト';
      const mapper = new PositionMapper(originalText, filteredText, []);
      
      expect(mapper.mapToOriginal(100)).toBeNull();
    });

    it('重複する除外範囲を処理する', () => {
      const originalText = 'これは`テスト`です。';
      const filteredText = 'これは       です。';
      const excludedRanges: ExcludedRange[] = [
        {
          start: 3,
          end: 8,
          type: 'inline-code',
          content: '`テスト`',
          reason: 'インラインコード検出'
        },
        {
          start: 4,
          end: 7,
          type: 'custom',
          content: 'テスト',
          reason: 'カスタムパターン'
        }
      ];

      const mapper = new PositionMapper(originalText, filteredText, excludedRanges);
      
      // 重複があっても正常に動作することを確認
      expect(mapper.mapToOriginal(3)).toEqual({ line: 0, character: 8 });
    });
  });

  describe('デバッグ情報', () => {
    it('正しいデバッグ情報を返す', () => {
      const originalText = 'これは`コード`です。';
      const filteredText = 'これは      です。';
      const excludedRanges: ExcludedRange[] = [
        {
          start: 3,
          end: 8,
          type: 'inline-code',
          content: '`コード`',
          reason: 'インラインコード検出'
        }
      ];

      const mapper = new PositionMapper(originalText, filteredText, excludedRanges);
      const debugInfo = mapper.getDebugInfo();

      expect(debugInfo.originalLength).toBe(originalText.length);
      expect(debugInfo.filteredLength).toBe(filteredText.length);
      expect(debugInfo.excludedRangeCount).toBe(1);
      expect(debugInfo.mappingCount).toBe(0); // 現在の実装では使用されていない
    });
  });
});