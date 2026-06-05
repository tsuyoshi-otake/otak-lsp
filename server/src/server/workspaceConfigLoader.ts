/**
 * ワークスペース設定の取得とマージ
 *
 * LSP の workspace.getConfiguration を 4セクション分並列で取得し、
 * 1つの settings オブジェクトにマージする。
 */

import { Connection } from 'vscode-languageserver/node';
import { Logger } from '../utils/logger';
import { logError } from '../utils/errorHandler';

const CONFIG_SECTIONS = ['otakLsp', 'otakLsp.advanced', 'otakLsp.official', 'otakLsp.proofreading'] as const;
type ConfigKey = 'advanced' | 'official' | 'proofreading';
const SECTION_KEYS: ConfigKey[] = ['advanced', 'official', 'proofreading'];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function mergeSection(
  target: Record<string, unknown>,
  key: ConfigKey,
  incoming: unknown
): void {
  const incomingRecord = asRecord(incoming);
  if (!incomingRecord) {
    return;
  }
  const existing = asRecord(target[key]) ?? {};
  target[key] = { ...existing, ...incomingRecord };
}

export function mergeConfigurations(
  base: unknown,
  advanced: unknown,
  official: unknown,
  proofreading: unknown
): Record<string, unknown> | null {
  const baseRecord = asRecord(base);
  if (!baseRecord) {
    return { advanced, official, proofreading } as Record<string, unknown>;
  }

  const merged: Record<string, unknown> = { ...baseRecord };
  mergeSection(merged, 'advanced', advanced);
  mergeSection(merged, 'official', official);
  mergeSection(merged, 'proofreading', proofreading);
  return merged;
}

export async function loadWorkspaceConfiguration(
  connection: Connection,
  logger?: Logger
): Promise<Record<string, unknown> | null> {
  try {
    const [base, advanced, official, proofreading] = await Promise.all(
      CONFIG_SECTIONS.map((section) => connection.workspace.getConfiguration({ section }))
    );
    return mergeConfigurations(base, advanced, official, proofreading);
  } catch (error) {
    logError(logger, 'Failed to load workspace configuration', error);
    return null;
  }
}

export { SECTION_KEYS };
