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
    const tabScript = `(function () {
        const storageKey = 'tsdi-agent-desktop-tabs-v1';
        const params = new URLSearchParams(globalThis.location.search);
        const requested = params.get('session');
        let tabs = [];
        try { tabs = JSON.parse(globalThis.localStorage.getItem(storageKey) || '[]'); } catch (_) { tabs = []; }
        tabs = Array.isArray(tabs) ? tabs.filter(item => item && typeof item.id === 'string').slice(0, 9) : [];
        const configured = globalThis.__TSDI_AGENT_WEB__.sessionId;
        const active = requested || configured || 'console';
        globalThis.__TSDI_AGENT_WEB__.sessionId = active;
        if (!tabs.some(item => item.id === active)) tabs.push({ id: active, title: active });
        const save = () => globalThis.localStorage.setItem(storageKey, JSON.stringify(tabs.slice(0, 9)));
        const open = id => {
            const url = new URL(globalThis.location.href);
            url.searchParams.set('session', id);
            globalThis.location.href = url.href;
        };
        const render = () => {
            const bar = document.getElementById('session-tabs');
            if (!bar) return;
            bar.textContent = '';
            tabs.slice(0, 9).forEach((tab, index) => {
                const button = document.createElement('button');
                button.className = 'session-tab' + (tab.id === active ? ' active' : '');
                button.title = 'Session ' + tab.id + ' (' + (index + 1) + ')';
                button.type = 'button';
                const label = document.createElement('span');
                label.textContent = tab.title || tab.id;
                button.appendChild(label);
                const close = document.createElement('span');
                close.className = 'session-tab-close';
                close.textContent = '\u00d7';
                close.title = 'Close session tab';
                close.addEventListener('click', event => {
                    event.stopPropagation();
                    tabs = tabs.filter(item => item.id !== tab.id);
                    save();
                    if (tab.id === active) open(tabs[Math.max(0, index - 1)]?.id || 'console');
                    else render();
                });
                button.appendChild(close);
                button.addEventListener('click', () => open(tab.id));
                bar.appendChild(button);
            });
            const add = document.createElement('button');
            add.className = 'session-tab-add';
            add.type = 'button';
            add.title = 'New session tab';
            add.textContent = '+';
            add.addEventListener('click', () => open('console-' + Date.now().toString(36)));
            bar.appendChild(add);
        };
        globalThis.addEventListener('keydown', event => {
            if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
            const index = Number(event.key) - 1;
            if (index >= 0 && index < tabs.length) {
                event.preventDefault();
                open(tabs[index].id);
            }
        });
        save();
        render();
    })();`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https: http:; style-src 'unsafe-inline'; script-src 'nonce-${options.nonce}'; connect-src http: https:; font-src data:;">
    <title>${title}</title>
    <style>
        html, body { margin: 0; height: 100%; background: #0d1117; color: #c9d1d9; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
        body { display: grid; grid-template-rows: 36px minmax(0, 1fr); }
        #session-tabs { display: flex; align-items: end; gap: 2px; overflow-x: auto; padding: 4px 6px 0; background: #161b22; border-bottom: 1px solid #30363d; }
        .session-tab, .session-tab-add { height: 31px; border: 0; border-radius: 4px 4px 0 0; background: transparent; color: #8b949e; font: inherit; cursor: pointer; }
        .session-tab { display: flex; align-items: center; gap: 8px; min-width: 96px; max-width: 220px; padding: 0 8px 0 12px; }
        .session-tab span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .session-tab:hover, .session-tab.active { background: #0d1117; color: #f0f6fc; }
        .session-tab.active { box-shadow: inset 0 2px #2f81f7; }
        .session-tab-close { margin-left: auto; font-size: 16px; line-height: 1; }
        .session-tab-add { width: 32px; min-width: 32px; font-size: 20px; }
        #agent-console { box-sizing: border-box; min-height: 0; overflow: auto; padding: 10px; }
    </style>
</head>
<body>
    <nav id="session-tabs" aria-label="Session tabs"></nav>
    <div id="agent-console"></div>
    <script nonce="${options.nonce}">globalThis.__TSDI_AGENT_WEB__ = ${config};</script>
    <script nonce="${options.nonce}">${tabScript}</script>
    <script nonce="${options.nonce}" src="${options.scriptUri}"></script>
</body>
</html>`;
}
