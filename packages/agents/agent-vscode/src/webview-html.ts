export interface AgentWebviewHtmlOptions {
    cspSource: string;
    scriptUri: string;
    baseUrl: string;
    token?: string;
    sessionId?: string;
    workspace?: string;
    nonce: string;
}

function jsonForInlineScript(value: unknown): string {
    return JSON.stringify(value)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}

export function normalizeGatewayUrl(value: string): string {
    const normalized = value.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(normalized)) {
        throw new Error('TSDI Agent gatewayUrl must use http:// or https://');
    }
    return normalized;
}

export function buildAgentWebviewHtml(options: AgentWebviewHtmlOptions): string {
    const config = jsonForInlineScript({
        baseUrl: normalizeGatewayUrl(options.baseUrl),
        token: options.token || '',
        sessionId: options.sessionId || undefined,
        workspace: options.workspace || undefined
    });
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${options.cspSource} data: https:; style-src ${options.cspSource} 'unsafe-inline'; script-src 'nonce-${options.nonce}'; connect-src http: https:; font-src ${options.cspSource};">
    <title>TSDI Agent</title>
    <style>
        html, body { margin: 0; height: 100%; background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); font-family: var(--vscode-editor-font-family); }
        #agent-console { box-sizing: border-box; height: 100vh; overflow: auto; padding: 10px; }
    </style>
</head>
<body>
    <div id="agent-console"></div>
    <script nonce="${options.nonce}">globalThis.__TSDI_AGENT_WEB__ = ${config};</script>
    <script nonce="${options.nonce}" src="${options.scriptUri}"></script>
</body>
</html>`;
}
