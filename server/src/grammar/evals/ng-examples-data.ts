/**
 * NG Examples Data for Evals
 * Feature: advanced-grammar-rules
 * Task: 23. NG例データファイルの作成
 *
 * 全31カテゴリのNG例を構造化データとして定義
 * 2025-12-10時点の全NG例を含む
 */

/**
 * NG例のステータス
 */
export type NGExampleStatus = 'IMPLEMENTED' | 'NOT_IMPL';

/**
 * NG例カテゴリ
 */
export interface NGExampleCategory {
  /** カテゴリID */
  id: string;
  /** カテゴリ名 */
  name: string;
  /** 説明 */
  description: string;
  /** 期待されるルールコード */
  expectedRule: string;
  /** 実装ステータス */
  status: NGExampleStatus;
  /** NG例のリスト */
  examples: NGExample[];
}

/**
 * NG例
 */
export interface NGExample {
  /** 例文（NG） */
  text: string;
  /** 正しい例文（あれば） */
  correctText?: string;
  /** 説明 */
  description?: string;
}

/**
 * 全NG例カテゴリデータ
 */
export const NG_EXAMPLE_CATEGORIES: NGExampleCategory[] = [
  // ==========================================
  // 実装済みルール（15カテゴリ）
  // ==========================================

  // 1. 二重助詞
  {
    id: 'double-particle',
    name: '二重助詞',
    description: '同じ助詞が連続して出現する誤り',
    expectedRule: 'double-particle',
    status: 'IMPLEMENTED',
    examples: [
      { text: '私がが行く', correctText: '私が行く', description: '「が」の重複' },
      { text: '本をを読む', correctText: '本を読む', description: '「を」の重複' },
      { text: '学校にに行く', correctText: '学校に行く', description: '「に」の重複' },
      { text: '彼とと話す', correctText: '彼と話す', description: '「と」の重複' }
    ]
  },

  // 2. 助詞連続
  {
    id: 'particle-sequence',
    name: '助詞連続',
    description: '不適切な助詞の連続使用',
    expectedRule: 'particle-sequence',
    status: 'IMPLEMENTED',
    examples: [
      { text: '彼がを見た', description: '「がを」の不適切な連続' },
      { text: '私をが呼んだ', description: '「をが」の不適切な連続' },
      { text: '本にを置く', description: '「にを」の不適切な連続' }
    ]
  },

  // 3. 動詞-助詞不整合
  {
    id: 'verb-particle-mismatch',
    name: '動詞-助詞不整合',
    description: '自動詞と「を」の不自然な組み合わせ',
    expectedRule: 'verb-particle-mismatch',
    status: 'IMPLEMENTED',
    examples: [
      { text: '公園を行く', correctText: '公園に行く', description: '「行く」は自動詞' },
      { text: '家を帰る', correctText: '家に帰る', description: '「帰る」は自動詞' },
      { text: 'プールを泳ぐ', correctText: 'プールで泳ぐ', description: '「泳ぐ」は自動詞' }
    ]
  },

  // 4. 冗長な助動詞
  {
    id: 'redundant-copula',
    name: '冗長な助動詞',
    description: '助詞と助動詞の不自然な組み合わせ',
    expectedRule: 'particle-sequence',
    status: 'IMPLEMENTED',
    examples: [
      { text: '問題でです', correctText: '問題です', description: '「でです」は冗長' },
      { text: '原因でます', correctText: '原因です', description: '「でます」は不自然' },
      { text: 'そこにです', correctText: 'そこです', description: '「にです」は不自然' }
    ]
  },

  // 5. 文体混在
  {
    id: 'style-inconsistency',
    name: '文体混在',
    description: '敬体（です・ます調）と常体（である調）の混在',
    expectedRule: 'style-inconsistency',
    status: 'IMPLEMENTED',
    examples: [
      {
        text: 'これは素敵です。あれは平凡である。',
        description: '「です」と「である」の混在'
      },
      {
        text: 'システムは正常に動作します。しかし、問題が残っている。',
        description: '「ます」と常体の混在'
      }
    ]
  },

  // 6. ら抜き言葉
  {
    id: 'ra-nuki',
    name: 'ら抜き言葉',
    description: '可能の助動詞「られる」から「ら」を省略した表現',
    expectedRule: 'ra-nuki',
    status: 'IMPLEMENTED',
    examples: [
      { text: '食べれる', correctText: '食べられる', description: '一段活用動詞のら抜き' },
      { text: '見れる', correctText: '見られる', description: '一段活用動詞のら抜き' },
      { text: '起きれる', correctText: '起きられる', description: '一段活用動詞のら抜き' },
      { text: '考えれる', correctText: '考えられる', description: '一段活用動詞のら抜き' }
    ]
  },

  // 7. 二重否定
  {
    id: 'double-negation',
    name: '二重否定',
    description: '否定表現が二重に使用される表現',
    expectedRule: 'double-negation',
    status: 'IMPLEMENTED',
    examples: [
      { text: 'できないわけではない', correctText: 'できる', description: '典型的な二重否定' },
      { text: '知らないことはない', correctText: '知っている', description: '「ないことはない」パターン' },
      { text: '行かないとは言えない', description: '「ないとは言えない」パターン' },
      { text: '嫌いではなくはない', description: '「ではなくはない」パターン' }
    ]
  },

  // 8. 同じ助詞の連続使用
  {
    id: 'particle-repetition',
    name: '同じ助詞の連続使用',
    description: '同一文内で同じ助詞が繰り返し使用される',
    expectedRule: 'particle-repetition',
    status: 'IMPLEMENTED',
    examples: [
      { text: '私は本を彼は読む', description: '「は」が2回出現' },
      { text: '東京の会社の社長の息子', description: '「の」が3回連続' },
      { text: '私が彼が正しいと思う', description: '「が」が2回出現' }
    ]
  },

  // 9. 接続詞連続使用
  {
    id: 'conjunction-repetition',
    name: '接続詞連続使用',
    description: '同じ接続詞が連続する文で使用される',
    expectedRule: 'conjunction-repetition',
    status: 'IMPLEMENTED',
    examples: [
      { text: 'しかし、Aです。しかし、Bです。', description: '「しかし」の連続' },
      { text: 'また、これは正しい。また、あれも正しい。', description: '「また」の連続' },
      { text: 'そして、出発した。そして、到着した。', description: '「そして」の連続' }
    ]
  },

  // 10. 逆接「が」連続使用
  {
    id: 'adversative-ga',
    name: '逆接「が」連続使用',
    description: '逆接の「が」が連続する文で使用される',
    expectedRule: 'adversative-ga',
    status: 'IMPLEMENTED',
    examples: [
      { text: '行きますが、Aです。行きますが、Bです。', description: '逆接「が」の連続' },
      { text: '分かりますが、難しいです。分かりますが、時間がかかります。', description: '逆接「が」の連続' }
    ]
  },

  // 11. 全角半角混在
  {
    id: 'alphabet-width',
    name: '全角半角アルファベット混在',
    description: '全角と半角のアルファベットが混在している',
    expectedRule: 'alphabet-width',
    status: 'IMPLEMENTED',
    examples: [
      { text: 'これはＡＢＣとabcの混在です', correctText: 'これはABCとabcです（どちらかに統一）', description: '全角と半角の混在' },
      { text: 'ＴＥＳＴとtest', description: '全角TESTと半角testの混在' }
    ]
  },

  // 12. 弱い表現
  {
    id: 'weak-expression',
    name: '弱い表現',
    description: '曖昧で弱い表現',
    expectedRule: 'weak-expression',
    status: 'IMPLEMENTED',
    examples: [
      { text: 'これは正しいかもしれない', correctText: 'これは正しい可能性がある', description: '「かもしれない」は弱い' },
      { text: 'そうだと思われる', correctText: 'そうだと考えられる', description: '「と思われる」は弱い' },
      { text: 'ような気がする', correctText: 'と推測される', description: '「気がする」は弱い' }
    ]
  },

  // 13. 読点過多
  {
    id: 'comma-count',
    name: '読点過多',
    description: '1文中の読点が多すぎる',
    expectedRule: 'comma-count',
    status: 'IMPLEMENTED',
    examples: [
      { text: '私は、今日、朝、昼、夜、と、食事をしました。', description: '読点が6個（閾値超過）' },
      { text: '彼は、急いで、駅に、向かい、電車に、乗り、会社に、着いた。', description: '読点が7個（閾値超過）' }
    ]
  },

  // 14. 技術用語表記
  {
    id: 'term-notation',
    name: '技術用語表記',
    description: '技術用語の誤った表記',
    expectedRule: 'term-notation',
    status: 'IMPLEMENTED',
    examples: [
      { text: 'Javascriptを使用します', correctText: 'JavaScriptを使用します' },
      { text: 'Githubで公開します', correctText: 'GitHubで公開します' },
      { text: 'chatgptで生成する', correctText: 'ChatGPTで生成する' },
      { text: 'awsのサービス', correctText: 'AWSのサービス' },
      { text: 'azureを使う', correctText: 'Azureを使う' },
      { text: 'typescriptで開発', correctText: 'TypeScriptで開発' }
    ]
  },

  // 15. 漢字開き
  {
    id: 'kanji-opening',
    name: '漢字開き',
    description: 'ひらがなで書くべき漢字',
    expectedRule: 'kanji-opening',
    status: 'IMPLEMENTED',
    examples: [
      { text: '確認して下さい', correctText: '確認してください' },
      { text: 'それは出来る', correctText: 'それはできる' },
      { text: '有難うございます', correctText: 'ありがとうございます' },
      { text: '宜しくお願いします', correctText: 'よろしくお願いします' },
      { text: '頂きます', correctText: 'いただきます' }
    ]
  },

  // ==========================================
  // 未実装ルール（16カテゴリ）
  // ==========================================

  // 16. 冗長表現 (Feature: additional-grammar-rules - IMPLEMENTED)
  {
    id: 'redundant-expression',
    name: '冗長表現',
    description: '重複した意味を持つ表現',
    expectedRule: 'redundant-expression',
    status: 'IMPLEMENTED',
    examples: [
      { text: '馬から落馬する', correctText: '落馬する', description: '「馬から」と「落馬」が重複' },
      { text: '後で後悔する', correctText: '後悔する', description: '「後で」と「後悔」が重複' },
      { text: '一番最初', correctText: '最初', description: '「一番」と「最初」が重複' },
      { text: '各々それぞれ', correctText: 'それぞれ', description: '「各々」と「それぞれ」が重複' }
    ]
  },

  // 17. 重複表現（同語反復） (Feature: additional-grammar-rules - IMPLEMENTED)
  {
    id: 'tautology',
    name: '重複表現（同語反復）',
    description: '同じ意味の言葉を重ねた表現',
    expectedRule: 'tautology',
    status: 'IMPLEMENTED',
    examples: [
      { text: '頭痛が痛い', correctText: '頭が痛い / 頭痛がする', description: '「頭」と「痛い」が重複' },
      { text: '違和感を感じる', correctText: '違和感がある', description: '「感」が重複' },
      { text: '被害を被る', correctText: '被害を受ける', description: '「被」が重複' },
      { text: '犯罪を犯す', correctText: '罪を犯す', description: '「犯」が重複' }
    ]
  },

  // 18. サ変動詞の誤用
  {
    id: 'sahen-verb',
    name: 'サ変動詞',
    description: 'サ変動詞の使い方の問題',
    expectedRule: 'sahen-verb',
    status: 'NOT_IMPL',
    examples: [
      { text: '勉強をする', correctText: '勉強する', description: '「を」は不要（場合による）' },
      { text: '料理をする', correctText: '料理する', description: '「を」は不要（場合による）' }
    ]
  },

  // 19. 主語の欠如
  {
    id: 'missing-subject',
    name: '主語の欠如',
    description: '文の主語が不明確',
    expectedRule: 'missing-subject',
    status: 'NOT_IMPL',
    examples: [
      { text: '昨日、買いました。', description: '何を買ったか不明' },
      { text: 'とても嬉しかったです。', description: '何が嬉しかったか不明（文脈による）' }
    ]
  },

  // 20. ねじれ文
  {
    id: 'twisted-sentence',
    name: 'ねじれ文',
    description: '主語と述語が対応していない文',
    expectedRule: 'twisted-sentence',
    status: 'NOT_IMPL',
    examples: [
      { text: '私の夢は医者になりたいです', correctText: '私の夢は医者になることです', description: '主語「夢は」と述語「なりたい」が不対応' },
      { text: '彼の特技は絵を上手です', correctText: '彼の特技は絵を描くことです', description: '主語と述語のねじれ' }
    ]
  },

  // 21. 長すぎる文 (Feature: additional-grammar-rules - IMPLEMENTED)
  {
    id: 'long-sentence',
    name: '長すぎる文',
    description: '一文が長すぎて読みにくい',
    expectedRule: 'long-sentence',
    status: 'IMPLEMENTED',
    examples: [
      {
        text: '私は昨日の朝早く起きて朝食を食べてから会社に向かい午前中は会議に出席して午後は資料を作成し夕方には上司に報告して帰宅したが、その日の仕事はとても忙しくて大変だったので、帰宅後はすぐに寝てしまい、翌朝目覚めたときには疲れが残っていたのでコーヒーを飲んだ。',
        description: '一文が長すぎる（分割が必要）'
      }
    ]
  },

  // 22. 同音異義語
  {
    id: 'homophone',
    name: '同音異義語',
    description: '同じ読みで異なる意味の言葉の誤用',
    expectedRule: 'homophone',
    status: 'NOT_IMPL',
    examples: [
      { text: '意志が低い', correctText: '意識が低い / 志が低い', description: '「意志」と「意識」の混同' },
      { text: '移動の制約', correctText: '異動の制約', description: '会社の異動の場合' }
    ]
  },

  // 23. 敬語の誤用
  {
    id: 'honorific-error',
    name: '敬語の誤用',
    description: '敬語の使い方の誤り',
    expectedRule: 'honorific-error',
    status: 'NOT_IMPL',
    examples: [
      { text: 'お客様がおっしゃられました', correctText: 'お客様がおっしゃいました', description: '二重敬語' },
      { text: 'ご覧になられる', correctText: 'ご覧になる', description: '二重敬語' },
      { text: '部長がお見えになられる', correctText: '部長がお見えになる', description: '二重敬語' }
    ]
  },

  // 24. 副詞の呼応
  {
    id: 'adverb-agreement',
    name: '副詞の呼応',
    description: '副詞と述語の呼応の誤り',
    expectedRule: 'adverb-agreement',
    status: 'NOT_IMPL',
    examples: [
      { text: '決して行きます', correctText: '決して行きません', description: '「決して」は否定文と呼応' },
      { text: 'たぶん行きません', correctText: 'たぶん行くでしょう', description: '「たぶん」は肯定推量と呼応' },
      { text: 'もし晴れたら行かない', correctText: 'もし晴れたら行く', description: '「もし」は仮定の帰結と呼応' }
    ]
  },

  // 25. 助詞「の」の連続 (Feature: additional-grammar-rules - IMPLEMENTED)
  {
    id: 'no-particle-chain',
    name: '助詞「の」の連続',
    description: '「の」が連続して使用される',
    expectedRule: 'no-particle-chain',
    status: 'IMPLEMENTED',
    examples: [
      { text: '東京の会社の部長の息子の友達', description: '「の」が4回連続' },
      { text: '彼の家の庭の花', description: '「の」が3回連続' }
    ]
  },

  // 26. 修飾語の位置
  {
    id: 'modifier-position',
    name: '修飾語の位置',
    description: '修飾語の配置が不適切',
    expectedRule: 'modifier-position',
    status: 'NOT_IMPL',
    examples: [
      { text: '赤い大きな花', correctText: '大きな赤い花', description: '大きさの修飾語は色より前' },
      { text: '古い素敵な本', correctText: '素敵な古い本', description: '主観的修飾語は前' }
    ]
  },

  // 27. 曖昧な指示語
  {
    id: 'ambiguous-demonstrative',
    name: '曖昧な指示語',
    description: '指示語の参照先が不明確',
    expectedRule: 'ambiguous-demonstrative',
    status: 'NOT_IMPL',
    examples: [
      { text: 'それは問題だ。しかし、それも重要だ。', description: '「それ」が何を指すか不明' },
      { text: 'これについては、あれを参照してください。', description: '「これ」「あれ」が不明確' }
    ]
  },

  // 28. 受身の多用
  {
    id: 'passive-overuse',
    name: '受身の多用',
    description: '受身表現の使いすぎ',
    expectedRule: 'passive-overuse',
    status: 'NOT_IMPL',
    examples: [
      {
        text: '報告書が作成された。結果が分析された。結論が導かれた。',
        correctText: '報告書を作成した。結果を分析した。結論を導いた。',
        description: '受身が連続'
      }
    ]
  },

  // 29. 名詞の連続
  {
    id: 'noun-chain',
    name: '名詞の連続',
    description: '名詞が連続して読みにくい',
    expectedRule: 'noun-chain',
    status: 'NOT_IMPL',
    examples: [
      { text: '東京都渋谷区松濤一丁目住所', description: '名詞が連続' },
      { text: '品質管理体制強化計画書', description: '名詞が連続で読みにくい' }
    ]
  },

  // 30. 接続詞の誤用
  {
    id: 'conjunction-misuse',
    name: '接続詞の誤用',
    description: '接続詞の使い方が文脈に合わない',
    expectedRule: 'conjunction-misuse',
    status: 'NOT_IMPL',
    examples: [
      { text: '晴れた。しかし、外出した。', correctText: '晴れた。そこで、外出した。', description: '逆接の接続詞が不適切' },
      { text: '忙しい。だから、暇だ。', description: '順接の接続詞が不適切' }
    ]
  },

  // 31. 文末表現の単調さ (Feature: additional-grammar-rules - IMPLEMENTED)
  {
    id: 'monotonous-ending',
    name: '文末表現の単調さ',
    description: '同じ文末表現が繰り返される',
    expectedRule: 'monotonous-ending',
    status: 'IMPLEMENTED',
    examples: [
      {
        text: 'Aです。Bです。Cです。Dです。',
        description: '「です」が連続して単調'
      },
      {
        text: '行きました。食べました。見ました。帰りました。',
        description: '「ました」が連続して単調'
      }
    ]
  }
];

/**
 * 実装済みカテゴリを取得
 */
export function getImplementedCategories(): NGExampleCategory[] {
  return NG_EXAMPLE_CATEGORIES.filter(c => c.status === 'IMPLEMENTED');
}

/**
 * 未実装カテゴリを取得
 */
export function getNotImplementedCategories(): NGExampleCategory[] {
  return NG_EXAMPLE_CATEGORIES.filter(c => c.status === 'NOT_IMPL');
}

/**
 * 全例文数を取得
 */
export function getTotalExampleCount(): number {
  return NG_EXAMPLE_CATEGORIES.reduce((sum, c) => sum + c.examples.length, 0);
}

/**
 * 実装済み例文数を取得
 */
export function getImplementedExampleCount(): number {
  return getImplementedCategories().reduce((sum, c) => sum + c.examples.length, 0);
}
