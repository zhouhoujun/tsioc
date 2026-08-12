import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { HttpAgentConsoleAppRpc, createHttpAgentConsoleAppRpc } from '../src';

function jsonResponse(status: number, body: any): Response {
    return new Response(body === undefined ? undefined : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

function ndjsonResponse(status: number, lines: string[]): Response {
    return new Response(lines.join('\n'), {
        status,
        headers: { 'Content-Type': 'application/x-ndjson' }
    });
}

@Suite('HttpAgentConsoleAppRpc')
export class HttpAgentConsoleAppRpcTest {
    @Test('request posts JSON-RPC envelope and returns result')
    async requestReturnsResult() {
        let captured: any = null;
        const fetchImpl = async (url: string, init: any) => {
            captured = { url, init };
            return jsonResponse(200, { jsonrpc: '2.0', id: 1, result: { ok: true } });
        };
        const rpc = new HttpAgentConsoleAppRpc({ baseUrl: 'http://localhost:8080', fetchImpl: fetchImpl as any });
        const result = await rpc.request('app.ping');
        expect(result.ok).toEqual(true);
        expect(captured.url).toEqual('http://localhost:8080/rpc');
        expect(captured.init.method).toEqual('POST');
        const body = JSON.parse(captured.init.body);
        expect(body.jsonrpc).toEqual('2.0');
        expect(body.method).toEqual('app.ping');
    }

    @Test('request sends bearer token header')
    async requestSendsAuthHeader() {
        let captured: any = null;
        const fetchImpl = async (_url: string, init: any) => {
            captured = init;
            return jsonResponse(200, { jsonrpc: '2.0', id: 1, result: null });
        };
        const rpc = new HttpAgentConsoleAppRpc({ baseUrl: 'http://localhost:8080', token: 'secret-token', fetchImpl: fetchImpl as any });
        await rpc.request('app.ping');
        expect(captured.headers.Authorization).toEqual('Bearer secret-token');
    }

    @Test('request throws on RPC error envelope')
    async requestThrowsOnRpcError() {
        const fetchImpl = async () => jsonResponse(200, {
            jsonrpc: '2.0',
            id: 1,
            error: { code: -32601, message: 'Method not found' }
        });
        const rpc = new HttpAgentConsoleAppRpc({ baseUrl: 'http://localhost:8080', fetchImpl: fetchImpl as any });
        let thrown: any = null;
        try {
            await rpc.request('no.such.method');
        } catch (error) {
            thrown = error;
        }
        expect(thrown).toBeTruthy();
        expect(thrown.message).toEqual('Method not found');
        expect(thrown.code).toEqual(-32601);
    }

    @Test('request throws on non-2xx HTTP status')
    async requestThrowsOnHttpError() {
        const fetchImpl = async () => jsonResponse(401, { error: 'unauthorized' });
        const rpc = new HttpAgentConsoleAppRpc({ baseUrl: 'http://localhost:8080', fetchImpl: fetchImpl as any });
        let thrown: any = null;
        try {
            await rpc.request('session.list');
        } catch (error) {
            thrown = error;
        }
        expect(thrown).toBeTruthy();
        expect(thrown.message).toEqual('unauthorized');
    }

    @Test('request aborts after timeout')
    async requestTimesOut() {
        const fetchImpl = async (_url: string, init: any) => {
            return new Promise((resolve, reject) => {
                init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
                setTimeout(() => resolve(jsonResponse(200, { jsonrpc: '2.0', id: 1, result: null })), 50);
            });
        };
        const rpc = new HttpAgentConsoleAppRpc({ baseUrl: 'http://localhost:8080', timeoutMs: 10, fetchImpl: fetchImpl as any });
        let thrown: any = null;
        try {
            await rpc.request('session.list');
        } catch (error) {
            thrown = error;
        }
        expect(thrown).toBeTruthy();
    }

    @Test('stream maps run.turn_stream.chunk notifications and done result')
    async streamMapsChunksAndDone() {
        const fetchImpl = async (url: string) => {
            expect(url).toEqual('http://localhost:8080/rpc/stream');
            return ndjsonResponse(200, [
                JSON.stringify({ jsonrpc: '2.0', method: 'run.turn_stream.chunk', params: { chunkType: 'event', eventType: 'turn_started', label: 'state', status: 'running', content: 'Analyzing request' } }),
                JSON.stringify({ jsonrpc: '2.0', method: 'run.turn_stream.chunk', params: { chunkType: 'content', content: 'hello' } }),
                JSON.stringify({ jsonrpc: '2.0', id: 1, result: { sessionId: 's1', message: { content: 'done' } } })
            ]);
        };
        const rpc = new HttpAgentConsoleAppRpc({ baseUrl: 'http://localhost:8080', fetchImpl: fetchImpl as any });
        const chunks: any[] = [];
        for await (const chunk of rpc.stream('run.turn_stream', { sessionId: 's1', input: 'x' })) {
            chunks.push(chunk);
        }
        expect(chunks.length).toEqual(3);
        expect(chunks[0].type).toEqual('event');
        expect(chunks[0].eventType).toEqual('turn_started');
        expect(chunks[1].type).toEqual('content');
        expect(chunks[1].content).toEqual('hello');
        expect(chunks[2].type).toEqual('done');
        expect(chunks[2].sessionId).toEqual('s1');
    }

    @Test('stream throws on NDJSON error line')
    async streamThrowsOnErrorLine() {
        const fetchImpl = async () => ndjsonResponse(200, [
            JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32603, message: 'boom' } })
        ]);
        const rpc = new HttpAgentConsoleAppRpc({ baseUrl: 'http://localhost:8080', fetchImpl: fetchImpl as any });
        let thrown: any = null;
        try {
            for await (const _chunk of rpc.stream('run.turn_stream', { sessionId: 's1' })) {
                // consume
            }
        } catch (error) {
            thrown = error;
        }
        expect(thrown).toBeTruthy();
        expect(thrown.message).toEqual('boom');
    }

    @Test('factory createHttpAgentConsoleAppRpc returns AgentConsoleAppRpc')
    factoryReturnsRpc() {
        const rpc = createHttpAgentConsoleAppRpc({ baseUrl: 'http://localhost:8080' });
        expect(typeof rpc.request).toEqual('function');
    }
}
