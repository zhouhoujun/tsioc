/**
 * P282 — Browser interaction gate (slash-command diagnostics + draft preservation).
 *
 * Runs the REAL web console (web/dist/agent-console.js) in headless Google Chrome
 * against an in-process Node bridge that speaks the same wire contract the
 * packaged HTTP transport uses (`HttpAgentConsoleAppRpc` + `AgentConsoleRemoteEventBridge`):
 *
 *   - `POST {base}/rpc`           -> JSON-RPC 2.0 envelope `{jsonrpc,id,result}`
 *                                    (or `{error:{code:-32601}}` for unknown methods, HTTP 200)
 *   - `GET  {base}/api/events`    -> `text/event-stream` consumed from the FakeAgentGateway SSE channel
 *   - any other path              -> static `web/` file or HTTP 404
 *
 * The P282 acceptance assertions exercised end-to-end in a real browser:
 *   1. invalid enum verb  -> command diagnostic rendered (notice) AND the draft line preserved
 *   2. valid   retry      -> command executes, diagnostic clears, draft consumed
 *   3. invalid `--statusline` verb -> same diagnostic + draft-preserved contract
 *   4. valid variadic `--statusline set` -> success notice
 * plus wire evidence that the console actually talked to this bridge (timeline.query RPC).
 *
 * Usage:
 *   cd packages/agents/agent-ui
 *   npx ts-node -r tsconfig-paths/register harness/run-browser-gate.ts
 *
 * Exit 0 = PASS, 1 = FAIL. On failure an artifact dir `harness/.gate-artifacts/` is written.
 */

import { createReadStream } from 'node:fs';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { chromium, type Browser, type Page } from 'playwright-core';

import { FakeAgentGateway } from './FakeAgentGateway';
import { scenarioById } from './scenarios';
import { collectorSource } from './metrics';

// ---------------------------------------------------------------------------
// 1. HTTP bridge over the fake gateway (mirrors FakeAgentGateway.createFetchImpl)
// ---------------------------------------------------------------------------

const WEB_ROOT = resolve(__dirname, '..', 'web');

const MIME: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.webmanifest': 'application/manifest+json',
    '.json': 'application/json; charset=utf-8'
};

function sendStatic(req: IncomingMessage, res: ServerResponse): void {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const relative = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    const filePath = normalize(join(WEB_ROOT, relative));
    if (!filePath.startsWith(WEB_ROOT) || !existsSync(filePath) || !statSync(filePath).isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
    createReadStream(filePath).pipe(res);
}

/** SSE: `Readable.fromWeb(gateway.sse.toReadableStream(sessionId))` piped to the response. */
function sendSse(gateway: FakeAgentGateway, sessionId: string, res: ServerResponse): void {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
    });
    const stream = Readable.fromWeb(
        gateway.sse.toReadableStream(sessionId) as unknown as import('node:stream/web').ReadableStream<Uint8Array>
    );
    stream.pipe(res);
    res.on('close', () => stream.destroy());
}

async function handleRpc(gateway: FakeAgentGateway, body: string, res: ServerResponse): Promise<void> {
    let parsed: { jsonrpc?: string; id?: unknown; method?: string; params?: Record<string, unknown> } = {};
    try {
        parsed = JSON.parse(body || '{}');
    } catch {
        parsed = {};
    }
    const id = parsed.id ?? null;
    const method = String(parsed.method || '');
    const params = (parsed.params ?? {}) as Record<string, unknown> | undefined;
    const result = await gateway.handleRpc(method, params);
    let envelope: string;
    if (result && typeof result === 'object' && result.code === -32601) {
        envelope = JSON.stringify({
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: result.message || 'Method not found' }
        });
    } else {
        envelope = JSON.stringify({ jsonrpc: '2.0', id, result });
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(envelope);
}

