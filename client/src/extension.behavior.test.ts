/**
 * Extension Client 振る舞いテスト
 * Issue #18-#24, #27 のクライアント側契約を、実際の activate() /
 * 登録済みコマンド / イベントリスナ経由で検証する。
 *
 * モックは VS Code API の代替実装（fake）であり、プロダクト側の
 * 状態判定・設定読み書きロジックは置き換えない。
 */

// ---------- VS Code API fake ----------

interface MockUri { fsPath: string; toString(): string }
function mockUri(p: string): MockUri {
  return { fsPath: p, toString: () => p };
}

interface MockEditor {
  document: { uri: MockUri; languageId: string; version: number };
}

const mockOutputChannel = {
  appendLine: jest.fn(),
  append: jest.fn(),
  clear: jest.fn(),
  dispose: jest.fn(),
  show: jest.fn(),
  hide: jest.fn(),
  name: 'otak-lsp',
  replace: jest.fn(),
};

const mockStatusBarItem = {
  text: '',
  command: undefined as string | undefined,
  tooltip: '' as unknown,
  backgroundColor: undefined as unknown,
  accessibilityInformation: undefined as unknown,
  name: '',
  show: jest.fn(),
  hide: jest.fn(),
  dispose: jest.fn(),
};

/** 設定ストア: section -> key -> { global, workspace, folders: Map<folderUri, value> }
 *  folder 値は「文書URI」ではなく「ワークスペースフォルダーURI」で持つ。
 *  同一フォルダー内の文書は同じ folder 設定を共有する（実 VS Code と同じ）。
 */
interface ScopedValue {
  global?: unknown;
  workspace?: unknown;
  folders: Map<string, unknown>;
}
const mockConfigStore = new Map<string, Map<string, ScopedValue>>();

function mockSeedConfig(
  section: string,
  key: string,
  value: { global?: unknown; workspace?: unknown; folder?: { resource: string; value: unknown } }
): void {
  let sectionMap = mockConfigStore.get(section);
  if (!sectionMap) {
    sectionMap = new Map();
    mockConfigStore.set(section, sectionMap);
  }
  let entry = sectionMap.get(key);
  if (!entry) {
    entry = { folders: new Map() };
    sectionMap.set(key, entry);
  }
  if (value.global !== undefined) entry.global = value.global;
  if (value.workspace !== undefined) entry.workspace = value.workspace;
  if (value.folder) entry.folders.set(value.folder.resource, value.folder.value);
}

/** resource が属するワークスペースフォルダーを返す（prefix 一致、実 API と同じ意味論） */
function mockGetWorkspaceFolder(uri: { toString(): string }): { uri: MockUri } | undefined {
  const u = uri.toString();
  return mockVscode.workspace.workspaceFolders.find((f) => u.startsWith(f.uri.toString()));
}

/** 文書URI -> 設定の folder scope を識別するフォルダーURI */
function mockFolderKey(resource: { toString(): string } | undefined): string {
  if (!resource) return '';
  return mockGetWorkspaceFolder(resource)?.uri.toString() ?? '';
}

const mockConfigUpdates: Array<{
  section: string;
  resource: string;
  key: string;
  value: unknown;
  target: number;
}> = [];

/** update を任意に失敗させるためのフック（fault injection 用） */
let mockUpdateFailNext: ((key: string) => boolean) | undefined;

function mockMakeConfiguration(section: string, resource?: { toString(): string }) {
  const resKey = resource ? resource.toString() : '';
  const folderKey = mockFolderKey(resource);
  const sectionMap = mockConfigStore.get(section) ?? new Map<string, ScopedValue>();
  const effective = (key: string) => {
    const e = sectionMap.get(key);
    if (!e) return undefined;
    if (folderKey && e.folders.has(folderKey)) return e.folders.get(folderKey);
    if (e.workspace !== undefined) return e.workspace;
    return e.global;
  };
  return {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      const v = effective(key);
      return v === undefined ? defaultValue : v;
    }),
    inspect: jest.fn((key: string) => {
      const e = sectionMap.get(key);
      if (!e) return { key, defaultValue: undefined, globalValue: undefined, workspaceValue: undefined, workspaceFolderValue: undefined };
      return {
        key,
        defaultValue: undefined,
        globalValue: e.global,
        workspaceValue: e.workspace,
        workspaceFolderValue: folderKey ? e.folders.get(folderKey) : undefined,
      };
    }),
    update: jest.fn(async (key: string, value: unknown, target?: number) => {
      if (mockUpdateFailNext?.(key)) {
        throw new Error(`injected update failure for ${key}`);
      }
      let store = mockConfigStore.get(section);
      if (!store) {
        store = new Map();
        mockConfigStore.set(section, store);
      }
      let entry = store.get(key);
      if (!entry) {
        entry = { folders: new Map() };
        store.set(key, entry);
      }
      const t = target ?? 1;
      mockConfigUpdates.push({ section, resource: resKey, key, value, target: t });
      if (t === 2) {
        entry.workspace = value;
      } else if (t === 3) {
        entry.folders.set(folderKey, value);
      } else {
        entry.global = value;
      }
    }),
  };
}

