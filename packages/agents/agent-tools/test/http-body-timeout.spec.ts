import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import * as http from 'http';
import { HttpFetchTool } from '../http/http-fetch.tool';
import { HttpRequestTool } from '../http/http-request.tool';

interface StallingServer {
    server: http.Server;
    port: number;
}

/** Sends response headers plus a partial body, then never finishes it. */
function startStallingServer(): Promise<StallingServer> {
    return new Promise(resolve => {
        const server = http.createServer((_req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/plain', 'Content-Length': '100' });
            res.write('partial');
            // never call res.end() -> the response body stalls
        });
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            resolve({ server, port: typeof address === 'object' && address ? address.port : 0 });
        });
    });
}

function closeServer(harness: StallingServer): void {
    const server = harness.server as http.Server & { closeAllConnections?: () => void };
    server.closeAllConnections?.();
    server.close();
}

async function settlesWithin(promise: Promise<unknown>, ms: number): Promise<boolean> {
    let guard: NodeJS.Timeout | undefined;
    try {
        const outcome = await Promise.race([
            promise.then(() => 'settled').catch(() => 'settled'),
            new Promise<string>(resolve => {
                guard = setTimeout(() => resolve('HUNG'), ms);
            })
        ]);
        return outcome === 'settled';
    } finally {
        if (guard) {
            clearTimeout(guard);
        }
    }
}

@Suite('HTTP tools body timeout')
export class HttpBodyTimeoutTest {

    @Test('http_fetch timeout covers a stalled response body (not just the headers)')
    async httpFetchTimesOutOnStalledBody() {
        const harness = await startStallingServer();
        try {
            const tool = new HttpFetchTool({ http: { timeoutMs: 400 } } as any);
            const settled = await settlesWithin(
                tool.invoke({ url: `http://127.0.0.1:${harness.port}/` }, {} as any),
                6000
            );
            expect(settled).toEqual(true);
        } finally {
            closeServer(harness);
        }
    }

    @Test('http_request timeout covers a stalled response body (not just the headers)')
    async httpRequestTimesOutOnStalledBody() {
        const harness = await startStallingServer();
        try {
            const tool = new HttpRequestTool({ http: { timeoutMs: 400 } } as any);
            const settled = await settlesWithin(
                tool.invoke({ url: `http://127.0.0.1:${harness.port}/` }, {} as any),
                6000
            );
            expect(settled).toEqual(true);
        } finally {
            closeServer(harness);
        }
    }

    @Test('http_fetch stops on the turn signal instead of waiting for its timeout')
    async httpFetchHonoursTurnSignal() {
        const harness = await startStallingServer();
        try {
            // A long timeout: only Esc can end the request early.
            const tool = new HttpFetchTool({ http: { timeoutMs: 3000 } } as any);
            const controller = new AbortController();
            const startedAt = Date.now();
            const pending = tool.invoke(
                { url: `http://127.0.0.1:${harness.port}/` },
                { signal: controller.signal } as any
            );
            await new Promise(resolve => setTimeout(resolve, 150));
            controller.abort();

            let error: any;
            try {
                await pending;
            } catch (err) {
                error = err;
            }
            expect(error?.message).toEqual('Command cancelled by the user.');
            expect(Date.now() - startedAt).toBeLessThan(2000);
        } finally {
            closeServer(harness);
        }
    }

    @Test('http_request stops on the turn signal instead of waiting for its timeout')
    async httpRequestHonoursTurnSignal() {
        const harness = await startStallingServer();
        try {
            const tool = new HttpRequestTool({ http: { timeoutMs: 3000 } } as any);
            const controller = new AbortController();
            const startedAt = Date.now();
            const pending = tool.invoke(
                { url: `http://127.0.0.1:${harness.port}/` },
                { signal: controller.signal } as any
            );
            await new Promise(resolve => setTimeout(resolve, 150));
            controller.abort();

            let error: any;
            try {
                await pending;
            } catch (err) {
                error = err;
            }
            expect(error?.message).toEqual('Command cancelled by the user.');
            expect(Date.now() - startedAt).toBeLessThan(2000);
        } finally {
            closeServer(harness);
        }
    }
}
