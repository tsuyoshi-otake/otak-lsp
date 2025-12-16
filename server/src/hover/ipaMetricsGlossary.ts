/**
 * IPA ソフトウェア開発分析データ集 用語図鑑
 * 独立行政法人情報処理推進機構（IPA）のソフトウェア開発データ白書・分析データ集で使用される用語
 */

import { CliGlossaryEntry } from './gitGlossary';

export const IPA_METRICS_GLOSSARY: ReadonlyArray<CliGlossaryEntry> = [
  // ========================================
  // 規模指標
  // ========================================
  { term: 'SLOC', aliases: ['Source Lines of Code', 'ソースコード行数', 'LOC', 'Lines of Code'], description: 'ソースコードの行数。規模を測定する基本的な指標。' },
  { term: 'KSLOC', aliases: ['Kilo SLOC', 'KLOC'], description: '1000行単位のソースコード行数（SLOC÷1000）。' },
  { term: '実効SLOC', aliases: ['Effective SLOC'], description: 'コメント・空行を除いた実行可能なソースコード行数。' },
  { term: 'FP', aliases: ['Function Point', 'ファンクションポイント'], description: 'ソフトウェアの機能量を測定する手法。5つの機能タイプで計測。' },
  { term: 'IFPUG法', aliases: ['IFPUG', 'International Function Point Users Group'], description: 'ファンクションポイントの国際標準的な計測手法。' },
  { term: 'COSMIC法', aliases: ['COSMIC', 'COSMIC-FFP'], description: '機能規模測定の国際標準手法（ISO/IEC 19761）。' },
  { term: 'NESMA法', aliases: ['NESMA'], description: 'オランダ発のファンクションポイント計測手法。' },
  { term: 'UFP', aliases: ['Unadjusted Function Point', '未調整ファンクションポイント'], description: '調整係数を適用する前のファンクションポイント値。' },
  { term: 'AFP', aliases: ['Adjusted Function Point', '調整済ファンクションポイント'], description: '調整係数を適用した後のファンクションポイント値。' },
  { term: 'EI', aliases: ['External Input', '外部入力'], description: 'FP計測における機能タイプ。外部からデータを受け取る処理。' },
  { term: 'EO', aliases: ['External Output', '外部出力'], description: 'FP計測における機能タイプ。外部へデータを出力する処理。' },
  { term: 'EQ', aliases: ['External Inquiry', '外部照会'], description: 'FP計測における機能タイプ。データ参照のみの入出力処理。' },
  { term: 'ILF', aliases: ['Internal Logical File', '内部論理ファイル'], description: 'FP計測における機能タイプ。システム内で管理するデータ群。' },
  { term: 'EIF', aliases: ['External Interface File', '外部インターフェースファイル'], description: 'FP計測における機能タイプ。他システムから参照するデータ群。' },
  { term: 'GSC', aliases: ['General System Characteristics', '一般システム特性'], description: 'FP調整で使用する14項目のシステム特性。' },
  { term: 'VAF', aliases: ['Value Adjustment Factor', '調整係数'], description: 'FPを調整するための係数（0.65〜1.35）。' },

  // ========================================
  // 工数・生産性指標
  // ========================================
  { term: '人月', aliases: ['Man-Month', 'MM', '人・月'], description: '1人が1ヶ月稼働する工数単位。' },
  { term: '人日', aliases: ['Man-Day', 'MD', '人・日'], description: '1人が1日稼働する工数単位。' },
  { term: '人時', aliases: ['Man-Hour', 'MH', '人・時'], description: '1人が1時間稼働する工数単位。' },
  { term: '工数', aliases: ['Effort', 'エフォート'], description: '作業に必要な労働量。通常は人月で表す。' },
  { term: '生産性', aliases: ['Productivity'], description: '単位工数あたりの成果物量。SLOC/人月やFP/人月で測定。' },
  { term: 'SLOC生産性', aliases: ['SLOC/MM'], description: '1人月あたりのソースコード行数。開発生産性指標。' },
  { term: 'FP生産性', aliases: ['FP/MM', 'FP生産性'], description: '1人月あたりのファンクションポイント数。' },
  { term: '開発工数', aliases: ['Development Effort'], description: 'ソフトウェア開発に要した総工数。' },
  { term: '工程別工数', aliases: ['Phase Effort'], description: '各開発工程（設計・製造・テスト等）ごとの工数。' },
  { term: '工数比率', aliases: ['Effort Ratio', '工程別工数比率'], description: '全体工数に対する各工程の工数割合。' },
  { term: '工数見積り', aliases: ['Effort Estimation'], description: '開発に必要な工数を予測すること。' },
  { term: '見積り精度', aliases: ['Estimation Accuracy'], description: '見積り値と実績値の乖離度合い。' },
  { term: '超過工数', aliases: ['Effort Overrun'], description: '見積りを超えた工数。' },

  // ========================================
  // 品質指標
  // ========================================
  { term: 'バグ密度', aliases: ['Bug Density', 'Defect Density', '欠陥密度'], description: '規模あたりのバグ数（件/KSLOC、件/FP）。品質を測る基本指標。' },
  { term: '残存バグ密度', aliases: ['Residual Defect Density'], description: 'リリース後に発見されたバグの規模あたり件数。' },
  { term: '摘出バグ密度', aliases: ['Detected Defect Density'], description: 'テスト工程で摘出されたバグの規模あたり件数。' },
  { term: 'テスト密度', aliases: ['Test Density', 'テスト項目密度'], description: '規模あたりのテスト項目数（項目/KSLOC）。' },
  { term: 'レビュー密度', aliases: ['Review Density', 'レビュー指摘密度'], description: '規模あたりのレビュー指摘件数。' },
  { term: 'レビュー工数率', aliases: ['Review Effort Ratio'], description: '総工数に対するレビュー工数の割合。' },
  { term: 'テスト工数率', aliases: ['Test Effort Ratio'], description: '総工数に対するテスト工数の割合。' },
  { term: 'バグ収束曲線', aliases: ['Defect Convergence Curve', '信頼度成長曲線'], description: 'テスト期間中のバグ摘出推移をグラフ化したもの。' },
  { term: 'ゴンペルツ曲線', aliases: ['Gompertz Curve'], description: 'バグ収束予測に使用されるS字曲線モデル。' },
  { term: '品質目標', aliases: ['Quality Target'], description: '達成すべき品質水準（バグ密度○件/KSLOC以下など）。' },
  { term: '出荷判定', aliases: ['Release Criteria', 'Exit Criteria'], description: 'リリース可否を判断するための品質基準。' },

  // ========================================
  // プロジェクト特性・分類
  // ========================================
  { term: '新規開発', aliases: ['New Development', 'スクラッチ開発'], description: 'ゼロから新たに開発するプロジェクト。' },
  { term: '改修開発', aliases: ['Enhancement', '機能追加', 'エンハンス'], description: '既存システムに機能を追加・変更する開発。' },
  { term: '保守開発', aliases: ['Maintenance Development'], description: '既存システムの維持・改善を行う開発。' },
  { term: '再開発', aliases: ['Redevelopment', 'リプレース', 'マイグレーション'], description: '既存システムを新技術で作り直す開発。' },
  { term: 'パッケージ導入', aliases: ['Package Implementation'], description: '市販パッケージソフトを導入・カスタマイズするプロジェクト。' },
  { term: '受託開発', aliases: ['Contract Development', '請負開発'], description: '顧客から委託を受けて行う開発。' },
  { term: '自社開発', aliases: ['In-House Development', '内製開発'], description: '自社で使用するシステムを自社で開発すること。' },
  { term: 'オフショア開発', aliases: ['Offshore Development'], description: '海外拠点で開発を行うこと。' },
  { term: 'ニアショア開発', aliases: ['Nearshore Development'], description: '国内地方拠点で開発を行うこと。' },

  // ========================================
  // 業種・業務分類
  // ========================================
  { term: '金融業', aliases: ['Financial Industry', '金融・保険業'], description: '銀行・証券・保険などの業種区分。' },
  { term: '製造業', aliases: ['Manufacturing Industry'], description: '製造業の業種区分。' },
  { term: '流通業', aliases: ['Distribution Industry', '小売業'], description: '卸売・小売などの業種区分。' },
  { term: '通信業', aliases: ['Telecommunications Industry'], description: '通信・放送などの業種区分。' },
  { term: '公共', aliases: ['Public Sector', '官公庁'], description: '政府・自治体などの業種区分。' },
  { term: '基幹系', aliases: ['Core System', '基幹システム'], description: '業務の中核を担うシステム（会計、販売管理など）。' },
  { term: '情報系', aliases: ['Information System', '情報システム'], description: '意思決定支援・情報共有などを目的としたシステム。' },
  { term: '組込み系', aliases: ['Embedded System', '組込みシステム'], description: '機器に組み込まれて動作するソフトウェア。' },
  { term: 'Web系', aliases: ['Web System', 'Webシステム'], description: 'Webブラウザで利用するシステム。' },

  // ========================================
  // 開発モデル・手法
  // ========================================
  { term: 'ウォーターフォール型', aliases: ['Waterfall Model'], description: '工程を順番に進める従来型開発モデル。' },
  { term: 'アジャイル型', aliases: ['Agile Model'], description: '短い反復で開発を進める開発モデル。' },
  { term: 'スパイラル型', aliases: ['Spiral Model'], description: 'プロトタイピングを繰り返して開発を進めるモデル。' },
  { term: 'プロトタイピング', aliases: ['Prototyping'], description: '試作品を作りながら要件を確定していく手法。' },
  { term: 'インクリメンタル型', aliases: ['Incremental Model'], description: '機能を段階的に追加していく開発モデル。' },
  { term: 'DevOps', description: '開発と運用を統合し継続的デリバリーを実現する手法。' },

  // ========================================
  // 開発技術・環境
  // ========================================
  { term: '開発言語', aliases: ['Programming Language', 'プログラミング言語'], description: 'ソフトウェア開発に使用するプログラミング言語。' },
  { term: 'COBOL', description: '事務処理向けの手続き型言語。金融・基幹系で使用。' },
  { term: 'Java', description: 'オブジェクト指向のプラットフォーム非依存言語。' },
  { term: 'C言語', aliases: ['C'], description: '汎用の手続き型言語。組込み系で多く使用。' },
  { term: 'C++', description: 'C言語を拡張したオブジェクト指向言語。' },
  { term: 'C#', description: 'Microsoft開発のオブジェクト指向言語。' },
  { term: 'VB', aliases: ['Visual Basic', 'VB.NET'], description: 'Microsoft開発のプログラミング言語。' },
  { term: 'Python', description: '汎用の高水準スクリプト言語。' },
  { term: 'JavaScript', aliases: ['JS'], description: 'Web開発で使用されるスクリプト言語。' },
  { term: 'DBMS', aliases: ['Database Management System', 'データベース管理システム'], description: 'データベースを管理するソフトウェア。' },
  { term: 'OS', aliases: ['Operating System', 'オペレーティングシステム'], description: 'コンピュータを管理する基本ソフトウェア。' },
  { term: 'ミドルウェア', aliases: ['Middleware'], description: 'OSとアプリケーションの間で動作するソフトウェア。' },
  { term: '開発環境', aliases: ['Development Environment'], description: 'ソフトウェア開発を行うためのツール・環境。' },
  { term: '本番環境', aliases: ['Production Environment'], description: '実際にシステムが稼働する環境。' },
  { term: 'テスト環境', aliases: ['Test Environment'], description: 'テストを実施するための環境。' },

  // ========================================
  // 開発体制・組織
  // ========================================
  { term: '開発体制', aliases: ['Development Organization'], description: 'プロジェクトの人員構成・役割分担。' },
  { term: 'PM', aliases: ['Project Manager', 'プロジェクトマネージャー', 'プロマネ'], description: 'プロジェクト全体を管理する責任者。' },
  { term: 'PL', aliases: ['Project Leader', 'プロジェクトリーダー'], description: 'プロジェクトチームを統率するリーダー。' },
  { term: 'SE', aliases: ['System Engineer', 'システムエンジニア'], description: 'システムの設計・開発を担当する技術者。' },
  { term: 'PG', aliases: ['Programmer', 'プログラマー'], description: 'プログラミングを担当する技術者。' },
  { term: 'ユーザー企業', aliases: ['User Company', '発注者'], description: 'システムを発注・利用する企業。' },
  { term: 'ベンダー', aliases: ['Vendor', 'ITベンダー', '開発会社'], description: 'システム開発を受託する企業。' },
  { term: '外注', aliases: ['Outsourcing', 'アウトソーシング'], description: '開発作業を外部企業に委託すること。' },
  { term: '内製', aliases: ['In-House', '内製化'], description: '自社内でソフトウェア開発を行うこと。' },
  { term: '要員計画', aliases: ['Staffing Plan', 'リソース計画'], description: 'プロジェクトの人員配置計画。' },
  { term: 'ピーク要員', aliases: ['Peak Staffing'], description: 'プロジェクト期間中の最大人員数。' },

  // ========================================
  // 期間・スケジュール
  // ========================================
  { term: '開発期間', aliases: ['Development Period', 'プロジェクト期間'], description: 'プロジェクト開始から終了までの期間。' },
  { term: '工期', aliases: ['Duration', 'スケジュール'], description: 'プロジェクト完了までに要する時間。' },
  { term: '工期短縮', aliases: ['Schedule Compression'], description: 'プロジェクト期間を短くすること。' },
  { term: '工期遅延', aliases: ['Schedule Delay', 'スケジュール遅延'], description: '計画より完了が遅れること。' },
  { term: 'クリティカルパス', aliases: ['Critical Path'], description: 'プロジェクト完了に影響する最長経路。' },
  { term: 'マイルストーン', aliases: ['Milestone'], description: 'プロジェクトの重要な節目。' },
  { term: '納期', aliases: ['Delivery Date', 'デリバリー'], description: '成果物を納品する期日。' },

  // ========================================
  // コスト・予算
  // ========================================
  { term: '開発コスト', aliases: ['Development Cost', '開発費用'], description: 'ソフトウェア開発に要する費用。' },
  { term: '人件費', aliases: ['Labor Cost', '労務費'], description: '開発要員の人件費。' },
  { term: '外注費', aliases: ['Outsourcing Cost'], description: '外部委託に要する費用。' },
  { term: 'ハードウェア費', aliases: ['Hardware Cost', 'HW費'], description: '機器調達に要する費用。' },
  { term: 'ソフトウェア費', aliases: ['Software Cost', 'SW費'], description: 'パッケージ・ライセンスなどの費用。' },
  { term: '予算超過', aliases: ['Budget Overrun', 'コスト超過'], description: '予算を超えた費用が発生すること。' },
  { term: 'コスト見積り', aliases: ['Cost Estimation'], description: '開発費用を予測すること。' },

  // ========================================
  // リスク・問題
  // ========================================
  { term: 'リスク', aliases: ['Risk'], description: 'プロジェクトに悪影響を与える可能性のある事象。' },
  { term: 'リスク管理', aliases: ['Risk Management'], description: 'リスクを特定・分析・対応する活動。' },
  { term: '課題管理', aliases: ['Issue Management', '問題管理'], description: '発生した課題を追跡・解決する活動。' },
  { term: '変更管理', aliases: ['Change Management', '変更制御'], description: '要件・仕様変更を管理する活動。' },
  { term: '要件変更', aliases: ['Requirements Change', '仕様変更'], description: '開発途中での要件・仕様の変更。' },
  { term: 'スコープクリープ', aliases: ['Scope Creep'], description: '要件が徐々に拡大していく現象。' },
  { term: 'プロジェクト失敗', aliases: ['Project Failure'], description: 'QCD（品質・コスト・納期）を満たせなかったプロジェクト。' },
  { term: 'QCD', aliases: ['Quality, Cost, Delivery'], description: '品質・コスト・納期の3要素。プロジェクト成功の基準。' },

  // ========================================
  // 成熟度・プロセス改善
  // ========================================
  { term: 'CMMI', aliases: ['Capability Maturity Model Integration', '能力成熟度モデル統合'], description: 'プロセス成熟度を5段階で評価するモデル。' },
  { term: 'CMMIレベル', aliases: ['CMMI Level', '成熟度レベル'], description: 'CMMIによるプロセス成熟度の段階（1〜5）。' },
  { term: 'ISO 9001', description: '品質マネジメントシステムの国際規格。' },
  { term: 'ISO/IEC 12207', description: 'ソフトウェアライフサイクルプロセスの国際規格。' },
  { term: 'ISO/IEC 15504', aliases: ['SPICE'], description: 'プロセスアセスメントの国際規格。' },
  { term: 'SPI', aliases: ['Software Process Improvement', 'プロセス改善'], description: 'ソフトウェア開発プロセスを継続的に改善する活動。' },
  { term: 'ベンチマーク', aliases: ['Benchmark', 'ベンチマーキング'], description: '業界標準や他社と比較して評価すること。' },
  { term: '定量的管理', aliases: ['Quantitative Management'], description: 'メトリクスに基づいてプロジェクトを管理すること。' },

  // ========================================
  // IPA固有の用語・データ
  // ========================================
  { term: 'IPA', aliases: ['Information-technology Promotion Agency', '情報処理推進機構'], description: '経済産業省所管の独立行政法人。ソフトウェア開発データを収集・分析。' },
  { term: 'SEC', aliases: ['Software Engineering Center', 'ソフトウェア・エンジニアリング・センター'], description: 'IPA内のソフトウェア工学推進組織（現在は事業統合）。' },
  { term: 'ソフトウェア開発データ白書', aliases: ['Software Development Data Report'], description: 'IPAが発行するソフトウェア開発の統計データ集。' },
  { term: 'ソフトウェア開発分析データ集', description: 'IPAが公開するソフトウェア開発の分析データ・統計情報。' },
  { term: 'データ収集', aliases: ['Data Collection'], description: 'プロジェクト実績データを収集すること。' },
  { term: '基準値', aliases: ['Baseline', 'ベースライン'], description: '比較・評価の基準となる値。' },
  { term: '上位25%', aliases: ['Upper Quartile', '第3四分位'], description: '統計データの上位25%に位置する値。' },
  { term: '下位25%', aliases: ['Lower Quartile', '第1四分位'], description: '統計データの下位25%に位置する値。' },
  { term: '中央値', aliases: ['Median', 'メジアン'], description: 'データを順に並べた時の中央の値。' },
  { term: '平均値', aliases: ['Average', 'Mean'], description: 'データの算術平均。' },
  { term: '標準偏差', aliases: ['Standard Deviation', 'SD'], description: 'データのばらつきを表す統計量。' },

  // ========================================
  // 見積もり手法
  // ========================================
  { term: 'COCOMO', aliases: ['Constructive Cost Model'], description: 'コード行数ベースの工数見積もりモデル。' },
  { term: 'COCOMO II', description: 'COCOMOを改良した見積もりモデル。' },
  { term: 'ボトムアップ見積り', aliases: ['Bottom-Up Estimation'], description: '詳細作業を積み上げて見積もる手法。' },
  { term: 'トップダウン見積り', aliases: ['Top-Down Estimation'], description: '全体規模から分割して見積もる手法。' },
  { term: '類推見積り', aliases: ['Analogous Estimation', '類推法'], description: '過去の類似プロジェクトを参考に見積もる手法。' },
  { term: 'パラメトリック見積り', aliases: ['Parametric Estimation'], description: '統計モデルを使って見積もる手法。' },
  { term: '三点見積り', aliases: ['Three-Point Estimation', 'PERT見積り'], description: '楽観・悲観・最頻値から見積もる手法。' },
  { term: 'デルファイ法', aliases: ['Delphi Method'], description: '専門家の意見を集約して見積もる手法。' },

  // ========================================
  // テスト指標（詳細）
  // ========================================
  { term: 'テスト項目数', aliases: ['Test Cases', 'テストケース数'], description: '実施するテスト項目の総数。' },
  { term: 'テスト消化率', aliases: ['Test Execution Rate'], description: '計画したテスト項目に対する実施済み割合。' },
  { term: 'バグ摘出率', aliases: ['Defect Detection Rate'], description: 'テストによるバグ発見の効率。' },
  { term: 'バグ修正率', aliases: ['Defect Fix Rate'], description: '摘出されたバグの修正完了割合。' },
  { term: 'バグ再発率', aliases: ['Defect Recurrence Rate'], description: '修正したバグが再発する割合。' },
  { term: '重大バグ', aliases: ['Critical Defect', 'Severity A'], description: '業務に重大な影響を与えるバグ。' },
  { term: '軽微バグ', aliases: ['Minor Defect', 'Severity C'], description: '業務への影響が軽微なバグ。' },

  // ========================================
  // 信頼性・可用性
  // ========================================
  { term: 'MTBF', aliases: ['Mean Time Between Failures', '平均故障間隔'], description: '故障から次の故障までの平均時間。信頼性指標。' },
  { term: 'MTTR', aliases: ['Mean Time To Repair', '平均復旧時間'], description: '故障発生から復旧までの平均時間。' },
  { term: 'MTTF', aliases: ['Mean Time To Failure', '平均故障時間'], description: '稼働開始から最初の故障までの平均時間。' },
  { term: '稼働率', aliases: ['Availability', 'アベイラビリティ'], description: 'システムが正常稼働している時間の割合。' },
  { term: 'SLA', aliases: ['Service Level Agreement', 'サービスレベル合意'], description: 'サービス品質の合意事項。稼働率保証など。' },

  // ========================================
  // レビュー指標
  // ========================================
  { term: 'レビュー工数', aliases: ['Review Effort'], description: 'レビューに費やした工数。' },
  { term: 'レビュー時間', aliases: ['Review Time'], description: 'レビューに要した時間。' },
  { term: 'レビュー指摘件数', aliases: ['Review Findings'], description: 'レビューで発見された問題の件数。' },
  { term: 'レビュー効率', aliases: ['Review Efficiency'], description: '時間あたりのレビュー対象量（ページ/時間など）。' },
  { term: 'インスペクション', aliases: ['Inspection', '公式レビュー'], description: '定められた手順で行う公式なレビュー。' },
  { term: 'ウォークスルー', aliases: ['Walkthrough'], description: '作成者が説明しながら行うレビュー。' },
  { term: 'ピアレビュー', aliases: ['Peer Review'], description: '同僚による相互レビュー。' },
];
