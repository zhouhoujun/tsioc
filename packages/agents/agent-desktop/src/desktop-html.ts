/**
 * Generates the desktop console host HTML — the Electron `BrowserWindow`
 * equivalent of the VS Code webview host (P93). It injects the gateway
 * connection config as `__TSDI_AGENT_WEB__` (JSON-escaped, nonce-guarded CSP)
 * and loads the P91 web console bundle (`agent-console.js`) from a local
 * `file://` URI.
 */

export interface DesktopHtmlOptions {
    /** file:// URI of the bundled web console script (agent-console.js) */
    scriptUri: string;
    /** Gateway base URL, e.g. http://127.0.0.1:3000 */
    baseUrl: string;
    /** Optional gateway bearer token */
    token?: string;
    /** Initial session id */
    sessionId?: string;
    /** Workspace label shown in the console */
    workspace?: string;
    /** CSP nonce for the inline config script */
    nonce: string;
    /** Window title shown in the host page */
    title?: string;
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

export function buildDesktopHtml(options: DesktopHtmlOptions): string {
    const config = jsonForInlineScript({
        baseUrl: normalizeGatewayUrl(options.baseUrl),
        token: options.token || '',
        sessionId: options.sessionId || undefined,
        workspace: options.workspace || undefined
    });
    const title = options.title || 'TSDI Agent';
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https: http:; style-src 'unsafe-inline'; script-src 'nonce-${options.nonce}'; connect-src http: https:; font-src data:;">
    <title>${title}</title>
    <style>
        html, body { margin: 0; height: 100%; background: #0d1117; color: #c9d1d9; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
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
