// このファイルは自動生成です。手動で編集しないでください。
// 生成元: ja.json (9552 エントリ, 226 ドメイン)
// 生成コマンド: npx ts-node scripts/generate-glossary-from-json.ts

import { GlossaryId } from '../../../shared/src/types';
import { GlossaryEntry } from './glossaryTypes';
import { GLOSSARY_ENTRIES as itEntries } from './generatedGlossaryData/it';
import { GLOSSARY_ENTRIES as pmbokEntries } from './generatedGlossaryData/pmbok';
import { GLOSSARY_ENTRIES as observabilitySreEntries } from './generatedGlossaryData/observability-sre';
import { GLOSSARY_ENTRIES as architecturePatternsEntries } from './generatedGlossaryData/architecture-patterns';
import { GLOSSARY_ENTRIES as frontendEntries } from './generatedGlossaryData/frontend';
import { GLOSSARY_ENTRIES as backendEntries } from './generatedGlossaryData/backend';
import { GLOSSARY_ENTRIES as enterpriseArchEntries } from './generatedGlossaryData/enterprise-arch';
import { GLOSSARY_ENTRIES as dbSqlTxEntries } from './generatedGlossaryData/db-sql-tx';
import { GLOSSARY_ENTRIES as securityEntries } from './generatedGlossaryData/security';
import { GLOSSARY_ENTRIES as performanceCacheEntries } from './generatedGlossaryData/performance-cache';
import { GLOSSARY_ENTRIES as devopsCicdEntries } from './generatedGlossaryData/devops-cicd';
import { GLOSSARY_ENTRIES as cloudEntries } from './generatedGlossaryData/cloud';
import { GLOSSARY_ENTRIES as networkHttpEntries } from './generatedGlossaryData/network-http';
import { GLOSSARY_ENTRIES as aiLlmEntries } from './generatedGlossaryData/ai-llm';
import { GLOSSARY_ENTRIES as contractLegalEntries } from './generatedGlossaryData/contract-legal';
import { GLOSSARY_ENTRIES as agileProductEntries } from './generatedGlossaryData/agile-product';
import { GLOSSARY_ENTRIES as dddEntries } from './generatedGlossaryData/ddd';
import { GLOSSARY_ENTRIES as tddEntries } from './generatedGlossaryData/tdd';
import { GLOSSARY_ENTRIES as distributedSystemsEntries } from './generatedGlossaryData/distributed-systems';
import { GLOSSARY_ENTRIES as containersK8sEntries } from './generatedGlossaryData/containers-k8s';
import { GLOSSARY_ENTRIES as azureServicesEntries } from './generatedGlossaryData/azure-services';
import { GLOSSARY_ENTRIES as awsServicesEntries } from './generatedGlossaryData/aws-services';
import { GLOSSARY_ENTRIES as gcpServicesEntries } from './generatedGlossaryData/gcp-services';
import { GLOSSARY_ENTRIES as ociServicesEntries } from './generatedGlossaryData/oci-services';
import { GLOSSARY_ENTRIES as dotnetEntries } from './generatedGlossaryData/dotnet';
import { GLOSSARY_ENTRIES as windowsEntries } from './generatedGlossaryData/windows';
import { GLOSSARY_ENTRIES as javaEntries } from './generatedGlossaryData/java';
import { GLOSSARY_ENTRIES as nextjsEntries } from './generatedGlossaryData/nextjs';
import { GLOSSARY_ENTRIES as oracleEntries } from './generatedGlossaryData/oracle';
import { GLOSSARY_ENTRIES as pipEntries } from './generatedGlossaryData/pip';
import { GLOSSARY_ENTRIES as gitEntries } from './generatedGlossaryData/git';
import { GLOSSARY_ENTRIES as apiDesignEntries } from './generatedGlossaryData/api-design';
import { GLOSSARY_ENTRIES as linuxEntries } from './generatedGlossaryData/linux';
import { GLOSSARY_ENTRIES as npmEntries } from './generatedGlossaryData/npm';
import { GLOSSARY_ENTRIES as iotEmbeddedEntries } from './generatedGlossaryData/iot-embedded';

export interface GeneratedGlossaryCategory {
  readonly id: GlossaryId;
  readonly title: string;
  readonly entries: ReadonlyArray<GlossaryEntry>;
}

