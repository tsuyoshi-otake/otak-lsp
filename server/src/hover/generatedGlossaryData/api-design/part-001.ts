// このファイルは自動生成です。手動で編集しないでください。
// 生成元: ja.json (9552 エントリ, 226 ドメイン)
// カテゴリ: apiDesign (1/1)
// 生成コマンド: npx ts-node scripts/generate-glossary-from-json.ts

import { GlossaryEntry } from '../../glossaryTypes';

export const GLOSSARY_ENTRIES_PART_001: ReadonlyArray<GlossaryEntry> = [
  // api-design (7)
  { term: 'REST', aliases: ['rest'], description: 'Representational State Transfer。HTTPを利用したステートレスなAPIアーキテクチャスタイル。リソースをURLで表現しHTTPメソッドで操作する。' },
  { term: 'GraphQL', aliases: ['graphql'], description: 'Facebookが開発したクエリ言語・ランタイム。クライアントが必要なフィールドを指定して取得できるAPI設計スタイル。' },
  { term: 'gRPC', aliases: ['grpc'], description: 'GoogleのRPCフレームワーク。Protocol Buffersを使ったスキーマ定義と効率的なバイナリ通信が特徴。' },
  { term: 'RPC', aliases: ['rpc'], description: 'Remote Procedure Call。ネットワーク越しに別プロセスの関数を呼び出す通信方式。' },
  { term: 'API First', aliases: ['api first', 'apiファースト'], description: 'APIの設計・仕様を実装より先に行い、コントラクトを定義してから開発を進めるアプローチ。' },
  { term: 'スキーマ駆動開発', aliases: ['schema-driven development'], description: 'APIやデータのスキーマ定義を先行して行い、それを契約としてクライアント・サーバーを並行開発する手法。' },
  { term: 'Backward Compatibility', aliases: ['backward compatibility'], description: '新バージョンのソフトウェアが旧バージョンのクライアントと互換性を保つ設計原則。' },
];
