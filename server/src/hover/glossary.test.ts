/**
 * Glossary Description Tests
 * Feature: japanese-grammar-analyzer
 *
 * 用語図鑑の説明文は、ホバー品質に直結するため
 * 明らかに「適当」になりやすいテンプレ文言の混入を防ぐ。
 */

import { getGlossaryDefinitions } from './glossary';

describe('Glossary descriptions', () => {
  it('should not include legacy generic console placeholder text', () => {
    const forbidden = 'コンソール上のリソース名/設定項目として使われる';
    for (const glossary of getGlossaryDefinitions()) {
      for (const entry of glossary.entries) {
        expect(entry.description).not.toContain(forbidden);
      }
    }
  });
});

