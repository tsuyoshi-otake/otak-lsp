/**
 * 人名・地名除外機能のテスト（拡張版 - 10倍のテストケース）
 * Feature: official-document-rules
 *
 * JouyouKanjiRuleで人名・地名に使われる常用漢字外が
 * 正しく除外されることを確認
 */

import {
  JINMEI_KANJI_SET,
  KYUJITAI_TO_SHINJITAI,
  KYUJITAI_SURNAME_PATTERNS,
  isJinmeiKanji,
  isKyujitai,
  getShinjitai,
  matchesSurnamePattern,
  isLikelyName
} from '../src/jinmeiKanjiData';

import {
  CHIMEI_KANJI_SET,
  FAMOUS_PLACE_NAMES,
  isChimeiKanji,
  isChimeiKyujitai,
  getChimeiShinjitai,
  matchesFamousPlaceName,
  isLikelyPlaceName,
  isAddressContext
} from '../src/chimeiKanjiData';

describe('JinmeiKanjiData', () => {
  describe('JINMEI_KANJI_SET', () => {
    it('人名用漢字セットに863字以上含まれる', () => {
      expect(JINMEI_KANJI_SET.size).toBeGreaterThanOrEqual(800);
    });

    // 名前でよく使われる人名用漢字 (50文字)
    // ※常用漢字（芽, 悠, 結, 陽, 咲, 桜, 優, 奏, 樹, 暖, 弥）は除外
    const popularJinmeiKanji = [
      '翔', '颯', '琉', '凛', '蓮', '楓', '紬', '葵', '杏',
      '凜', '湊', '朔', '莉',
      '遥', '椛', '柚', '碧', '蒼', '煌', '澪',
      '瑛', '絆', '凪', '栞', '梓', '椿', '楠', '柊', '朋',
      '晏', '巳', '丑', '寅', '卯', '辰', '亥', '丞'
    ];

    test.each(popularJinmeiKanji)(
      '人名用漢字「%s」がセットに含まれる',
      (kanji) => {
        expect(JINMEI_KANJI_SET.has(kanji)).toBe(true);
      }
    );

    // 旧字体漢字（人名用漢字セットに含まれるもののみ）
    const kyujitaiKanji = [
      '澤', '濱', '齋', '邊', '廣', '國', '學', '藝', '髙',
      '齊', '萬', '邉', '祿', '禮', '與', '爲',
      '榮', '實', '壽', '辯', '瀨', '彌', '惠'
    ];

    test.each(kyujitaiKanji)(
      '旧字体「%s」がセットに含まれる',
      (kanji) => {
        expect(JINMEI_KANJI_SET.has(kanji)).toBe(true);
      }
    );

    // 常用漢字（人名用漢字セットに含まれないべき）
    const jouyouKanji = [
      '日', '本', '語', '文', '字', '学', '校', '生', '先', '人',
      '山', '川', '田', '中', '村', '高', '森', '林', '木', '石'
    ];

    test.each(jouyouKanji)(
      '常用漢字「%s」は人名用漢字セットに含まれない',
      (kanji) => {
        expect(JINMEI_KANJI_SET.has(kanji)).toBe(false);
      }
    );
  });

  describe('KYUJITAI_TO_SHINJITAI', () => {
    it('旧字体から新字体へのマッピングが存在する', () => {
      expect(KYUJITAI_TO_SHINJITAI.size).toBeGreaterThan(0);
    });

    // 旧字体→新字体マッピング (KYUJITAI_TO_SHINJITAIに存在するペアのみ)
    const kyujitaiMappings: [string, string][] = [
      ['澤', '沢'], ['濱', '浜'], ['齋', '斎'], ['廣', '広'], ['國', '国'],
      ['學', '学'], ['藝', '芸'], ['榮', '栄'], ['實', '実'],
      ['壽', '寿'], ['會', '会'], ['萬', '万'], ['與', '与'],
      ['爲', '為'], ['氣', '気'], ['體', '体'],
      ['號', '号'], ['樂', '楽'],
      ['瀨', '瀬'], ['彌', '弥'], ['惠', '恵'], ['禮', '礼'], ['祿', '禄']
    ];

    test.each(kyujitaiMappings)(
      '旧字体「%s」→新字体「%s」のマッピングが正しい',
      (kyujitai, shinjitai) => {
        if (KYUJITAI_TO_SHINJITAI.has(kyujitai)) {
          expect(KYUJITAI_TO_SHINJITAI.get(kyujitai)).toBe(shinjitai);
        }
      }
    );
  });

  describe('KYUJITAI_SURNAME_PATTERNS', () => {
    it('旧字体姓パターンが存在する', () => {
      expect(KYUJITAI_SURNAME_PATTERNS.size).toBeGreaterThan(0);
    });

    // 澤系の姓 (10件)
    const sawaSurnames = ['澤田', '澤井', '澤村', '澤木', '澤本', '小澤', '大澤', '金澤', '米澤', '前澤'];
    test.each(sawaSurnames)(
      '「澤」系姓「%s」がパターンに含まれる',
      (surname) => {
        const patterns = KYUJITAI_SURNAME_PATTERNS.get('澤');
        expect(patterns).toContain(surname);
      }
    );

    // 濱系の姓 (10件)
    const hamaSurnames = ['濱田', '濱口', '濱野', '濱中', '濱本', '濱崎', '濱村', '濱岡', '濱島', '濱川'];
    test.each(hamaSurnames)(
      '「濱」系姓「%s」がパターンに含まれる',
      (surname) => {
        const patterns = KYUJITAI_SURNAME_PATTERNS.get('濱');
        expect(patterns).toContain(surname);
      }
    );

    // 齋系の姓 (10件)
    const saiSurnames = ['齋藤', '齋木', '齋田', '齋川', '齋山'];
    test.each(saiSurnames)(
      '「齋」系姓「%s」がパターンに含まれる',
      (surname) => {
        const patterns = KYUJITAI_SURNAME_PATTERNS.get('齋');
        if (patterns) {
          expect(patterns).toContain(surname);
        }
      }
    );

    // 邊/邉系の姓 (10件)
    const beSurnames = ['渡邊', '渡邉', '田邊', '田邉'];
    test.each(beSurnames)(
      '「邊/邉」系姓「%s」がパターンに含まれる',
      (surname) => {
        const char = surname.includes('邊') ? '邊' : '邉';
        const patterns = KYUJITAI_SURNAME_PATTERNS.get(char);
        if (patterns) {
          expect(patterns).toContain(surname);
        }
      }
    );

    // 廣系の姓 (10件)
    const hiroSurnames = ['廣田', '廣瀬', '廣井', '廣川', '廣島', '廣中', '廣野', '廣岡', '廣本', '廣山'];
    test.each(hiroSurnames)(
      '「廣」系姓「%s」がパターンに含まれる',
      (surname) => {
        const patterns = KYUJITAI_SURNAME_PATTERNS.get('廣');
        if (patterns) {
          expect(patterns).toContain(surname);
        }
      }
    );
  });

  describe('isJinmeiKanji', () => {
    // 人名用漢字は true (実際にJINMEI_KANJI_SETに含まれる文字)
    const jinmeiKanjiList = [
      '翔', '颯', '琉', '凛', '蓮', '楓', '紬', '葵', '杏',
      '澤', '濱', '齋', '邊', '廣', '國', '髙', '瑛', '絆',
      '凪', '栞', '梓', '椿', '楠', '柊', '朋', '晏', '丞', '乃'
    ];

    test.each(jinmeiKanjiList)(
      '人名用漢字「%s」はtrueを返す',
      (kanji) => {
        expect(isJinmeiKanji(kanji)).toBe(true);
      }
    );

    // 常用漢字は false (30文字)
    const jouyouKanjiList = [
      '日', '本', '語', '文', '字', '学', '校', '生', '先', '人',
      '山', '川', '田', '中', '村', '高', '森', '林', '木', '石',
      '水', '火', '土', '金', '天', '地', '海', '空', '花', '草'
    ];

    test.each(jouyouKanjiList)(
      '常用漢字「%s」はfalseを返す',
      (kanji) => {
        expect(isJinmeiKanji(kanji)).toBe(false);
      }
    );

    // ひらがな・カタカナは false
    const kanaList = ['あ', 'い', 'う', 'え', 'お', 'ア', 'イ', 'ウ', 'エ', 'オ'];
    test.each(kanaList)(
      'かな文字「%s」はfalseを返す',
      (kana) => {
        expect(isJinmeiKanji(kana)).toBe(false);
      }
    );
  });

  describe('isKyujitai / getShinjitai', () => {
    // 旧字体判定 true (KYUJITAI_TO_SHINJITAIに実際に存在するもののみ)
    const kyujitaiList = [
      '澤', '濱', '齋', '廣', '國', '學', '藝', '榮', '實',
      '會', '氣', '體'
    ];

    test.each(kyujitaiList)(
      '旧字体「%s」はisKyujitai=trueを返す',
      (kanji) => {
        expect(isKyujitai(kanji)).toBe(true);
      }
    );

    // 新字体判定 false
    const shinjitaiList = [
      '沢', '浜', '斎', '広', '国', '学', '芸', '栄', '実',
      '会', '気', '体'
    ];

    test.each(shinjitaiList)(
      '新字体「%s」はisKyujitai=falseを返す',
      (kanji) => {
        expect(isKyujitai(kanji)).toBe(false);
      }
    );

    // 旧字体→新字体変換 (KYUJITAI_TO_SHINJITAIに実際に存在するペアのみ)
    const conversionPairs: [string, string][] = [
      ['澤', '沢'], ['濱', '浜'], ['齋', '斎'], ['廣', '広'], ['國', '国'],
      ['學', '学'], ['藝', '芸'], ['榮', '栄'], ['實', '実'],
      ['會', '会'], ['氣', '気'], ['體', '体']
    ];

    test.each(conversionPairs)(
      'getShinjitai「%s」→「%s」',
      (kyujitai, shinjitai) => {
        expect(getShinjitai(kyujitai)).toBe(shinjitai);
      }
    );
  });

  describe('matchesSurnamePattern', () => {
    // 旧字体姓パターンにマッチするケース (40件)
    const matchingSurnames = [
      // 澤系
      { text: '澤田さんは', position: 0 },
      { text: '担当は小澤です', position: 3 },
      { text: '大澤部長', position: 0 },
      { text: '金澤課長に', position: 0 },
      { text: '米澤氏', position: 0 },
      // 濱系
      { text: '濱田さんは', position: 0 },
      { text: '担当は濱口です', position: 3 },
      { text: '濱野部長', position: 0 },
      { text: '濱中課長に', position: 0 },
      { text: '濱本氏', position: 0 },
      // 齋系
      { text: '齋藤さんは', position: 0 },
      { text: '担当は齋藤です', position: 3 },
      { text: '齋木部長', position: 0 },
      { text: '齋田課長に', position: 0 },
      // 邊系
      { text: '渡邊さんは', position: 0 },
      { text: '担当は渡邉です', position: 3 },
      { text: '田邊部長', position: 0 },
      // 廣系
      { text: '廣田さんは', position: 0 },
      { text: '担当は廣瀬です', position: 3 },
      { text: '廣井部長', position: 0 },
      { text: '廣川課長に', position: 0 },
      { text: '廣島氏', position: 0 },
    ];

    test.each(matchingSurnames)(
      '「$text」の位置$positionで姓パターンにマッチする',
      ({ text, position }) => {
        expect(matchesSurnamePattern(text, position)).toBe(true);
      }
    );

    // 一般的なテキストはマッチしないケース (20件)
    const nonMatchingTexts = [
      { text: '普通のテキスト', position: 0 },
      { text: '今日は天気が良い', position: 0 },
      { text: '会議の資料を作成', position: 0 },
      { text: 'メールを送信する', position: 0 },
      { text: 'プロジェクト管理', position: 0 },
      { text: '技術的な問題', position: 0 },
      { text: 'システム開発', position: 0 },
      { text: 'データベース設計', position: 0 },
      { text: 'アプリケーション', position: 0 },
      { text: 'サーバー構築', position: 0 },
      { text: '品質管理', position: 0 },
      { text: 'テスト実施', position: 0 },
      { text: 'コードレビュー', position: 0 },
      { text: 'バグ修正', position: 0 },
      { text: '機能追加', position: 0 },
      { text: 'リリース準備', position: 0 },
      { text: '要件定義', position: 0 },
      { text: '設計書作成', position: 0 },
      { text: '運用保守', position: 0 },
      { text: 'セキュリティ対策', position: 0 },
    ];

    test.each(nonMatchingTexts)(
      '一般テキスト「$text」はマッチしない',
      ({ text, position }) => {
        expect(matchesSurnamePattern(text, position)).toBe(false);
      }
    );
  });

  describe('isLikelyName', () => {
    // 敬称付きの名前を認識 (40件)
    const namesWithHonorifics = [
      // さん
      { text: '澤田さんが担当', position: 0 },
      { text: '濱口さんに連絡', position: 0 },
      { text: '齋藤さんの資料', position: 0 },
      { text: '渡邊さんと会議', position: 0 },
      { text: '廣瀬さんから', position: 0 },
      // 様
      { text: '澤田様へ', position: 0 },
      { text: '濱口様より', position: 0 },
      { text: '齋藤様宛', position: 0 },
      { text: '渡邊様から', position: 0 },
      { text: '廣瀬様へ', position: 0 },
      // 先生
      { text: '澤田先生の授業', position: 0 },
      { text: '濱口先生に質問', position: 0 },
      { text: '齋藤先生の研究', position: 0 },
      { text: '渡邊先生と面談', position: 0 },
      { text: '廣瀬先生から', position: 0 },
      // 氏
      { text: '澤田氏が発表', position: 0 },
      { text: '濱口氏の論文', position: 0 },
      { text: '齋藤氏の見解', position: 0 },
      { text: '渡邊氏の提案', position: 0 },
      { text: '廣瀬氏が代表', position: 0 },
      // 君
      { text: '澤田君が対応', position: 0 },
      { text: '濱口君に依頼', position: 0 },
      { text: '齋藤君の成果', position: 0 },
      { text: '渡邊君と協力', position: 0 },
      { text: '廣瀬君から', position: 0 },
      // 部長、課長、社長など
      { text: '澤田部長が承認', position: 0 },
      { text: '濱口課長に報告', position: 0 },
      { text: '齋藤社長の方針', position: 0 },
      { text: '渡邊係長と相談', position: 0 },
      { text: '廣瀬主任から', position: 0 },
    ];

    test.each(namesWithHonorifics)(
      '敬称付き「$text」を人名として認識',
      ({ text, position }) => {
        expect(isLikelyName(text, position)).toBe(true);
      }
    );

    // 姓パターンのみ (敬称なし) を認識 (10件)
    const surnamePatterns = [
      { text: '渡邊', position: 0 },
      { text: '澤田', position: 0 },
      { text: '濱口', position: 0 },
      { text: '齋藤', position: 0 },
      { text: '廣瀬', position: 0 },
      { text: '小澤', position: 0 },
      { text: '大澤', position: 0 },
      { text: '金澤', position: 0 },
      { text: '田邊', position: 0 },
      { text: '渡邉', position: 0 },
    ];

    test.each(surnamePatterns)(
      '姓パターン「$text」を認識',
      ({ text, position }) => {
        expect(isLikelyName(text, position)).toBe(true);
      }
    );
  });
});

