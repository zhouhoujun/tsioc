import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AcpClient, AcpTransport, acpInternals } from '../src';

class MemoryTransport implements AcpTransport {
    listener?: (chunk: string) => void;
    writes: any[] = [];
    read(listener: (chunk: string) => void): void { this.listener = listener; }
    write(payload: string): void {
        const request = JSON.parse(payload);
        this.writes.push(request);
        const result = request.method === 'initialize' ? { protocolVersion: 1 } : request.method === 'session/new' ? { sessionId: 's1' } : request.method === 'session/prompt' ? { stopReason: 'end_turn', content: [{ type: 'text', text: 'done' }] } : {};
        queueMicrotask(() => this.listener?.(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }) + '\n'));
    }
    respond(message: unknown): void { this.listener?.(JSON.stringify(message) + '\n'); }
}

@Suite('ACP client')
export class AcpClientTest {
    @Test('initializes, creates a session, prompts and cancels over JSONL')
    async runsLifecycle() {
        const transport = new MemoryTransport();
        const updates: any[] = [];
        const client = new AcpClient(transport, { onUpdate: update => updates.push(update) });
        const init = await client.initialize();
        const session = await client.newSession({ cwd: '/workspace' });
        const result = await client.prompt(session.sessionId, 'hello');
        await client.cancel(session.sessionId);
        expect(init.protocolVersion).toEqual(1);
        expect(session.sessionId).toEqual('s1');
        expect(result.stopReason).toEqual('end_turn');
        expect(transport.writes.map(item => item.method)).toEqual(['initialize', 'session/new', 'session/prompt', 'session/cancel']);
        expect(transport.writes[3].id).toBeUndefined();
        transport.respond({ jsonrpc: '2.0', method: 'session/update', params: { sessionId: 's1', update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'hi' } } } });
        expect(updates[0].kind).toEqual('text');
        expect(updates[0].content).toEqual('hi');
    }

    @Test('rejects protocol errors and closes pending requests')
    async rejectsErrors() {
        const transport = new MemoryTransport();
        const client = new AcpClient(transport);
        const pending = (client as any).request('broken', {});
        transport.respond({ jsonrpc: '2.0', id: 1, error: { code: -32601, message: 'missing' } });
        let error: Error | undefined;
        try { await pending; } catch (value) { error = value as Error; }
        expect(error?.message).toEqual('missing');
        await client.close();
    }

    @Test('normalizes text, tool and status updates')
    normalizesUpdates() {
        expect(acpInternals.normalizeUpdate({ sessionId: 's', update: { sessionUpdate: 'tool_call', name: 'read', status: 'completed' } }).kind).toEqual('tool');
        expect(acpInternals.normalizeUpdate({ sessionId: 's', update: { status: 'working' } }).kind).toEqual('status');
        expect(acpInternals.textFromContent({ content: [{ text: 'a' }, { text: 'b' }] })).toEqual('ab');
    }

    @Test('serves host capability requests and rejects unknown methods')
    async handlesHostRequests() {
        const transport = new MemoryTransport();
        new AcpClient(transport, { requestHandlers: { 'session/request_permission': params => ({ outcome: { outcome: 'selected', optionId: params.options[0].optionId } }) } });
        transport.respond({ jsonrpc: '2.0', id: 40, method: 'session/request_permission', params: { options: [{ optionId: 'allow' }] } });
        transport.respond({ jsonrpc: '2.0', id: 41, method: 'fs/read_text_file', params: { path: '/x' } });
        await new Promise<void>(resolve => queueMicrotask(() => resolve()));
        expect(transport.writes.find(item => item.id === 40).result.outcome.optionId).toEqual('allow');
        expect(transport.writes.find(item => item.id === 41).error.code).toEqual(-32601);
    }
}
