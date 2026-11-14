import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AcpServer } from '../src/acp/AcpServer';

@Suite('ACP server')
export class AcpServerTest {
    @Test('handshakes, creates a session, prompts and streams an update')
    async sessionFlow() {
        const writes: any[] = [];
        let listener: ((chunk: string) => void) | undefined;
        const server = new AcpServer({
            read: (cb: (chunk: string) => void) => { listener = cb; },
            write: (payload: string) => { writes.push(JSON.parse(payload)); }
        }, {
            runtime: {
                runTurn: async (_sessionId: string, prompt: string) => ({ message: { content: `echo:${prompt}` } }),
                cancelTurn: async () => ({})
            } as any
        });
        const call = async (id: number, method: string, params: any) => {
            listener!(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
            for (let index = 0; index < 8; index++) await Promise.resolve();
            return writes.find(item => item.id === id);
        };
        const init = await call(1, 'initialize', {});
        expect(init.result.protocolVersion).toEqual(1);
        const session = await call(2, 'session/new', {});
        expect(session.result.sessionId).toContain('acp-');
        const prompt = await call(3, 'session/prompt', {
            sessionId: session.result.sessionId,
            prompt: [{ type: 'text', text: 'hello' }]
        });
        expect(prompt.result.stopReason).toEqual('end_turn');
        const update = writes.find(item => item.method === 'session/update');
        expect(update.params.update.content.text).toEqual('echo:hello');
    }

    @Test('maps terminal requests to the ACP client')
    async terminalRequests() {
        const writes: any[] = [];
        let listener: ((chunk: string) => void) | undefined;
        const server = new AcpServer({
            read: (cb: (chunk: string) => void) => { listener = cb; },
            write: (payload: string) => { writes.push(JSON.parse(payload)); }
        }, { runtime: {} as any });
        const respond = async (promise: Promise<any>, result: any) => {
            for (let index = 0; index < 8; index++) await Promise.resolve();
            const request = writes[writes.length - 1];
            listener!(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }) + '\n');
            return promise;
        };
        expect(await respond(server.createTerminal({ sessionId: 's1', command: 'ls' }), { terminalId: 't1' })).toEqual({ terminalId: 't1' });
        expect(await respond(server.terminalOutput({ sessionId: 's1', terminalId: 't1' }), { output: 'a' })).toEqual({ output: 'a' });
        expect(await respond(server.killTerminal({ sessionId: 's1', terminalId: 't1' }), {})).toEqual({});
        expect(writes.map(item => item.method)).toEqual(['terminal/create', 'terminal/output', 'terminal/kill']);
    }

    @Test('issues client requests for fs access and permissions')
    async clientRequests() {
        const writes: any[] = [];
        let listener: ((chunk: string) => void) | undefined;
        const server = new AcpServer({
            read: (cb: (chunk: string) => void) => { listener = cb; },
            write: (payload: string) => { writes.push(JSON.parse(payload)); }
        }, { runtime: {} as any });
        const respond = async (promise: Promise<any>, result: any) => {
            for (let index = 0; index < 8; index++) await Promise.resolve();
            const request = writes[writes.length - 1];
            listener!(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }) + '\n');
            return promise;
        };
        expect(await respond(server.readTextFile({ sessionId: 's1', path: 'a.ts' }), { content: 'file' })).toEqual({ content: 'file' });
        expect(await respond(server.requestPermission({ sessionId: 's1' }), { outcome: 'allow' })).toEqual({ outcome: 'allow' });
        expect(writes.map(item => item.method)).toEqual(['fs/read_text_file', 'session/request_permission']);
    }

    @Test('completes a Zed-style initialize/new/prompt/update handshake')
    async zedHandshake() {
        const writes: any[] = [];
        let listener: ((chunk: string) => void) | undefined;
        const server = new AcpServer({
            read: (cb: (chunk: string) => void) => { listener = cb; },
            write: (payload: string) => { writes.push(JSON.parse(payload)); }
        }, {
            runtime: {
                runTurn: async (_id: string, prompt: string) => ({ message: { content: `answer:${prompt}` } }),
                cancelTurn: async () => ({}),
                setSessionArchetype: () => undefined,
                setSessionModelProfile: () => undefined,
                getMessages: async () => []
            } as any
        });
        const request = async (id: number, method: string, params: any) => {
            listener!(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
            for (let index = 0; index < 10; index++) await Promise.resolve();
            return writes.find(item => item.id === id);
        };
        const init = await request(1, 'initialize', { protocolVersion: 1, clientCapabilities: { fs: { readTextFile: true } } });
        expect(init.result.agentInfo.name).toEqual('tsdi-agent');
        expect(init.result.agentCapabilities.promptCapabilities.image).toEqual(false);
        const session = await request(2, 'session/new', { cwd: '/ws', mcpServers: [] });
        expect(session.result.sessionId).toContain('acp-');
        await request(3, 'session/set_mode', { sessionId: session.result.sessionId, modeId: 'plan' });
        const prompt = await request(4, 'session/prompt', {
            sessionId: session.result.sessionId,
            prompt: [{ type: 'text', text: 'hello' }]
        });
        expect(prompt.result.stopReason).toEqual('end_turn');
        expect(writes.some(item => item.method === 'session/update'
            && item.params.update.content.text === 'answer:hello')).toEqual(true);
        const cancelled = await request(5, 'session/cancel', { sessionId: session.result.sessionId });
        expect(cancelled.result).toEqual({});
    }

    @Test('applies ACP mode and model changes to the runtime')
    async setModeAndModel() {
        const calls: string[] = [];
        let listener: ((chunk: string) => void) | undefined;
        new AcpServer({
            read: (cb: (chunk: string) => void) => { listener = cb; },
            write: () => undefined
        }, {
            runtime: {
                runTurn: async () => ({}),
                cancelTurn: async () => ({}),
                setSessionArchetype: (id: string, mode: string) => calls.push(`mode:${id}:${mode}`),
                setSessionModelProfile: (id: string, model: string) => calls.push(`model:${id}:${model}`)
            } as any
        });
        listener!(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'session/set_mode', params: { sessionId: 's1', modeId: 'plan' } }) + '\n');
        listener!(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'session/set_model', params: { sessionId: 's1', modelId: 'strong' } }) + '\n');
        for (let index = 0; index < 12; index++) await Promise.resolve();
        expect(calls).toEqual(['mode:s1:plan', 'model:s1:strong']);
    }

    @Test('loads an existing session transcript')
    async loadSession() {
        const writes: any[] = [];
        let listener: ((chunk: string) => void) | undefined;
        new AcpServer({
            read: (cb: (chunk: string) => void) => { listener = cb; },
            write: (payload: string) => { writes.push(JSON.parse(payload)); }
        }, {
            runtime: {
                runTurn: async () => ({}),
                cancelTurn: async () => ({}),
                getMessages: async () => [{ role: 'user', content: 'hi' }]
            } as any
        });
        listener!(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }) + '\n');
        for (let index = 0; index < 8; index++) await Promise.resolve();
        listener!(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'session/load', params: { sessionId: 's1' } }) + '\n');
        for (let index = 0; index < 8; index++) await Promise.resolve();
        const loaded = writes.find(item => item.id === 2);
        expect(loaded.result.messages[0].content).toEqual('hi');
    }

    @Test('unknown methods return a JSON-RPC error instead of crashing')
    async unknownMethod() {
        const writes: any[] = [];
        let listener: ((chunk: string) => void) | undefined;
        new AcpServer({
            read: (cb: (chunk: string) => void) => { listener = cb; },
            write: (payload: string) => { writes.push(JSON.parse(payload)); }
        }, { runtime: {} as any });
        listener!(JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'nope' }) + '\n');
        for (let index = 0; index < 8; index++) await Promise.resolve();
        expect(writes[0].error.code).toEqual(-32000);
    }
}