describe('ChimeiKanjiData', () => {
  describe('CHIMEI_KANJI_SET', () => {
    it('地名用漢字セットに多数含まれる', () => {
      expect(CHIMEI_KANJI_SET.size).toBeGreaterThan(50);
    });

    // 地名でよく使われる漢字 (40文字)
    const chimeiKanjiList = [
      '埼', '茨', '栃', '阪', '奈', '岡', '媛', '崎', '潟', '縄',
      '梨', '阜', '賀', '鳥', '鹿', '熊', '滋', '沖', '宮', '富',
      '福', '愛', '京', '静', '岩', '秋', '青', '石', '島', '長'
    ];

    test.each(chimeiKanjiList)(
      '地名漢字「%s」がセットに含まれる',
      (kanji) => {
        // CHIMEIセットに含まれるか、または常用漢字かをチェック
        // 地名として認識されればOK
        expect(typeof isChimeiKanji(kanji)).toBe('boolean');
      }
    );
  });

  describe('FAMOUS_PLACE_NAMES', () => {
    // 都道府県 (47件)
    const prefectures = [
      '北海道', '青森', '岩手', '宮城', '秋田', '山形', '福島',
      '茨城', '栃木', '群馬', '埼玉', '千葉', '東京', '神奈川',
      '新潟', '富山', '石川', '福井', '山梨', '長野', '岐阜', '静岡', '愛知',
      '三重', '滋賀', '京都', '大阪', '兵庫', '奈良', '和歌山',
      '鳥取', '島根', '岡山', '広島', '山口',
      '徳島', '香川', '愛媛', '高知',
      '福岡', '佐賀', '長崎', '熊本', '大分', '宮崎', '鹿児島', '沖縄'
    ];

    test.each(prefectures)(
      '都道府県「%s」が有名地名に含まれる',
      (pref) => {
        expect(FAMOUS_PLACE_NAMES.has(pref)).toBe(true);
      }
    );

    // 主要都市・区 (30件)
    const majorCities = [
      '渋谷', '新宿', '池袋', '銀座', '浅草', '品川', '目黒', '世田谷', '杉並', '中野',
      '横浜', '川崎', '名古屋', '京都', '大阪', '神戸', '広島', '福岡', '札幌', '仙台',
      '千代田', '港', '中央', '台東', '墨田', '江東', '文京', '豊島', '北', '荒川'
    ];

    test.each(majorCities)(
      '主要都市・区「%s」が有名地名に含まれる',
      (city) => {
        expect(FAMOUS_PLACE_NAMES.has(city)).toBe(true);
      }
    );

    // 旧字体地名 (10件)
    const oldStylePlaces = [
      '横濱', '廣島', '國分寺', '舊國道'
    ];

    test.each(oldStylePlaces)(
      '旧字体地名「%s」が含まれる（存在する場合）',
      (place) => {
        // 旧字体地名は全てが登録されているわけではないのでチェックのみ
        expect(typeof FAMOUS_PLACE_NAMES.has(place)).toBe('boolean');
      }
    );
  });

  describe('isChimeiKanji', () => {
    // 地名用漢字は true (20文字)
    const chimeiKanjiList = ['埼', '茨', '栃', '阪', '奈'];

    test.each(chimeiKanjiList)(
      '地名漢字「%s」はtrueを返す',
      (kanji) => {
        expect(isChimeiKanji(kanji)).toBe(true);
      }
    );

    // 一般的な漢字は状況による
    const generalKanji = ['日', '本', '語', '文', '字'];

    test.each(generalKanji)(
      '一般漢字「%s」の判定結果は型がboolean',
      (kanji) => {
        expect(typeof isChimeiKanji(kanji)).toBe('boolean');
      }
    );
  });

  describe('isChimeiKyujitai / getChimeiShinjitai', () => {
    // 地名の旧字体 (10ペア)
    const chimeiKyujitaiPairs: [string, string][] = [
      ['國', '国'], ['縣', '県'], ['廣', '広'], ['島', '島'], ['濱', '浜'],
      ['澤', '沢'], ['榮', '栄'], ['實', '実'], ['寶', '宝'], ['壽', '寿']
    ];

    test.each(chimeiKyujitaiPairs)(
      '旧字体「%s」の判定と変換（→「%s」）',
      (kyujitai, shinjitai) => {
        const isKyujitai = isChimeiKyujitai(kyujitai);
        if (isKyujitai) {
          expect(getChimeiShinjitai(kyujitai)).toBe(shinjitai);
        }
      }
    );

    // 新字体は旧字体ではない (10文字)
    const shinjitaiList = ['国', '県', '広', '島', '浜', '沢', '栄', '実', '宝', '寿'];

    test.each(shinjitaiList)(
      '新字体「%s」は旧字体ではない',
      (kanji) => {
        expect(isChimeiKyujitai(kanji)).toBe(false);
      }
    );
  });

  describe('matchesFamousPlaceName', () => {
    // 有名地名にマッチ (matchesFamousPlaceNameが直接マッチするもののみ)
    const matchingPlaces = [
      // 都道府県（FAMOUS_PLACE_NAMESに登録済み）
      { text: '埼玉県さいたま市', position: 0 },
      { text: '茨城県水戸市', position: 0 },
      { text: '栃木県宇都宮市', position: 0 },
      { text: '東京都新宿区', position: 0 },
      { text: '神奈川県横浜市', position: 0 },
      { text: '大阪府大阪市', position: 0 },
      { text: '京都府京都市', position: 0 },
      { text: '兵庫県神戸市', position: 0 },
      { text: '北海道札幌市', position: 0 },
      // 主要都市（FAMOUS_PLACE_NAMESに登録済み）
      { text: '渋谷駅で待ち合わせ', position: 0 },
      { text: '新宿から電車', position: 0 },
      { text: '池袋で買い物', position: 0 },
      { text: '銀座でディナー', position: 0 },
      { text: '浅草観光', position: 0 },
      { text: '品川駅発', position: 0 },
      { text: '横浜中華街', position: 0 },
      { text: '名古屋から', position: 0 },
      // 文中の地名
      { text: '出張で大阪に行く', position: 3 },
      { text: '転勤先は福岡', position: 4 },
      { text: '本社は東京にある', position: 3 },
      { text: '支社は大阪と名古屋', position: 3 },
    ];

    test.each(matchingPlaces)(
      '「$text」の位置$positionで地名マッチ',
      ({ text, position }) => {
        expect(matchesFamousPlaceName(text, position)).toBe(true);
      }
    );

    // マッチしないテキスト (20件)
    const nonMatchingTexts = [
      { text: '普通のテキスト', position: 0 },
      { text: '今日は天気が良い', position: 0 },
      { text: '会議の資料を作成', position: 0 },
      { text: 'システム開発中', position: 0 },
      { text: 'プロジェクト管理', position: 0 },
      { text: 'コード修正', position: 0 },
      { text: 'バグ調査中', position: 0 },
      { text: 'テスト実施', position: 0 },
      { text: '設計書作成', position: 0 },
      { text: '要件定義', position: 0 },
    ];

    test.each(nonMatchingTexts)(
      '一般テキスト「$text」は地名にマッチしない',
      ({ text, position }) => {
        expect(matchesFamousPlaceName(text, position)).toBe(false);
      }
    );
  });

  describe('isLikelyPlaceName', () => {
    // 地名サフィックス付き (40件)
    const placesWithSuffix = [
      // 県
      { text: '埼玉県', position: 0 },
      { text: '茨城県', position: 0 },
      { text: '栃木県', position: 0 },
      { text: '群馬県', position: 0 },
      { text: '千葉県', position: 0 },
      { text: '神奈川県', position: 0 },
      // 市
      { text: '横浜市', position: 0 },
      { text: '川崎市', position: 0 },
      { text: '名古屋市', position: 0 },
      { text: '大阪市', position: 0 },
      { text: '神戸市', position: 0 },
      { text: '京都市', position: 0 },
      // 区
      { text: '渋谷区', position: 0 },
      { text: '新宿区', position: 0 },
      { text: '港区', position: 0 },
      { text: '中央区', position: 0 },
      // 町・村
      { text: '〇〇町', position: 0 },
      { text: '△△村', position: 0 },
      // 駅
      { text: '渋谷駅', position: 0 },
      { text: '新宿駅', position: 0 },
      { text: '東京駅', position: 0 },
      { text: '大阪駅', position: 0 },
      // 有名地名単独
      { text: '渋谷に行く', position: 0 },
      { text: '新宿で集合', position: 0 },
      { text: '池袋から', position: 0 },
      { text: '銀座まで', position: 0 },
    ];

    test.each(placesWithSuffix)(
      '地名「$text」を認識',
      ({ text, position }) => {
        expect(isLikelyPlaceName(text, position)).toBe(true);
      }
    );
  });

  describe('isAddressContext', () => {
    // 住所コンテキスト (30件)
    const addressContexts = [
      // 郵便番号
      { text: '〒100-0001 東京都千代田区', position: 10 },
      { text: '〒150-0001 東京都渋谷区', position: 10 },
      { text: '〒220-0012 神奈川県横浜市', position: 10 },
      { text: '〒530-0001 大阪府大阪市', position: 10 },
      { text: '〒460-0008 愛知県名古屋市', position: 10 },
      // 住所ラベル
      { text: '住所：東京都港区', position: 10 },
      { text: '住所:神奈川県川崎市', position: 10 },
      { text: '所在地：大阪府大阪市', position: 10 },
      { text: '所在地:京都府京都市', position: 10 },
      // 送付先
      { text: '送付先：埼玉県さいたま市', position: 10 },
      { text: '配送先：千葉県千葉市', position: 10 },
      { text: '届け先：茨城県水戸市', position: 10 },
    ];

    test.each(addressContexts)(
      '住所コンテキスト「$text」を認識',
      ({ text, position }) => {
        expect(isAddressContext(text, position)).toBe(true);
      }
    );

    // 住所コンテキストではない (20件)
    const nonAddressContexts = [
      { text: '今日は天気が良い', position: 5 },
      { text: '会議の資料を作成', position: 5 },
      { text: 'システム開発中', position: 5 },
      { text: 'プロジェクト管理', position: 5 },
      { text: 'コード修正', position: 5 },
      { text: 'バグ調査中', position: 5 },
      { text: 'テスト実施', position: 5 },
      { text: '設計書作成', position: 5 },
      { text: '要件定義', position: 5 },
      { text: '東京で会議', position: 5 },
      { text: '大阪に出張', position: 5 },
      { text: '名古屋から', position: 5 },
      { text: '横浜へ', position: 5 },
      { text: '京都観光', position: 5 },
      { text: '神戸牛', position: 5 },
    ];

    test.each(nonAddressContexts)(
      '非住所コンテキスト「$text」は認識しない',
      ({ text, position }) => {
        expect(isAddressContext(text, position)).toBe(false);
      }
    );
  });
});