const mockCommandHandlers = new Map<string, (...args: any[]) => unknown>();
const mockConfigListeners: Array<(e: { affectsConfiguration(s: string): boolean }) => void> = [];
const mockEditorListeners: Array<() => void> = [];
const mockCloseListeners: Array<(doc: { uri: { toString(): string } }) => void> = [];
const mockQuickPickQueue: unknown[] = [];

const mockWindow = {
  createOutputChannel: jest.fn(() => mockOutputChannel),
  createStatusBarItem: jest.fn(() => mockStatusBarItem),
  showErrorMessage: jest.fn(async () => undefined),
  showInformationMessage: jest.fn(async () => undefined),
  showWarningMessage: jest.fn(async () => undefined),
  showQuickPick: jest.fn(async () => mockQuickPickQueue.shift()),
  setStatusBarMessage: jest.fn(),
  onDidChangeActiveTextEditor: jest.fn((listener: () => void) => {
    mockEditorListeners.push(listener);
    return { dispose: jest.fn() };
  }),
  activeTextEditor: undefined as MockEditor | undefined,
};

const mockVscode = {
  window: mockWindow,
  workspace: {
    getConfiguration: jest.fn((section?: string, resource?: { toString(): string }) =>
      mockMakeConfiguration(section ?? '', resource)
    ),
    onDidChangeConfiguration: jest.fn((listener: (e: { affectsConfiguration(s: string): boolean }) => void) => {
      mockConfigListeners.push(listener);
      return { dispose: jest.fn() };
    }),
    workspaceFolders: [] as Array<{ uri: MockUri }>,
    getWorkspaceFolder: jest.fn((uri: { toString(): string }) => mockGetWorkspaceFolder(uri)),
    onDidCloseTextDocument: jest.fn((listener: (doc: { uri: { toString(): string } }) => void) => {
      mockCloseListeners.push(listener);
      return { dispose: jest.fn() };
    }),
    applyEdit: jest.fn(async () => true),
  },
  commands: {
    registerCommand: jest.fn((id: string, handler: (...args: any[]) => unknown) => {
      mockCommandHandlers.set(id, handler);
      return { dispose: jest.fn(() => mockCommandHandlers.delete(id)) };
    }),
    executeCommand: jest.fn(),
  },
  ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },
  StatusBarAlignment: { Left: 1, Right: 2 },
  ThemeColor: class {
    constructor(public id: string) {}
  },
  MarkdownString: class {
    isTrusted: unknown;
    value = '';
    appendMarkdown(t: string) { this.value += t; return this; }
    appendText(t: string) { this.value += t; return this; }
    appendCodepoint() { return this; }
  },
  Uri: { file: mockUri, parse: mockUri },
};

jest.mock('vscode', () => mockVscode, { virtual: true });

// ---------- vscode-languageclient fake ----------

class MockFakeClient {
  start = jest.fn<Promise<void>, []>(() => Promise.resolve());
  stop = jest.fn<Promise<void>, []>(() => Promise.resolve());
  state = 1; // Stopped
  sendRequest = jest.fn(async (): Promise<any> => undefined);
  sendNotification = jest.fn();
  notificationHandlers = new Map<string, (params: any) => void>();
  onNotification = jest.fn((method: string, handler: (params: any) => void) => {
    this.notificationHandlers.set(method, handler);
    return { dispose: jest.fn() };
  });
  private stateListeners: Array<(e: { oldState: number; newState: number }) => void> = [];
  onDidChangeState = jest.fn((listener: (e: { oldState: number; newState: number }) => void) => {
    this.stateListeners.push(listener);
    return { dispose: jest.fn() };
  });
  emitState(newState: number): void {
    const old = this.state;
    this.state = newState;
    for (const l of this.stateListeners) l({ oldState: old, newState });
  }
}

let mockLastClient: MockFakeClient | undefined;

jest.mock('vscode-languageclient/node', () => ({
  LanguageClient: jest.fn(() => {
    mockLastClient = new MockFakeClient();
    return mockLastClient;
  }),
  TransportKind: { ipc: 1 },
  State: { Stopped: 1, Running: 2, Starting: 3 },
}), { virtual: true });

// ---------- helpers ----------

const STATE = { Stopped: 1, Running: 2, Starting: 3 } as const;

