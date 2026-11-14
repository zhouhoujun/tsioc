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
