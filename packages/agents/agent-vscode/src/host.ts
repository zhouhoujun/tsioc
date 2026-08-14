export interface DisposableLike {
    dispose(): unknown;
}

export interface UriLike {
    toString(): string;
}

export interface WebviewLike {
    html: string;
    cspSource: string;
    asWebviewUri(uri: unknown): UriLike;
    postMessage(message: unknown): PromiseLike<boolean>;
}

export interface TextEditorLike {
    document: { fileName: string };
    selection: { start: { line: number }; end: { line: number } };
}

export interface WebviewPanelLike extends DisposableLike {
    webview: WebviewLike;
    reveal(column?: unknown): void;
    onDidDispose(listener: () => unknown): DisposableLike;
    onDidReceiveMessage(listener: (message: unknown) => unknown): DisposableLike;
}

export interface WorkspaceFolderLike {
    uri: { fsPath: string };
}

export interface ConfigurationLike {
    get<T>(key: string, defaultValue: T): T;
}

export interface VsCodeHost {
    ViewColumn: { Beside: unknown };
    Uri: { joinPath(base: unknown, ...paths: string[]): unknown };
    commands: {
        registerCommand(command: string, handler: () => unknown): DisposableLike;
    };
    window: {
        activeTextEditor?: TextEditorLike | null;
        createWebviewPanel(viewType: string, title: string, column: unknown, options: unknown): WebviewPanelLike;
        showErrorMessage(message: string): unknown;
        onDidChangeActiveTextEditor(listener: (editor: TextEditorLike | null) => unknown): DisposableLike;
    };
    workspace: {
        workspaceFolders?: WorkspaceFolderLike[];
        getConfiguration(section: string): ConfigurationLike;
        onDidChangeConfiguration(listener: (event: { affectsConfiguration(section: string): boolean }) => unknown): DisposableLike;
    };
}

export interface ExtensionContextLike {
    extensionUri: unknown;
    subscriptions: DisposableLike[];
}
