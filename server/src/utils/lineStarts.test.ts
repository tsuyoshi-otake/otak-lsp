/**
 * Line Starts Utility Tests
 */

import { computeLineStarts, offsetToLineAndCharacter } from './lineStarts';

describe('Line Starts Utility', () => {
  describe('computeLineStarts', () => {
    it('should return [0] for empty string', () => {
      const lineStarts = computeLineStarts('');
      expect(lineStarts).toEqual([0]);
    });

    it('should return [0] for single line without newline', () => {
      const lineStarts = computeLineStarts('hello world');
      expect(lineStarts).toEqual([0]);
    });

    it('should compute line starts for multiple lines', () => {
      const text = 'line1\nline2\nline3';
      const lineStarts = computeLineStarts(text);
      expect(lineStarts).toEqual([0, 6, 12]);
    });

    it('should handle empty lines', () => {
      const text = 'line1\n\nline3';
      const lineStarts = computeLineStarts(text);
      expect(lineStarts).toEqual([0, 6, 7]);
    });

    it('should handle text ending with newline', () => {
      const text = 'line1\nline2\n';
      const lineStarts = computeLineStarts(text);
      expect(lineStarts).toEqual([0, 6, 12]);
    });

    it('should handle Japanese text', () => {
      const text = 'これは\nテストです\n日本語';
      const lineStarts = computeLineStarts(text);
      expect(lineStarts).toEqual([0, 4, 10]);
    });
  });

  describe('offsetToLineAndCharacter', () => {
    it('should return line 0, character 0 for offset 0', () => {
      const lineStarts = [0, 6, 12];
      const result = offsetToLineAndCharacter(lineStarts, 0);
      expect(result).toEqual({ line: 0, character: 0 });
    });

    it('should return correct line and character for offset in first line', () => {
      const lineStarts = [0, 6, 12];
      const result = offsetToLineAndCharacter(lineStarts, 3);
      expect(result).toEqual({ line: 0, character: 3 });
    });

    it('should return correct line and character for offset at line start', () => {
      const lineStarts = [0, 6, 12];
      const result = offsetToLineAndCharacter(lineStarts, 6);
      expect(result).toEqual({ line: 1, character: 0 });
    });

    it('should return correct line and character for offset in middle line', () => {
      const lineStarts = [0, 6, 12];
      const result = offsetToLineAndCharacter(lineStarts, 8);
      expect(result).toEqual({ line: 1, character: 2 });
    });

    it('should return correct line and character for offset in last line', () => {
      const lineStarts = [0, 6, 12];
      const result = offsetToLineAndCharacter(lineStarts, 15);
      expect(result).toEqual({ line: 2, character: 3 });
    });

    it('should handle empty lineStarts array', () => {
      const lineStarts: number[] = [];
      const result = offsetToLineAndCharacter(lineStarts, 5);
      expect(result).toEqual({ line: 0, character: 5 });
    });

    it('should handle offset beyond text length', () => {
      const lineStarts = [0, 6, 12];
      const result = offsetToLineAndCharacter(lineStarts, 100);
      expect(result).toEqual({ line: 2, character: 88 });
    });

    it('should work with Japanese text offsets', () => {
      const text = 'これは\nテストです';
      const lineStarts = computeLineStarts(text);
      const result = offsetToLineAndCharacter(lineStarts, 7);
      expect(result).toEqual({ line: 1, character: 3 });
    });
  });

  describe('integration: computeLineStarts + offsetToLineAndCharacter', () => {
    it('should correctly map all positions in a multi-line text', () => {
      const text = 'abc\ndefg\nhi';
      const lineStarts = computeLineStarts(text);

      // Line 0: "abc\n" (0-3)
      expect(offsetToLineAndCharacter(lineStarts, 0)).toEqual({ line: 0, character: 0 });
      expect(offsetToLineAndCharacter(lineStarts, 2)).toEqual({ line: 0, character: 2 });

      // Line 1: "defg\n" (4-8)
      expect(offsetToLineAndCharacter(lineStarts, 4)).toEqual({ line: 1, character: 0 });
      expect(offsetToLineAndCharacter(lineStarts, 6)).toEqual({ line: 1, character: 2 });

      // Line 2: "hi" (9-10)
      expect(offsetToLineAndCharacter(lineStarts, 9)).toEqual({ line: 2, character: 0 });
      expect(offsetToLineAndCharacter(lineStarts, 10)).toEqual({ line: 2, character: 1 });
    });
  });
});