function resetFakes(): void {
  mockConfigStore.clear();
  mockConfigUpdates.length = 0;
  mockCommandHandlers.clear();
  mockConfigListeners.length = 0;
  mockEditorListeners.length = 0;
  mockCloseListeners.length = 0;
  mockQuickPickQueue.length = 0;
  mockUpdateFailNext = undefined;
  mockLastClient = undefined;
  mockWindow.activeTextEditor = undefined;
  mockVscode.workspace.workspaceFolders = [];
  mockStatusBarItem.text = '';
  mockStatusBarItem.command = undefined;
  mockStatusBarItem.tooltip = '';
  mockStatusBarItem.backgroundColor = undefined;
  mockStatusBarItem.accessibilityInformation = undefined;
  jest.clearAllMocks();
  // clearAllMocks で消えた実装を戻す
  mockWindow.createOutputChannel.mockImplementation(() => mockOutputChannel);
  mockWindow.createStatusBarItem.mockImplementation(() => mockStatusBarItem);
  mockWindow.showQuickPick.mockImplementation(async () => mockQuickPickQueue.shift());
  mockWindow.onDidChangeActiveTextEditor.mockImplementation((listener: () => void) => {
    mockEditorListeners.push(listener);
    return { dispose: jest.fn() };
  });
  mockVscode.workspace.getConfiguration.mockImplementation(
    (section?: string, resource?: { toString(): string }) => mockMakeConfiguration(section ?? '', resource)
  );
  mockVscode.workspace.onDidChangeConfiguration.mockImplementation(
    (listener: (e: { affectsConfiguration(s: string): boolean }) => void) => {
      mockConfigListeners.push(listener);
      return { dispose: jest.fn() };
    }
  );
  mockVscode.commands.registerCommand.mockImplementation((id: string, handler: (...args: any[]) => unknown) => {
    mockCommandHandlers.set(id, handler);
    return { dispose: jest.fn(() => mockCommandHandlers.delete(id)) };
  });
  mockVscode.workspace.getWorkspaceFolder.mockImplementation((uri: { toString(): string }) => mockGetWorkspaceFolder(uri));
  mockVscode.workspace.onDidCloseTextDocument.mockImplementation((listener: (doc: { uri: { toString(): string } }) => void) => {
    mockCloseListeners.push(listener);
    return { dispose: jest.fn() };
  });
}

async function activateExtension(): Promise<typeof import('./extension')> {
  jest.resetModules();
  const mod = await import('./extension');
  const context = {
    subscriptions: [] as Array<{ dispose(): void }>,
    extensionPath: '/ext',
  };
  await mod.activate(context as any);
  return mod;
}

function cmd(id: string): (...args: any[]) => unknown {
  const h = mockCommandHandlers.get(id);
  if (!h) throw new Error(`command not registered: ${id}`);
  return h;
}

function setEditor(uri?: string, languageId = 'markdown'): void {
  mockWindow.activeTextEditor = uri
    ? { document: { uri: mockUri(uri), languageId, version: 1 } }
    : undefined;
}

function fireConfigChange(): void {
  for (const l of [...mockConfigListeners]) l({ affectsConfiguration: () => true });
}

function fireEditorChange(): void {
  for (const l of [...mockEditorListeners]) l();
}

function fireDocumentClose(uri: string): void {
  const doc = { uri: { toString: () => uri } };
  for (const l of [...mockCloseListeners]) l(doc);
}

function statusText(): string {
  return mockStatusBarItem.text;
}

const tick = () => new Promise<void>((r) => setImmediate(r));

beforeEach(resetFakes);

// ---------- #18 テーマコマンド ----------

describe('Issue #18: otakLsp.setTheme 引数なし呼び出し', () => {
  it('引数なしは例外にならず QuickPick でテーマ選択を開く', async () => {
    mockQuickPickQueue.push({ label: 'Vivid', themeId: 'vivid' });
    await activateExtension();
    await (cmd('otakLsp.setTheme')() as Promise<void>); // 例外で reject したら失敗
    expect(mockWindow.showQuickPick).toHaveBeenCalled();
  });

  it('引数なし→QuickPickキャンセルでは設定更新も例外もない', async () => {
    mockQuickPickQueue.push(undefined);
    await activateExtension();
    await (cmd('otakLsp.setTheme')() as Promise<void>);
    expect(mockConfigUpdates.filter((u) => u.section === 'editor')).toHaveLength(0);
  });

  it.each(['no-such-theme', 'constructor', '__proto__'])('無効なテーマID %s は例外にならず警告を出す', async invalidTheme => {
    await activateExtension();
    await (cmd('otakLsp.setTheme')(invalidTheme) as Promise<void>);
    expect(mockWindow.showWarningMessage).toHaveBeenCalled();
    expect(mockConfigUpdates.filter((u) => u.section === 'editor')).toHaveLength(0);
  });

  it('有効なテーマIDは従来どおり適用する', async () => {
    await activateExtension();
    await (cmd('otakLsp.setTheme')('nature') as Promise<void>);
    const updates = mockConfigUpdates.filter(
      (u) => u.section === 'editor' && u.key === 'semanticTokenColorCustomizations'
    );
    expect(updates).toHaveLength(1);
    const rules = (updates[0].value as any).rules;
    expect(rules.noun.foreground).toBe('#228B22'); // nature.noun
  });
});

// ---------- #19 サーバー状態表示と復旧 ----------

