/**
 * ワークスペース設定の取得とマージ
 *
 * LSP の workspace.getConfiguration を 4セクション分並列で取得し、
 * 1つの settings オブジェクトにマージする。
 */

import { Connection } from 'vscode-languageserver/node';
import { Logger } from '../utils/logger';
import { logError } from '../utils/errorHandler';
import { ConfigManager, ConfigurationSnapshot, resolveConfiguration } from './configManager';
import { ConcurrencyLimiter } from '../utils/concurrencyLimiter';

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
  logger?: Logger,
  scopeUri?: string
): Promise<Record<string, unknown> | null> {
  try {
    const [base, advanced, official, proofreading] = await Promise.all(
      CONFIG_SECTIONS.map((section) => connection.workspace.getConfiguration({ section, ...(scopeUri ? { scopeUri } : {}) }))
    );
    return mergeConfigurations(base, advanced, official, proofreading);
  } catch (error) {
    logError(logger, 'Failed to load workspace configuration', error);
    return null;
  }
}

export { SECTION_KEYS };

/** 文書単位の設定取得を集約し、クローズや設定更新前の応答を破棄する。 */
export class ResourceConfigurationStore {
  private readonly entries = new Map<string, { snapshot?: ConfigurationSnapshot; loaded: Promise<boolean> }>();
  private fallbackRevision: object = {};
  private readonly limiter = new ConcurrencyLimiter(() => 4);
  readonly manager: ConfigManager;

  constructor(
    private readonly connection: Connection,
    private readonly base: ConfigManager,
    private readonly logger?: Logger
  ) {
    this.manager = {
      ...base,
      getConfig: uri => this.snapshot(uri)?.config ?? base.getConfig(),
      getAdvancedConfig: uri => this.snapshot(uri)?.advancedConfig ?? base.getAdvancedConfig(),
      getSnapshot: uri => this.snapshot(uri) ?? base.getSnapshot?.() ?? resolveConfiguration({}),
      getRevision: uri => this.entries.get(uri) ?? this.fallbackRevision,
    };
  }

  private snapshot(uri?: string): ConfigurationSnapshot | undefined {
    return uri ? this.entries.get(uri)?.snapshot : undefined;
  }

  load(uri: string): Promise<boolean> {
    const existing = this.entries.get(uri);
    if (existing) return existing.loaded;
    const entry: { snapshot?: ConfigurationSnapshot; loaded: Promise<boolean> } = { loaded: Promise.resolve(false) };
    this.entries.set(uri, entry);
    entry.loaded = this.limiter.run(async () => {
      if (this.entries.get(uri) !== entry) return false;
      const settings = await loadWorkspaceConfiguration(this.connection, this.logger, uri);
      if (this.entries.get(uri) !== entry) return false;
      entry.snapshot = settings ? resolveConfiguration(settings) : this.base.getSnapshot?.() ?? resolveConfiguration({});
      return true;
    });
    return entry.loaded;
  }

  forget(uri: string): void {
    this.entries.delete(uri);
  }

  clear(): void {
    this.entries.clear();
    this.fallbackRevision = {};
  }
}
