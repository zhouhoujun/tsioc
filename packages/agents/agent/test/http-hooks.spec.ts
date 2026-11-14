import expect = require('expect');
import * as http from 'http';
import { Suite, Test } from '@tsdi/unit';
import { AgentHookManager } from '../src/hooks/AgentHooks';

// Capture the host fetch before other suites replace the global with stubs.
const nativeFetch = globalThis.fetch;

async function startServer(handler: (body: string, req: http.IncomingMessage) => string): Promise<{ url: string; close: () => Promise<void> }> {
    const server = http.createServer((req, res) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            const reply = handler(body, req);
            res.writeHead(200, { 'content-type': 'text/plain' });
            res.end(reply);
        });
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    return {
        url: `http://127.0.0.1:${port}/hook`,
        close: () => new Promise<void>(resolve => server.close(() => resolve()))
    };
}

const CONTEXT = {
    sessionId: 's1',
    stage: 'beforeTool' as const,
    workspace: '/ws'
};

@Suite('http hooks')
export class HttpHooksTest {
    @Test('an http beforeTool hook posts the context and surfaces its output')
    async httpHookPostsContext() {
        let received = '';
        const server = await startServer((body, req) => {
            received = `${req.method} ${body}`;
            return 'hook-ok';
        });
        try {
            const manager = new AgentHookManager({
                fetch: nativeFetch,
                beforeTool: { type: 'http', url: server.url, method: 'POST', trusted: true }
            });
            const output = await manager.run('beforeTool', CONTEXT);
            expect(output.entries.length).toEqual(1);
            expect(output.entries[0].name).toEqual(server.url);
            expect(output.entries[0].content).toContain('hook-ok');
            expect(output.entries[0].exitCode).toEqual(0);
            expect(received).toContain('POST');
            expect(received).toContain('beforeTool');
            expect(received).toContain('s1');
        } finally {
            await server.close();
        }
    }

    @Test('an http failure is reported without throwing')
    async httpFailureIsRecorded() {
        const manager = new AgentHookManager({
            fetch: nativeFetch,
            afterTool: { type: 'http', url: 'http://127.0.0.1:1/hook', method: 'POST', trusted: true, timeoutMs: 1000 }
        });
        const output = await manager.run('afterTool', { ...CONTEXT, stage: 'afterTool' });
        expect(output.entries.length).toEqual(1);
        expect(output.entries[0].exitCode).toEqual(1);
    }

    @Test('requireTrust filters untrusted http and command hooks')
    async requireTrustFiltersHooks() {
        const manager = new AgentHookManager({
            requireTrust: true,
            beforeTool: [
                { type: 'http', url: 'http://127.0.0.1:9/hook' },
                { command: 'echo', trusted: true },
                { command: 'echo', trusted: false }
            ]
        });
        const described = manager.describe().find(entry => entry.stage === 'beforeTool');
        // Untrusted http and explicit untrusted command are dropped; the
        // trusted command remains visible to the operator.
        expect(described?.commands).toEqual(['echo']);
    }
}