describe('Issue #19: サーバー状態表示と復旧', () => {
  it('起動失敗時はエラー表示になり、後続の設定変更イベントで上書きされない', async () => {
    await activateExtension();
    mockLastClient!.start.mockRejectedValueOnce(new Error('spawn failed'));
    // 手動 restart で失敗させる（activate時のstartは成功済みのため再起動経路で注入）
    await (cmd('otakLsp.restartServer')() as Promise<void>);
    expect(statusText()).toContain('エラー');
    expect(mockStatusBarItem.command).toBe('otakLsp.restartServer');
    // 設定変更イベントが来てもエラー表示を維持する
    mockSeedConfig('otakLsp', 'enableGrammarCheck', { global: true });
    fireConfigChange();
    expect(statusText()).toContain('エラー');
    expect(mockStatusBarItem.command).toBe('otakLsp.restartServer');
  });

  it('起動失敗→restartServer で実際に stop+start し成功すると稼働表示に戻る', async () => {
    await activateExtension();
    mockLastClient!.start.mockRejectedValueOnce(new Error('spawn failed'));
    await (cmd('otakLsp.restartServer')() as Promise<void>);
    expect(statusText()).toContain('エラー');

    mockLastClient!.stop.mockClear();
    mockLastClient!.start.mockClear();
    await (cmd('otakLsp.restartServer')() as Promise<void>);

    expect(mockLastClient!.stop).toHaveBeenCalledTimes(1);
    expect(mockLastClient!.start).toHaveBeenCalledTimes(1);
    expect(statusText()).toContain('ON');
    expect(mockStatusBarItem.command).toBe('otakLsp.toggle');
  });

  it('実行中に Stopped 状態遷移すると「停止」表示になり再起動導線になる', async () => {
    await activateExtension();
    expect(statusText()).toContain('ON');
    mockLastClient!.emitState(STATE.Stopped);
    expect(statusText()).toContain('停止');
    expect(mockStatusBarItem.command).toBe('otakLsp.restartServer');
  });

  it('restartServer 連打は直列化され、stop/start が同時並行しない', async () => {
    await activateExtension();
    mockLastClient!.start.mockClear(); // activate 時の初回 start を除外
    let concurrent = 0;
    let maxConcurrent = 0;
    mockLastClient!.start.mockImplementation(async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await tick();
      concurrent--;
    });
    const p1 = cmd('otakLsp.restartServer')() as Promise<void>;
    const p2 = cmd('otakLsp.restartServer')() as Promise<void>;
    await Promise.all([p1, p2]);
    expect(maxConcurrent).toBe(1);
    expect(mockLastClient!.start).toHaveBeenCalledTimes(2);
  });

  it('stop 失敗時は start を呼ばずエラー終端し、再試行で復旧できる', async () => {
    await activateExtension();
    mockLastClient!.start.mockClear();
    mockLastClient!.stop.mockRejectedValueOnce(new Error('stop failed'));
    await (cmd('otakLsp.restartServer')() as Promise<void>);

    // 停止を確認できないまま新規起動は試みない（明示的な失敗終端）
    expect(mockLastClient!.start).not.toHaveBeenCalled();
    expect(statusText()).toContain('エラー');
    expect(mockWindow.showErrorMessage).toHaveBeenCalled();
    expect(mockStatusBarItem.command).toBe('otakLsp.restartServer');

    // 再試行は通常どおり stop+start を試み、成功すれば稼働に戻る
    mockLastClient!.stop.mockClear();
    await (cmd('otakLsp.restartServer')() as Promise<void>);
    expect(mockLastClient!.stop).toHaveBeenCalledTimes(1);
    expect(mockLastClient!.start).toHaveBeenCalledTimes(1);
    expect(statusText()).toContain('ON');
  });

  it('showStatus の Configuration JSON はアクティブ文書の実効値を出す', async () => {
    mockVscode.workspace.workspaceFolders = [{ uri: mockUri('/ws/folderA') }, { uri: mockUri('/ws/folderB') }];
    // folderA のみ grammar=false（global は true）
    mockSeedConfig('otakLsp', 'enableGrammarCheck', { global: true, folder: { resource: '/ws/folderA', value: false } });
    setEditor('/ws/folderA/a.md');
    await activateExtension();

    cmd('otakLsp.showStatus')();
    const lines = mockOutputChannel.appendLine.mock.calls.map((c) => String(c[0]));
    const jsonLine = lines.find((l) => l.includes('enableGrammarCheck'));
    expect(jsonLine).toBeDefined();
    // global の true ではなく folderA の実効値 false を表示する
    expect(jsonLine).toContain('"enableGrammarCheck": false');
  });

  it('showStatus は起動時の設定ではなく最新の設定を表示する', async () => {
    mockSeedConfig('otakLsp', 'enableGrammarCheck', { global: true });
    await activateExtension();
    // activate 後に設定を変更
    mockSeedConfig('otakLsp', 'enableGrammarCheck', { global: false });
    fireConfigChange();
    cmd('otakLsp.showStatus')();
    const lines = mockOutputChannel.appendLine.mock.calls.map((c) => String(c[0]));
    const jsonLine = lines.find((l) => l.includes('enableGrammarCheck'));
    expect(jsonLine).toBeDefined();
    expect(jsonLine).toContain('false');
  });
});