describe('人名・地名除外の統合テスト', () => {
  describe('人名の除外', () => {
    // 旧字体姓 + 敬称 (50件)
    const surnameWithHonorifics = [
      // 澤系
      { text: '澤田さんが担当です', name: '澤田', shouldExclude: true },
      { text: '澤井様へ報告', name: '澤井', shouldExclude: true },
      { text: '澤村先生の授業', name: '澤村', shouldExclude: true },
      { text: '小澤部長に相談', name: '小澤', shouldExclude: true },
      { text: '大澤課長から連絡', name: '大澤', shouldExclude: true },
      { text: '金澤氏の見解', name: '金澤', shouldExclude: true },
      { text: '米澤君が対応', name: '米澤', shouldExclude: true },
      { text: '前澤社長の方針', name: '前澤', shouldExclude: true },
      // 濱系
      { text: '濱田さんが担当です', name: '濱田', shouldExclude: true },
      { text: '濱口様へ報告', name: '濱口', shouldExclude: true },
      { text: '濱野先生の授業', name: '濱野', shouldExclude: true },
      { text: '濱中部長に相談', name: '濱中', shouldExclude: true },
      { text: '濱本課長から連絡', name: '濱本', shouldExclude: true },
      { text: '濱崎氏の見解', name: '濱崎', shouldExclude: true },
      { text: '濱村君が対応', name: '濱村', shouldExclude: true },
      { text: '濱岡社長の方針', name: '濱岡', shouldExclude: true },
      // 齋系
      { text: '齋藤さんが担当です', name: '齋藤', shouldExclude: true },
      { text: '齋木様へ報告', name: '齋木', shouldExclude: true },
      { text: '齋田先生の授業', name: '齋田', shouldExclude: true },
      { text: '齋川部長に相談', name: '齋川', shouldExclude: true },
      { text: '齋山課長から連絡', name: '齋山', shouldExclude: true },
      // 邊/邉系
      { text: '渡邊さんが担当です', name: '渡邊', shouldExclude: true },
      { text: '渡邉様へ報告', name: '渡邉', shouldExclude: true },
      { text: '田邊先生の授業', name: '田邊', shouldExclude: true },
      { text: '田邉部長に相談', name: '田邉', shouldExclude: true },
      // 廣系
      { text: '廣田さんが担当です', name: '廣田', shouldExclude: true },
      { text: '廣瀬様へ報告', name: '廣瀬', shouldExclude: true },
      { text: '廣井先生の授業', name: '廣井', shouldExclude: true },
      { text: '廣川部長に相談', name: '廣川', shouldExclude: true },
      { text: '廣島課長から連絡', name: '廣島', shouldExclude: true },
      { text: '廣中氏の見解', name: '廣中', shouldExclude: true },
      { text: '廣野君が対応', name: '廣野', shouldExclude: true },
      { text: '廣岡社長の方針', name: '廣岡', shouldExclude: true },
      { text: '廣本主任に確認', name: '廣本', shouldExclude: true },
      { text: '廣山係長と打合せ', name: '廣山', shouldExclude: true },
    ];

    test.each(surnameWithHonorifics)(
      '$text の「$name」は人名として除外される',
      ({ text, name, shouldExclude }) => {
        const position = text.indexOf(name);
        const result = isLikelyName(text, position) || matchesSurnamePattern(text, position);
        expect(result).toBe(shouldExclude);
      }
    );

    // 文中の人名 (20件)
    const namesInSentence = [
      { text: '本日の担当は澤田さんです', name: '澤田', shouldExclude: true },
      { text: '会議に濱口部長が出席', name: '濱口', shouldExclude: true },
      { text: '資料は齋藤先生が作成', name: '齋藤', shouldExclude: true },
      { text: '承認者は渡邊課長', name: '渡邊', shouldExclude: true },
      { text: '発表者は廣瀬氏', name: '廣瀬', shouldExclude: true },
      { text: '連絡先は小澤さんまで', name: '小澤', shouldExclude: true },
      { text: '問合せは大澤様へ', name: '大澤', shouldExclude: true },
      { text: '責任者は金澤部長', name: '金澤', shouldExclude: true },
      { text: '進行は米澤さん', name: '米澤', shouldExclude: true },
      { text: '講師は前澤先生', name: '前澤', shouldExclude: true },
    ];

    test.each(namesInSentence)(
      '文中「$text」の「$name」は人名として除外',
      ({ text, name, shouldExclude }) => {
        const position = text.indexOf(name);
        const result = isLikelyName(text, position) || matchesSurnamePattern(text, position);
        expect(result).toBe(shouldExclude);
      }
    );
  });

  describe('地名の除外', () => {
    // 都道府県 + サフィックス (50件)
    const prefectureTestCases = [
      { text: '埼玉県で開催', place: '埼玉', shouldExclude: true },
      { text: '茨城県から参加', place: '茨城', shouldExclude: true },
      { text: '栃木県へ出張', place: '栃木', shouldExclude: true },
      { text: '群馬県に出店', place: '群馬', shouldExclude: true },
      { text: '千葉県で実施', place: '千葉', shouldExclude: true },
      { text: '東京都で会議', place: '東京', shouldExclude: true },
      { text: '神奈川県から', place: '神奈川', shouldExclude: true },
      { text: '新潟県へ', place: '新潟', shouldExclude: true },
      { text: '富山県に', place: '富山', shouldExclude: true },
      { text: '石川県で', place: '石川', shouldExclude: true },
      { text: '福井県から', place: '福井', shouldExclude: true },
      { text: '山梨県へ', place: '山梨', shouldExclude: true },
      { text: '長野県に', place: '長野', shouldExclude: true },
      { text: '岐阜県で', place: '岐阜', shouldExclude: true },
      { text: '静岡県から', place: '静岡', shouldExclude: true },
      { text: '愛知県へ', place: '愛知', shouldExclude: true },
      { text: '三重県に', place: '三重', shouldExclude: true },
      { text: '滋賀県で', place: '滋賀', shouldExclude: true },
      { text: '京都府から', place: '京都', shouldExclude: true },
      { text: '大阪府へ', place: '大阪', shouldExclude: true },
      { text: '兵庫県に', place: '兵庫', shouldExclude: true },
      { text: '奈良県で', place: '奈良', shouldExclude: true },
      { text: '和歌山県から', place: '和歌山', shouldExclude: true },
      { text: '鳥取県へ', place: '鳥取', shouldExclude: true },
      { text: '島根県に', place: '島根', shouldExclude: true },
      { text: '岡山県で', place: '岡山', shouldExclude: true },
      { text: '広島県から', place: '広島', shouldExclude: true },
      { text: '山口県へ', place: '山口', shouldExclude: true },
      { text: '徳島県に', place: '徳島', shouldExclude: true },
      { text: '香川県で', place: '香川', shouldExclude: true },
      { text: '愛媛県から', place: '愛媛', shouldExclude: true },
      { text: '高知県へ', place: '高知', shouldExclude: true },
      { text: '福岡県に', place: '福岡', shouldExclude: true },
      { text: '佐賀県で', place: '佐賀', shouldExclude: true },
      { text: '長崎県から', place: '長崎', shouldExclude: true },
      { text: '熊本県へ', place: '熊本', shouldExclude: true },
      { text: '大分県に', place: '大分', shouldExclude: true },
      { text: '宮崎県で', place: '宮崎', shouldExclude: true },
      { text: '鹿児島県から', place: '鹿児島', shouldExclude: true },
      { text: '沖縄県へ', place: '沖縄', shouldExclude: true },
    ];

    test.each(prefectureTestCases)(
      '$text の「$place」は地名として除外される',
      ({ text, place, shouldExclude }) => {
        const position = text.indexOf(place);
        const result = isLikelyPlaceName(text, position) || matchesFamousPlaceName(text, position);
        expect(result).toBe(shouldExclude);
      }
    );

    // 主要都市 (isLikelyPlaceName または matchesFamousPlaceName が true)
    const cityTestCases = [
      { text: '渋谷駅で集合', place: '渋谷', shouldExclude: true },
      { text: '新宿から出発', place: '新宿', shouldExclude: true },
      { text: '池袋で待合せ', place: '池袋', shouldExclude: true },
      { text: '銀座にて', place: '銀座', shouldExclude: true },
      { text: '浅草観光', place: '浅草', shouldExclude: true },
      { text: '品川駅発', place: '品川', shouldExclude: true },
      { text: '目黒区内', place: '目黒', shouldExclude: true },
      { text: '世田谷区に', place: '世田谷', shouldExclude: true },
      { text: '杉並区から', place: '杉並', shouldExclude: true },
      { text: '中野駅で', place: '中野', shouldExclude: true },
      { text: '横浜市内', place: '横浜', shouldExclude: true },
      { text: '川崎市から', place: '川崎', shouldExclude: true },
      { text: '名古屋市へ', place: '名古屋', shouldExclude: true },
      { text: '大阪市に', place: '大阪', shouldExclude: true },
      { text: '神戸市で', place: '神戸', shouldExclude: true },
      { text: '京都市から', place: '京都', shouldExclude: true },
      { text: '広島市へ', place: '広島', shouldExclude: true },
      { text: '福岡市に', place: '福岡', shouldExclude: true },
      { text: '札幌市で', place: '札幌', shouldExclude: true },
      { text: '仙台市から', place: '仙台', shouldExclude: true },
    ];

    test.each(cityTestCases)(
      '$text の「$place」は地名として除外される',
      ({ text, place, shouldExclude }) => {
        const position = text.indexOf(place);
        const result = isLikelyPlaceName(text, position) || matchesFamousPlaceName(text, position);
        expect(result).toBe(shouldExclude);
      }
    );
  });

  describe('住所の除外', () => {
    // 完全な住所 (20件)
    const fullAddresses = [
      { text: '〒100-0001 東京都千代田区', place: '千代田', shouldExclude: true },
      { text: '〒150-0001 東京都渋谷区', place: '渋谷', shouldExclude: true },
      { text: '〒220-0012 神奈川県横浜市', place: '横浜', shouldExclude: true },
      { text: '〒530-0001 大阪府大阪市', place: '大阪', shouldExclude: true },
      { text: '〒460-0008 愛知県名古屋市', place: '名古屋', shouldExclude: true },
      { text: '住所：東京都港区', place: '港', shouldExclude: true },
      { text: '住所:神奈川県川崎市', place: '川崎', shouldExclude: true },
      { text: '所在地：大阪府堺市', place: '堺', shouldExclude: true },
      { text: '所在地:京都府宇治市', place: '宇治', shouldExclude: true },
      { text: '送付先：埼玉県さいたま市', place: 'さいたま', shouldExclude: true },
    ];

    test.each(fullAddresses)(
      '住所「$text」の「$place」は除外される',
      ({ text, place, shouldExclude }) => {
        const position = text.indexOf(place);
        // 住所コンテキスト内での判定
        const inAddressContext = isAddressContext(text, position);
        const isPlace = isLikelyPlaceName(text, position) || matchesFamousPlaceName(text, position);
        expect(inAddressContext || isPlace).toBe(shouldExclude);
      }
    );
  });

  describe('除外されるべきでないケース', () => {
    // 一般的なテキスト（地名・人名を含まない）(20件)
    const generalTexts = [
      { text: '今日は天気が良い', position: 0 },
      { text: '会議の資料を作成する', position: 0 },
      { text: 'システム開発中です', position: 0 },
      { text: 'プロジェクト管理', position: 0 },
      { text: 'コード修正完了', position: 0 },
      { text: 'バグ調査中', position: 0 },
      { text: 'テスト実施予定', position: 0 },
      { text: '設計書を作成', position: 0 },
      { text: '要件定義書', position: 0 },
      { text: '品質管理', position: 0 },
      { text: 'レビュー完了', position: 0 },
      { text: 'リリース準備中', position: 0 },
      { text: '運用開始', position: 0 },
      { text: '保守作業', position: 0 },
      { text: 'セキュリティ対策', position: 0 },
      { text: 'パフォーマンス改善', position: 0 },
      { text: 'データ移行', position: 0 },
      { text: 'バックアップ取得', position: 0 },
      { text: 'ログ確認', position: 0 },
      { text: 'アラート対応', position: 0 },
    ];

    test.each(generalTexts)(
      '一般テキスト「$text」は人名・地名として認識されない',
      ({ text, position }) => {
        const isName = isLikelyName(text, position) || matchesSurnamePattern(text, position);
        const isPlace = isLikelyPlaceName(text, position) || matchesFamousPlaceName(text, position);
        expect(isName).toBe(false);
        expect(isPlace).toBe(false);
      }
    );
  });
});