function startBridge(gateway: FakeAgentGateway, defaultSessionId: string): Promise<number> {
    return new Promise(resolvePort => {
        const server = createServer((req, res) => {
            const url = new URL(req.url || '/', 'http://127.0.0.1');
            if (req.method === 'POST' && url.pathname === '/rpc') {
                const chunks: Buffer[] = [];
                req.on('data', chunk => chunks.push(chunk as Buffer));
                req.on('end', () => void handleRpc(gateway, Buffer.concat(chunks).toString('utf8'), res));
                return;
            }
            if (req.method === 'GET' && url.pathname === '/api/events') {
                sendSse(gateway, String(url.searchParams.get('sessionId') || defaultSessionId), res);
                return;
            }
            sendStatic(req, res);
        });
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            resolvePort(typeof address === 'object' && address ? address.port : 0);
        });
    });
}

// ---------------------------------------------------------------------------
// 2. Playwright driver
// ---------------------------------------------------------------------------

interface Asserts {
    name: string;
    pass: boolean;
    detail: string;
}

const results: Asserts[] = [];

function record(name: string, pass: boolean, detail: string): boolean {
    results.push({ name, pass, detail });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}${pass ? '' : `\n      ${detail}`}`);
    return pass;
}

/** Issue a slash command through the real composer, then wait for `expectText` to appear. */
async function runCommand(
    page: Page,
    command: string,
    expectText: string,
    timeoutMs = 20000
): Promise<boolean> {
    const textarea = page.locator('textarea.agent-input');
    await textarea.fill(command);
    await page.keyboard.press('Enter');
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        const body = await page.locator('body').innerText();
        if (body.includes(expectText)) {
            return true;
        }
        if (Date.now() > deadline) {
            return false;
        }
        await page.waitForTimeout(200);
    }
}

async function textareaValue(page: Page): Promise<string> {
    return page.locator('textarea.agent-input').inputValue();
}

async function main(): Promise<number> {
    // Desktop-basic scenario seeds session-A with messages; P282 commands are local state.
    const scenario = scenarioById('desktop-basic');
    const gatewayOptions = scenario.buildGatewayOptions();
    const gateway = new FakeAgentGateway(gatewayOptions);
    const defaultSessionId = String(gatewayOptions.sessionId || 'console');
    const port = await startBridge(gateway, defaultSessionId);
    const baseUrl = `http://127.0.0.1:${port}`;

    let browser: Browser | undefined;
    let page: Page | undefined;
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    try {
        console.log(`[gate] bridge on ${baseUrl} (scenario ${scenario.id})`);
        browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
        page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
        page.on('pageerror', err => pageErrors.push(String(err?.stack || err)));
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        await page.goto(`${baseUrl}/?session=session-A`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForFunction(() => Boolean((window as unknown as { TsdiAgentWeb?: unknown }).TsdiAgentWeb), { timeout: 30000 });
        // index.html does NOT auto-mount: the host page must call runAgentWebConsole.
        await page.evaluate(() => {
            const host = window as unknown as {
                TsdiAgentWeb: { runAgentWebConsole(config: unknown): unknown };
                __TSDI_AGENT_WEB__: unknown;
            };
            void host.TsdiAgentWeb.runAgentWebConsole(host.__TSDI_AGENT_WEB__);
        });
        await page.waitForSelector('textarea.agent-input', { timeout: 60000 });
        await page.waitForTimeout(1500); // let SSE subscribe + initial renders settle
        console.log('[gate] console mounted, composer ready');

        // ---- P282 scenario -------------------------------------------------
        // 1. invalid /yolo verb -> diagnostic + draft preserved
        record('P282 /yolo maybe diagnostic',
            await runCommand(page, '/yolo maybe', 'Invalid mode "maybe". Expected: on, off.'),
            'diagnostic text did not appear in body within timeout');
        record('P282 /yolo maybe draft preserved', (await textareaValue(page)) === '/yolo maybe',
            `textarea = "${await textareaValue(page)}"`);

        // 2. corrected retry -> executes, draft consumed
        record('P282 /yolo on success notice',
            await runCommand(page, '/yolo on', 'Yolo mode enabled: gated tools auto-approve.'),
            'success notice text did not appear in body within timeout');
        record('P282 /yolo on draft consumed', (await textareaValue(page)) === '',
            `textarea = "${await textareaValue(page)}"`);

        // 3. invalid /statusline verb -> diagnostic + draft preserved
        record('P282 /statusline bork diagnostic',
            await runCommand(page, '/statusline bork', 'Invalid verb "bork". Expected: list, set, unset.'),
            'diagnostic text did not appear in body within timeout');
        record('P282 /statusline bork draft preserved', (await textareaValue(page)) === '/statusline bork',
            `textarea = "${await textareaValue(page)}"`);

        // 4. valid variadic /statusline -> success notice, draft consumed
        record('P282 /statusline set success',
            await runCommand(page, '/statusline set model,context', 'Statusline set to model, context.'),
            'success notice text did not appear in body within timeout');
        record('P282 /statusline set draft consumed', (await textareaValue(page)) === '',
            `textarea = "${await textareaValue(page)}"`);

        // ---- wire + render evidence ----------------------------------------
        const rpcMethods = gateway.metadata.rpcCalls.map(call => call.method);
        record('wire: console called timeline.query over bridge', rpcMethods.includes('timeline.query'),
            `rpc calls: ${rpcMethods.join(', ')}`);
        const knownMethods = new Set([
            'app.state', 'app.inputHistory.get', 'app.inputHistory.put',
            'timeline.query', 'timeline.replay',
            'command_exchange.query', 'command_exchange.replay', 'nav.query',
            'question.list', 'tools.list', 'tools.invoke', 'command_output.list',
            'command_output.get', 'command_output.append', 'command_output.clear',
            'session.create', 'session.list', 'session.list_projects', 'session.messages',
            'session.plan_mode.get', 'approval.list', 'coding_task.list',
            'usage.stats', 'summary_quality.stats', 'compaction_history.stats',
            'turn_diagnostics.stats'
        ]);
        const unserved = gateway.metadata.rpcCalls.filter(call => !knownMethods.has(call.method));
        record('wire: every rpc method is served by the fake gateway', unserved.length === 0,
            `unserved methods: ${unserved.map(call => call.method).join(', ') || 'none'}`);

        // Rendered messages panel (P285 collector shipped into the browser).
        const metrics = await page.evaluate(
            `(${collectorSource})(document, document)` as never
        ) as {
            panelFound: boolean;
            rowCount: number;
            lineCount: number;
            cjkLineCount: number;
            duplicateLabels: string[];
            layout: { measured: boolean; rowHeight: number; firstScreenVisibleRate: number | null };
        };
        record('render: messages panel found with rows', metrics.panelFound && metrics.rowCount > 0,
            `panelFound=${metrics.panelFound} rows=${metrics.rowCount} lines=${metrics.lineCount} cjk=${metrics.cjkLineCount} dup=${metrics.duplicateLabels.length} measured=${metrics.layout.measured} firstScreen=${metrics.layout.firstScreenVisibleRate}`);
    } catch (err) {
        record('driver ran without exception', false, String(err));
    } finally {
        // dump artifacts on failure
        if (results.some(r => !r.pass) && page) {
            try {
                const dir = join(__dirname, '.gate-artifacts');
                mkdirSync(dir, { recursive: true });
                await page.screenshot({ path: join(dir, 'failure.png'), fullPage: true });
                const body = await page.locator('body').innerText();
                const fs = await import('node:fs');
                fs.writeFileSync(join(dir, 'body.txt'), body.slice(0, 20000));
                fs.writeFileSync(join(dir, 'page-errors.txt'), pageErrors.join('\n'));
                fs.writeFileSync(join(dir, 'console-errors.txt'), consoleErrors.join('\n'));
                fs.writeFileSync(join(dir, 'rpc-calls.json'), JSON.stringify(gateway.metadata.rpcCalls, null, 2));
                console.log(`[gate] artifacts written to ${dir}`);
            } catch {
                // best-effort
            }
        }
        if (browser) {
            await browser.close();
        }
    }

    const allOk = results.length > 0 && results.every(r => r.pass);
    console.log(`\n=== browser gate summary: ${allOk ? 'PASS' : 'FAIL'} ===`);
    for (const r of results) {
        console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}`);
    }
    if (pageErrors.length) {
        console.log('[gate] page errors observed (non-fatal):');
        for (const err of pageErrors.slice(0, 5)) {
            console.log(`  - ${err}`);
        }
    }
    return allOk ? 0 : 1;
}

main()
    .then(code => process.exit(code))
    .catch(err => {
        console.error('[gate] unexpected failure:', err);
        process.exit(1);
    });