// ---------- #20 文書スコープのON/OFF ----------

describe('Issue #20: アクティブ文書のスコープとトグル', () => {
  const docA = '/ws/folderA/a.md';
  const docB = '/ws/folderB/b.md';
  // A/B が別 folder scope を持つマルチルート構成
  const twoFolders = [{ uri: mockUri('/ws/folderA') }, { uri: mockUri('/ws/folderB') }];

  it('フォルダー上書きがある文書では WorkspaceFolder スコープへ書き、他スコープへコピーしない', async () => {
    mockVscode.workspace.workspaceFolders = twoFolders;
    // folderA では semantic のみ ON（grammar は明示 false）
    mockSeedConfig('otakLsp', 'enableGrammarCheck', { global: true, folder: { resource: '/ws/folderA', value: false } });
    mockSeedConfig('otakLsp', 'enableSemanticHighlight', { global: true, folder: { resource: '/ws/folderA', value: true } });
    setEditor(docA);
    await activateExtension();

    await (cmd('otakLsp.toggle')() as Promise<void>);

    const ups = mockConfigUpdates.filter((u) => u.section === 'otakLsp');
    expect(ups).toHaveLength(2);
    for (const u of ups) {
      expect(u.target).toBe(3 /* WorkspaceFolder */);
      expect(u.resource).toBe(docA);
      expect(u.value).toBe(false);
    }
  });

  it('OFF→ON で元の個別ON/OFF組合せを folder owner 単位で復元する', async () => {
    mockVscode.workspace.workspaceFolders = twoFolders;
    mockSeedConfig('otakLsp', 'enableGrammarCheck', { global: true, folder: { resource: '/ws/folderA', value: false } });
    mockSeedConfig('otakLsp', 'enableSemanticHighlight', { global: true, folder: { resource: '/ws/folderA', value: true } });
    setEditor(docA);
    await activateExtension();

    await (cmd('otakLsp.toggle')() as Promise<void>); // OFF
    mockConfigUpdates.length = 0;
    await (cmd('otakLsp.toggle')() as Promise<void>); // ON: {grammar:false, semantic:true} を復元

    const ups = mockConfigUpdates.filter((u) => u.section === 'otakLsp');
    expect(ups).toHaveLength(2);
    const g = ups.find((u) => u.key === 'enableGrammarCheck');
    const s = ups.find((u) => u.key === 'enableSemanticHighlight');
    expect(g).toMatchObject({ value: false, target: 3 });
    expect(s).toMatchObject({ value: true, target: 3 });
  });

  it('同一ワークスペース内の別文書でも共有scopeの元組合せを復元する（実機RED C20 再現）', async () => {
    mockVscode.workspace.workspaceFolders = [{ uri: mockUri('/ws') }];
    const a = '/ws/a.md';
    const b = '/ws/b.md';
    // Workspace scope 値: grammar=true, semantic=false（folder 上書きなし）
    mockSeedConfig('otakLsp', 'enableGrammarCheck', { global: true, workspace: true });
    mockSeedConfig('otakLsp', 'enableSemanticHighlight', { global: true, workspace: false });
    setEditor(a);
    await activateExtension();

    await (cmd('otakLsp.toggle')() as Promise<void>); // A を OFF → workspace owner に {T,F} を保存

    // 同一ワークスペースの B へ切替 → ON。
    // 設定の所有者は Workspace（文書ではない）なので、B からでも {T,F} を復元する。
    setEditor(b);
    fireEditorChange();
    mockConfigUpdates.length = 0;
    await (cmd('otakLsp.toggle')() as Promise<void>);

    const ups = mockConfigUpdates.filter((u) => u.section === 'otakLsp');
    expect(ups).toHaveLength(2);
    for (const u of ups) {
      expect(u.target).toBe(2 /* Workspace */);
      expect(u.resource).toBe(b);
    }
    const g = ups.find((u) => u.key === 'enableGrammarCheck');
    const s = ups.find((u) => u.key === 'enableSemanticHighlight');
    expect(g?.value).toBe(true);
    expect(s?.value).toBe(false); // {T,T} への一括書き換えは実機REDの再現
  });

  it('ワークスペース内の文書は Global 値が存在しても Global へ拡大しない', async () => {
    mockVscode.workspace.workspaceFolders = [{ uri: mockUri('/ws') }];
    // Global にのみ明示値（Workspace/Folder 値なし）
    mockSeedConfig('otakLsp', 'enableGrammarCheck', { global: false });
    mockSeedConfig('otakLsp', 'enableSemanticHighlight', { global: false });
    setEditor('/ws/a.md');
    await activateExtension();

    await (cmd('otakLsp.toggle')() as Promise<void>); // OFF → ON（Global値 false のまま操作しない）

    const ups = mockConfigUpdates.filter((u) => u.section === 'otakLsp');
    expect(ups).toHaveLength(2);
    for (const u of ups) {
      expect(u.target).toBe(2 /* Workspace */); // Workspace 内の操作は Workspace へ
    }
  });

  it('ワークスペース外の文書は Global へ書く（Workspace値はその文書に効かない）', async () => {
    mockVscode.workspace.workspaceFolders = [{ uri: mockUri('/ws') }];
    mockSeedConfig('otakLsp', 'enableGrammarCheck', { global: true });
    mockSeedConfig('otakLsp', 'enableSemanticHighlight', { global: true });
    setEditor('/other/loose.md');
    await activateExtension();

    await (cmd('otakLsp.toggle')() as Promise<void>);

    const ups = mockConfigUpdates.filter((u) => u.section === 'otakLsp');
    expect(ups).toHaveLength(2);
    for (const u of ups) {
      expect(u.target).toBe(1 /* Global */);
    }
  });

  it('別フォルダーの文書とは scope を混ぜない（A/B 文書切替）', async () => {
    mockVscode.workspace.workspaceFolders = twoFolders;
    mockSeedConfig('otakLsp', 'enableGrammarCheck', { global: true, folder: { resource: '/ws/folderA', value: false } });
    mockSeedConfig('otakLsp', 'enableSemanticHighlight', { global: true, folder: { resource: '/ws/folderA', value: true } });
    // docB は両方 folder で明示 false（= 実効 OFF）
    mockSeedConfig('otakLsp', 'enableGrammarCheck', { global: true, folder: { resource: '/ws/folderB', value: false } });
    mockSeedConfig('otakLsp', 'enableSemanticHighlight', { global: true, folder: { resource: '/ws/folderB', value: false } });
    setEditor(docA);
    await activateExtension();

    await (cmd('otakLsp.toggle')() as Promise<void>); // A を OFF（folderA owner に {F,T} を保存）
    setEditor(docB);
    fireEditorChange();
    mockConfigUpdates.length = 0;
    await (cmd('otakLsp.toggle')() as Promise<void>); // B を ON: folderB 保存済みなし → 両方 true

    const ups = mockConfigUpdates.filter((u) => u.section === 'otakLsp');
    for (const u of ups) {
      expect(u.resource).toBe(docB);
      expect(u.value).toBe(true); // A の {F,T} を引き継がない
    }
  });

  it('toggle の resource は呼出し時点で固定する（queue待ち中のエディタ切替で他文書を書き換えない）', async () => {
    mockVscode.workspace.workspaceFolders = [{ uri: mockUri('/ws') }];
    const a = '/ws/a.md';
    const b = '/ws/b.md';
    mockSeedConfig('otakLsp', 'enableGrammarCheck', { workspace: true });
    mockSeedConfig('otakLsp', 'enableSemanticHighlight', { workspace: true });
    setEditor(a);
    await activateExtension();
    mockConfigUpdates.length = 0;

    const togglePromise = cmd('otakLsp.toggle')() as Promise<void>;
    setEditor(b); // queue 処理中にエディタを切替えても、書き込み先は呼出し時点の A
    await togglePromise;

    const ups = mockConfigUpdates.filter((u) => u.section === 'otakLsp');
    expect(ups.length).toBeGreaterThan(0);
    expect(ups.every((u) => u.resource === a)).toBe(true);
  });

  it('連打は直列化され、最終状態は実効設定と一致する', async () => {
    mockVscode.workspace.workspaceFolders = [{ uri: mockUri('/ws') }];
    mockSeedConfig('otakLsp', 'enableGrammarCheck', { global: true });
    mockSeedConfig('otakLsp', 'enableSemanticHighlight', { global: true });
    setEditor(docA);
    await activateExtension();

    const t = cmd('otakLsp.toggle');
    await Promise.all([t(), t(), t()] as Promise<void>[]); // ON→OFF→ON→OFF

    const c = mockMakeConfiguration('otakLsp', { toString: () => docA });
    expect(c.get('enableGrammarCheck')).toBe(false);
    expect(c.get('enableSemanticHighlight')).toBe(false);
    expect(statusText()).toContain('OFF');
  });

  it('更新が途中失敗しても表示は実際の設定に従い、エラーを通知する', async () => {
    mockVscode.workspace.workspaceFolders = [{ uri: mockUri('/ws') }];
    mockSeedConfig('otakLsp', 'enableGrammarCheck', { global: true });
    mockSeedConfig('otakLsp', 'enableSemanticHighlight', { global: true });
    setEditor(docA);
    await activateExtension();

    mockUpdateFailNext = (key) => key === 'enableSemanticHighlight';
    await (cmd('otakLsp.toggle')() as Promise<void>);
    expect(mockWindow.showErrorMessage).toHaveBeenCalled();
    // grammar は false が適用、semantic は true のまま → 実効 ON 表示
    expect(statusText()).toContain('ON');
  });
});

