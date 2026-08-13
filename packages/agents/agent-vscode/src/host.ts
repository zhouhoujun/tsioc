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
}

export interface WebviewPanelLike extends DisposableLike {
    webview: WebviewLike;
    reveal(column?: unknown): void;
    onDidDispose(listener: () => unknown): DisposableLike;
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
        createWebviewPanel(viewType: string, title: string, column: unknown, options: unknown): WebviewPanelLike;
        showErrorMessage(message: string): unknown;
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