export const GENERATED_GLOSSARY_DATA: ReadonlyArray<GeneratedGlossaryCategory> = [
  {
    id: 'it',
    title: 'IT用語図鑑',
    entries: itEntries,
  },
  {
    id: 'pmbok',
    title: 'プロジェクト管理用語図鑑',
    entries: pmbokEntries,
  },
  {
    id: 'observabilitySre',
    title: 'オブザーバビリティ・SRE用語図鑑',
    entries: observabilitySreEntries,
  },
  {
    id: 'architecturePatterns',
    title: 'アーキテクチャパターン用語図鑑',
    entries: architecturePatternsEntries,
  },
  {
    id: 'frontend',
    title: 'フロントエンド用語図鑑',
    entries: frontendEntries,
  },
  {
    id: 'backend',
    title: 'バックエンド用語図鑑',
    entries: backendEntries,
  },
  {
    id: 'enterpriseArch',
    title: 'エンタープライズアーキテクチャ用語図鑑',
    entries: enterpriseArchEntries,
  },
  {
    id: 'dbSqlTx',
    title: 'DB・SQL・トランザクション用語図鑑',
    entries: dbSqlTxEntries,
  },
  {
    id: 'security',
    title: 'セキュリティ用語図鑑',
    entries: securityEntries,
  },
  {
    id: 'performanceCache',
    title: 'パフォーマンス・キャッシュ用語図鑑',
    entries: performanceCacheEntries,
  },
  {
    id: 'devopsCicd',
    title: 'DevOps・CI/CD用語図鑑',
    entries: devopsCicdEntries,
  },
  {
    id: 'cloud',
    title: 'クラウド用語図鑑',
    entries: cloudEntries,
  },
  {
    id: 'networkHttp',
    title: 'ネットワーク・HTTP用語図鑑',
    entries: networkHttpEntries,
  },
  {
    id: 'aiLlm',
    title: 'AI・LLM用語図鑑',
    entries: aiLlmEntries,
  },
  {
    id: 'contractLegal',
    title: '契約・法務・ビジネス用語図鑑',
    entries: contractLegalEntries,
  },
  {
    id: 'agileProduct',
    title: 'アジャイル・プロダクト用語図鑑',
    entries: agileProductEntries,
  },
  {
    id: 'ddd',
    title: 'DDD・設計パターン用語図鑑',
    entries: dddEntries,
  },
  {
    id: 'tdd',
    title: 'TDD・テスト用語図鑑',
    entries: tddEntries,
  },
  {
    id: 'distributedSystems',
    title: '分散システム用語図鑑',
    entries: distributedSystemsEntries,
  },
  {
    id: 'containersK8s',
    title: 'コンテナ・Kubernetes用語図鑑',
    entries: containersK8sEntries,
  },
  {
    id: 'azureServices',
    title: 'Azureサービス用語図鑑',
    entries: azureServicesEntries,
  },
  {
    id: 'awsServices',
    title: 'AWSサービス用語図鑑',
    entries: awsServicesEntries,
  },
  {
    id: 'gcpServices',
    title: 'GCPサービス用語図鑑',
    entries: gcpServicesEntries,
  },
  {
    id: 'ociServices',
    title: 'OCIサービス用語図鑑',
    entries: ociServicesEntries,
  },
  {
    id: 'dotnet',
    title: '.NET用語図鑑',
    entries: dotnetEntries,
  },
  {
    id: 'windows',
    title: 'Windows用語図鑑',
    entries: windowsEntries,
  },
  {
    id: 'java',
    title: 'Java用語図鑑',
    entries: javaEntries,
  },
  {
    id: 'nextjs',
    title: 'Next.js用語図鑑',
    entries: nextjsEntries,
  },
  {
    id: 'oracle',
    title: 'Oracle用語図鑑',
    entries: oracleEntries,
  },
  {
    id: 'pip',
    title: 'pip・Python用語図鑑',
    entries: pipEntries,
  },
  {
    id: 'git',
    title: 'Git用語図鑑',
    entries: gitEntries,
  },
  {
    id: 'apiDesign',
    title: 'API設計用語図鑑',
    entries: apiDesignEntries,
  },
  {
    id: 'linux',
    title: 'Linux用語図鑑',
    entries: linuxEntries,
  },
  {
    id: 'npm',
    title: 'npm用語図鑑',
    entries: npmEntries,
  },
  {
    id: 'iotEmbedded',
    title: 'IoT・組み込み用語図鑑',
    entries: iotEmbeddedEntries,
  },
];