// ---------- #21 手動解析の完了応答 ----------

describe('Issue #21: otakLsp/analyzeDocument 応答の表示', () => {
  beforeEach(async () => {
    setEditor('/ws/doc.md');
    await activateExtension();
  });

  it('completed は件数つきで完了表示する', async () => {
    mockLastClient!.sendRequest.mockResolvedValue({ ok: true, status: 'completed', diagnostics: 3 });
    await (cmd('otakLsp.analyzeCurrentFile')() as Promise<void>);
    expect(mockWindow.setStatusBarMessage).toHaveBeenCalledWith(expect.stringMatching(/再解析|完了/), expect.anything());
    const msg = mockWindow.setStatusBarMessage.mock.calls[0][0] as string;
    expect(msg).toContain('3');
  });

  it.each([
    ['disabled', /無効/],
    ['not-target-language', /対象外|対象ではありません/],
    ['document-too-large', /上限|大きすぎ|超え/],
    ['unknown-document', /認識/],
  ])('skipped/rejected reason=%s を理由つき警告で表示する', async (reason, pattern) => {
    const status = reason === 'unknown-document' ? 'rejected' : 'skipped';
    mockLastClient!.sendRequest.mockResolvedValue({ ok: false, status, reason });
    await (cmd('otakLsp.analyzeCurrentFile')() as Promise<void>);
    expect(mockWindow.showWarningMessage).toHaveBeenCalledWith(expect.stringMatching(pattern));
  });

  it('failed(timeout) はタイムアウトを伝える', async () => {
    mockLastClient!.sendRequest.mockResolvedValue({ ok: false, status: 'failed', reason: 'timeout' });
    await (cmd('otakLsp.analyzeCurrentFile')() as Promise<void>);
    expect(mockWindow.showErrorMessage).toHaveBeenCalledWith(expect.stringMatching(/タイムアウト/));
  });

  it('cancelled は中断として表示する（完了扱いしない）', async () => {
    mockLastClient!.sendRequest.mockResolvedValue({ ok: false, status: 'cancelled', reason: 'stale' });
    await (cmd('otakLsp.analyzeCurrentFile')() as Promise<void>);
    expect(mockWindow.showWarningMessage).toHaveBeenCalledWith(expect.stringMatching(/中断|キャンセル/));
    expect(mockWindow.setStatusBarMessage).not.toHaveBeenCalledWith(expect.stringMatching(/再解析/), expect.anything());
  });

  it('sendRequest 自体が拒否された場合はエラー表示する', async () => {
    mockLastClient!.sendRequest.mockRejectedValue(new Error('connection lost'));
    await (cmd('otakLsp.analyzeCurrentFile')() as Promise<void>);
    expect(mockWindow.showErrorMessage).toHaveBeenCalled();
  });
});

