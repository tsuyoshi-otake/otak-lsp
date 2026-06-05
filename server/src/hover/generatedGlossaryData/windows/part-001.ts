// このファイルは自動生成です。手動で編集しないでください。
// 生成元: ja.json (9552 エントリ, 226 ドメイン)
// カテゴリ: windows (1/1)
// 生成コマンド: npx ts-node scripts/generate-glossary-from-json.ts

import { GlossaryEntry } from '../../glossaryTypes';

export const GLOSSARY_ENTRIES_PART_001: ReadonlyArray<GlossaryEntry> = [
  // vba (35)
  { term: 'VBA', aliases: ['vba'], description: 'Visual Basic for Applications の略で、Office 製品をカスタマイズ、自動化するための言語です。Office VBA language reference の中心対象です。' },
  { term: 'Visual Basic for Applications', aliases: ['visual basic for applications'], description: 'Office アプリケーションを中心に、業務自動化や画面拡張を行うための組み込み言語です。概念説明、タスク、サンプル、リファレンスが公式に整理されています。' },
  { term: 'Office VBA', aliases: ['office vba'], description: 'Word、Excel、Access など Office 製品内で使う VBA を指す言い方です。Office 共通の言語リファレンスがあります。' },
  { term: 'Excel VBA', aliases: ['excel vba'], description: 'Excel を自動化、拡張するための VBA です。Excel object model reference が公式に用意されています。' },
  { term: 'Access VBA', aliases: ['access vba'], description: 'Access ベースのソリューション開発に使う VBA です。概念、タスク、オブジェクトモデル参照が公式に整理されています。' },
  { term: 'Macro', aliases: ['macro'], description: 'Office 内の作業を自動化する記述や機能です。VBA と密接に結びついています。' },
  { term: 'Object Model', aliases: ['object model'], description: 'Excel や Access などが持つオブジェクト、プロパティ、メソッド、イベントの体系です。VBA はこれを通じてアプリを操作します。' },
  { term: 'Excel Object Model', aliases: ['excel object model'], description: 'Excel のシート、ブック、セルなどを扱うためのオブジェクトモデルです。VBA からの Excel 自動化の土台になります。' },
  { term: 'Access Object Model', aliases: ['access object model'], description: 'Access アプリケーションやモジュール、フォームなどを扱うオブジェクトモデルです。VBA で Access ソリューションを組むときの中心になります。' },
  { term: 'UserForm', aliases: ['userform'], description: 'VBA で作るウィンドウやダイアログボックスです。UserForms コレクションで現在読み込まれている UserForm を扱えます。' },
  { term: 'UserForms Collection', aliases: ['userforms collection'], description: '読み込まれている UserForm 要素をまとめたコレクションです。Count、Item、Add などを持ちます。' },
  { term: 'Standard Module', aliases: ['standard module'], description: 'VBA で通常の手続きや関数を置くモジュールです。VBE glossary では code module が後の Visual Basic で standard module と呼ばれると説明されています。' },
  { term: 'Class Module', aliases: ['class module'], description: 'クラス定義を記述するモジュールです。プロパティやメソッドを持つカスタムオブジェクトを作れます。' },
  { term: 'Module Object', aliases: ['module object'], description: 'Access VBA では standard module または class module を表すオブジェクトです。Modules コレクションから取得できます。' },
  { term: 'Modules Collection', aliases: ['modules collection'], description: 'Access で現在開いている標準モジュールとクラスモジュールを保持するコレクションです。コンパイル済み、未コンパイル、break mode のものも含まれます。' },
  { term: 'Module.Type', aliases: ['module.type'], description: 'Access の Module object が standard module か class module かを判定するためのプロパティです。' },
  { term: 'Application Object in Access', aliases: ['application object in access'], description: 'Access の Application object は Access 全体のオブジェクトやコレクションを保持します。VBA からアプリ全体へ作用する設定にも使えます。' },
  { term: 'Reference', aliases: ['reference'], description: '他のタイプライブラリやプロジェクトへの参照設定を表すオブジェクトです。VBA で外部オブジェクトを使う前提になります。' },
  { term: 'References Collection', aliases: ['references collection'], description: '現在設定されている参照設定をまとめたコレクションです。Access の Application object に属します。' },
  { term: 'Reference Dialog', aliases: ['reference dialog'], description: 'VBA で参照ライブラリを選択するダイアログです。Access docs では Tools メニューの References と対応づけて説明されています。' },
  { term: 'Type Library Reference', aliases: ['type library reference'], description: '別アプリケーションやプロジェクトの型ライブラリへの参照です。Reference object がこれを表します。' },
  { term: 'Object Library Reference', aliases: ['object library reference'], description: 'Office VBA docs で案内されている、Office の members、properties、methods を参照するためのライブラリ概念です。' },
  { term: 'Event Procedure', aliases: ['event procedure'], description: 'UserForm や各種オブジェクトのイベントに応答するための手続きです。VBA UI 開発の中心になります。' },
  { term: 'Property Get', aliases: ['property get'], description: 'クラスモジュールでプロパティ値を返す手続きです。カスタムオブジェクト定義の基本になります。' },
  { term: 'Property Let', aliases: ['property let'], description: '値型プロパティへ値を設定する手続きです。クラスモジュールで使います。' },
  { term: 'Property Set', aliases: ['property set'], description: 'オブジェクト参照プロパティへ値を設定する手続きです。クラスモジュールのプロパティ設計に使います。' },
  { term: 'Instance of a Class', aliases: ['instance of a class'], description: 'クラスモジュール定義から生成される実体です。Access docs では Dim で型を宣言し新しいインスタンスを作る例が示されています。' },
  { term: 'VBE Glossary', aliases: ['vbe glossary'], description: 'Visual Basic Editor まわりの用語を説明する公式 glossary です。standard module や class などの説明に使えます。' },
  { term: 'VBE', aliases: ['vbe'], description: 'Visual Basic Editor の略で、VBA コードを記述、編集、デバッグする環境を指します。VBE glossary が公式に存在します。' },
  { term: 'Option Private Module', aliases: ['option private module'], description: '他プロジェクトからの可視性を制限するために使うステートメントです。複数 project を読み込む Excel などで意味を持ちます。' },
  { term: 'Immediate Window in VBA', aliases: ['immediate window in vba'], description: 'デバッグ時に Debug.Print などの結果確認や式評価に使うウィンドウです。Modules collection の例でも Immediate window が使われています。' },
  { term: 'Debug.Print', aliases: ['debug.print'], description: 'Immediate window へ情報を出すための典型的なデバッグ出力です。公式例でも使われています。' },
  { term: 'Office Add-ins', aliases: ['office add-ins'], description: 'Microsoft は VBA docs 内でも、複数プラットフォームへ拡張する新しい Office Add-ins モデルを案内しています。VBA との対比で重要です。' },
  { term: 'Cross-project visibility', aliases: ['cross-project visibility'], description: 'VBA で他 project からモジュールやクラスが見えるかどうかの概念です。Option Private Module や参照設定と関係します。' },
  { term: 'External Class Access in VBA', aliases: ['external class access in vba'], description: '別 VBA project の class module を参照して使うことです。Microsoft は class module を他 project から使うための手順を案内しています。' },
];