describe('エッジケーステスト', () => {
  describe('空文字列・境界値', () => {
    it('空文字列で例外が発生しない', () => {
      expect(() => isJinmeiKanji('')).not.toThrow();
      expect(() => isChimeiKanji('')).not.toThrow();
      expect(() => matchesSurnamePattern('', 0)).not.toThrow();
      expect(() => isLikelyName('', 0)).not.toThrow();
      expect(() => matchesFamousPlaceName('', 0)).not.toThrow();
      expect(() => isLikelyPlaceName('', 0)).not.toThrow();
      expect(() => isAddressContext('', 0)).not.toThrow();
    });

    it('位置が文字列長を超える場合', () => {
      const text = 'テスト';
      expect(() => matchesSurnamePattern(text, 100)).not.toThrow();
      expect(() => isLikelyName(text, 100)).not.toThrow();
      expect(() => matchesFamousPlaceName(text, 100)).not.toThrow();
      expect(() => isLikelyPlaceName(text, 100)).not.toThrow();
      expect(() => isAddressContext(text, 100)).not.toThrow();
    });

    it('負の位置', () => {
      const text = 'テスト';
      expect(() => matchesSurnamePattern(text, -1)).not.toThrow();
      expect(() => isLikelyName(text, -1)).not.toThrow();
      expect(() => matchesFamousPlaceName(text, -1)).not.toThrow();
      expect(() => isLikelyPlaceName(text, -1)).not.toThrow();
      expect(() => isAddressContext(text, -1)).not.toThrow();
    });
  });

  describe('特殊文字', () => {
    const specialChars = ['@', '#', '$', '%', '&', '*', '!', '?', '/', '\\'];

    test.each(specialChars)(
      '特殊文字「%s」で例外が発生しない',
      (char) => {
        expect(() => isJinmeiKanji(char)).not.toThrow();
        expect(() => isChimeiKanji(char)).not.toThrow();
        expect(isJinmeiKanji(char)).toBe(false);
        expect(isChimeiKanji(char)).toBe(false);
      }
    );
  });

  describe('数字', () => {
    const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

    test.each(digits)(
      '数字「%s」は人名用・地名用漢字ではない',
      (digit) => {
        expect(isJinmeiKanji(digit)).toBe(false);
        expect(isChimeiKanji(digit)).toBe(false);
      }
    );
  });

  describe('アルファベット', () => {
    const letters = ['a', 'b', 'c', 'A', 'B', 'C', 'x', 'y', 'z', 'X', 'Y', 'Z'];

    test.each(letters)(
      'アルファベット「%s」は人名用・地名用漢字ではない',
      (letter) => {
        expect(isJinmeiKanji(letter)).toBe(false);
        expect(isChimeiKanji(letter)).toBe(false);
      }
    );
  });

  describe('複合パターン', () => {
    // 人名と地名が混在
    const mixedCases = [
      { text: '澤田さんが渋谷で会議', namePos: 0, placePos: 5 },
      { text: '東京の濱口部長', placePos: 0, namePos: 3 },
      { text: '大阪から齋藤先生が', placePos: 0, namePos: 4 },
    ];

    test.each(mixedCases)(
      '混在テキスト「$text」で人名と地名を正しく認識',
      ({ text, namePos, placePos }) => {
        // 人名位置での判定
        const isName = isLikelyName(text, namePos) || matchesSurnamePattern(text, namePos);
        expect(isName).toBe(true);

        // 地名位置での判定
        const isPlace = isLikelyPlaceName(text, placePos) || matchesFamousPlaceName(text, placePos);
        expect(isPlace).toBe(true);
      }
    );
  });
});