// ---------- #23 解析通知 ----------

describe('Issue #23: otakLsp/analysisNotice 通知', () => {
  it('スキップ通知を利用者に表示し、同一内容の再通知は出力パネルのみに抑止する', async () => {
    await activateExtension();
    const handler = mockLastClient!.notificationHandlers.get('otakLsp/analysisNotice');
    expect(handler).toBeDefined();
    const notice = { uri: 'file:///big.md', kind: 'analysis-skipped', reason: 'document-too-large' };
    handler!(notice);
    expect(mockWindow.setStatusBarMessage).toHaveBeenCalledTimes(1);
    handler!(notice);
    handler!(notice);
    // 再通知はステータスバーへ出さない（出力パネルには全件残す）
    expect(mockWindow.setStatusBarMessage).toHaveBeenCalledTimes(1);
    const noticeLogs = mockOutputChannel.appendLine.mock.calls.filter((c) => String(c[0]).includes('big.md'));
    expect(noticeLogs.length).toBeGreaterThanOrEqual(3);
  });

  it('通知内容が変化したら再表示する（省略件数の更新は新しい情報）', async () => {
    await activateExtension();
    const handler = mockLastClient!.notificationHandlers.get('otakLsp/analysisNotice');
    const uri = 'file:///a.md';
    handler!({ uri, kind: 'diagnostics-truncated', omitted: 5, total: 12 });
    handler!({ uri, kind: 'diagnostics-truncated', omitted: 5, total: 12 }); // 同一内容→抑止
    handler!({ uri, kind: 'diagnostics-truncated', omitted: 9, total: 12 }); // 変化→再表示
    expect(mockWindow.setStatusBarMessage).toHaveBeenCalledTimes(2);
  });

  it('文書クローズで通知履歴を破棄し、再オープン後は再通知できる', async () => {
    await activateExtension();
    const handler = mockLastClient!.notificationHandlers.get('otakLsp/analysisNotice');
    const notice = { uri: 'file:///a.md', kind: 'analysis-skipped', reason: 'document-too-large' };
    handler!(notice);
    expect(mockWindow.setStatusBarMessage).toHaveBeenCalledTimes(1);
    fireDocumentClose('file:///a.md');
    handler!(notice);
    expect(mockWindow.setStatusBarMessage).toHaveBeenCalledTimes(2);
  });

  it('診断打ち切り通知は省略件数と全体件数を表示する', async () => {
    await activateExtension();
    const handler = mockLastClient!.notificationHandlers.get('otakLsp/analysisNotice');
    handler!({ uri: 'file:///a.md', kind: 'diagnostics-truncated', omitted: 5, total: 12 });
    const msg = mockWindow.setStatusBarMessage.mock.calls[0][0] as string;
    expect(msg).toContain('5');
    expect(msg).toContain('12');
  });

  it('解析失敗は警告＋出力パネル導線を出す', async () => {
    await activateExtension();
    mockWindow.showWarningMessage.mockResolvedValueOnce('出力パネルを開く' as any);
    const handler = mockLastClient!.notificationHandlers.get('otakLsp/analysisNotice');
    handler!({ uri: 'file:///a.md', kind: 'analysis-failed', reason: 'boom' });
    await tick();
    expect(mockWindow.showWarningMessage).toHaveBeenCalledWith(expect.stringMatching(/失敗/), expect.anything());
    expect(mockOutputChannel.show).toHaveBeenCalled();
  });
});

