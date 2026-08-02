export interface LspServerOptions {
    command: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string>;
    timeoutMs?: number;
    /** Server root directory; defaults to the workspace root. */
    rootDir?: string;
}

export interface LspClientInfo {
    name: string;
    version?: string;
}

export interface LspClientOptions {
    /** File-extension ('.ts', '.py', ...) to server launch options. */
    servers?: Record<string, LspServerOptions>;
    timeoutMs?: number;
    clientInfo?: LspClientInfo;
}

export interface LspPosition {
    line: number;
    character: number;
}

export interface LspRange {
    start: LspPosition;
    end: LspPosition;
}

export interface LspLocation {
    uri: string;
    range: LspRange;
}

export interface LspDiagnostic {
    range: LspRange;
    severity?: number;
    code?: string | number;
    source?: string;
    message: string;
}

export interface LspSymbol {
    name: string;
    kind: number;
    range: LspRange;
    selectionRange?: LspRange;
    detail?: string;
    children?: LspSymbol[];
}

export interface LspDocumentSymbolResult {
    uri: string;
    symbols: LspSymbol[];
}

export interface LspCapabilities {
    definitionProvider: boolean;
    referencesProvider: boolean;
    documentSymbolProvider: boolean;
    diagnosticProvider: boolean;
}

export interface LspRequestParams {
    textDocument?: { uri: string };
    position?: LspPosition;
    context?: { includeDeclaration?: boolean };
    previousResultId?: string;
}