// ---------- #24 修正候補の説明表示 ----------

describe('Issue #24: otakLsp.showSuggestion コマンド', () => {
  it('修正案の説明を表示し、文書へ自動編集しない', async () => {
    await activateExtension();
    cmd('otakLsp.showSuggestion')('文を2つに分割してください');
    expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(expect.stringContaining('分割'));
    expect(mockVscode.workspace.applyEdit).not.toHaveBeenCalled();
  });

  it('引数なしでも例外にならない', async () => {
    await activateExtension();
    expect(() => cmd('otakLsp.showSuggestion')()).not.toThrow();
  });
});

// ---------- #22 テーマ設定のスコープ ----------

describe('Issue #22: semanticTokenColorCustomizations のスコープ', () => {
  it('別テーマだけの設定は現在の配色を上書きすると誤報しない', async () => {
    mockSeedConfig('workbench', 'colorTheme', { global: 'Test Dark' });
    mockSeedConfig('editor', 'semanticTokenColorCustomizations', {
      global: { '[Other Light]': { rules: { noun: '#ffffff' } } },
    });
    await activateExtension();
    await (cmd('otakLsp.setTheme')('vivid') as Promise<void>);
    expect(mockWindow.showWarningMessage).not.toHaveBeenCalled();
  });

  it('ワークスペース値がある場合は Workspace の生値に管理キーだけマージし、Global値をコピーしない', async () => {
    mockSeedConfig('editor', 'semanticTokenColorCustomizations', {
      global: {
        enabled: true,
        rules: { noun: { foreground: '#G0BAL' }, userCustom: { foreground: '#C' } },
        globalOnlyKey: 'keep-me-in-global',
      },
      workspace: { rules: { noun: { foreground: '#W0RK' } } },
    });
    await activateExtension();
    await (cmd('otakLsp.setTheme')('vivid') as Promise<void>);

    const ups = mockConfigUpdates.filter((u) => u.section === 'editor');
    expect(ups).toHaveLength(1);
    expect(ups[0].target).toBe(2 /* Workspace */);
    const value = ups[0].value as any;
    expect(value.rules.noun.foreground).toBe('#00D4AA'); // vivid.noun
    // Global だけの値をコピーしない
    expect(value.globalOnlyKey).toBeUndefined();
    expect(value.rules.userCustom).toBeUndefined();
    expect(value.enabled).toBeUndefined();
  });

  it('どのスコープにも未設定なら Global に書く（既存動作の維持）', async () => {
    await activateExtension();
    await (cmd('otakLsp.setTheme')('nature') as Promise<void>);
    const ups = mockConfigUpdates.filter((u) => u.section === 'editor');
    expect(ups[0].target).toBe(1 /* Global */);
  });

  it.each(['[Test Dark]', '[Other][Test Dark]', '[*Dark]', '[Test*]'])('配色テーマ指定 %s が管理キーを上書きする場合は警告する', async selector => {
    mockSeedConfig('workbench', 'colorTheme', { global: 'Test Dark' });
    mockSeedConfig('editor', 'semanticTokenColorCustomizations', {
      global: {
        rules: { noun: { foreground: '#AAA' } },
        [selector]: { rules: { noun: { foreground: '#XXX' } } },
      },
    });
    await activateExtension();
    await (cmd('otakLsp.setTheme')('vivid') as Promise<void>);
    expect(mockWindow.showWarningMessage).toHaveBeenCalledWith(expect.stringContaining('Test Dark'));
  });
});

// ---------- #27 デバッグログ案内 ----------

describe('Issue #27: デバッグログの案内', () => {
  it('showStatus がデバッグログの状態と有効化方法を出力する', async () => {
    mockSeedConfig('otakLsp', 'debugLog', { global: true });
    await activateExtension();
    cmd('otakLsp.showStatus')();
    const lines = mockOutputChannel.appendLine.mock.calls.map((c) => String(c[0]));
    const debugLine = lines.find((l) => /[Dd]ebug/.test(l));
    expect(debugLine).toBeDefined();
    expect(debugLine).toContain('true');
    expect(debugLine).toContain('OTAK_LSP_DEBUG');
  });
});
