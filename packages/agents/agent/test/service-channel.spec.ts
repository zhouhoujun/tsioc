import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentServer } from '../src/channels/AgentServer';
import { AgentRequestHandler } from '../src/channels/AgentRequestHandler';

class RuntimeStub {
    calls: Array<{ sessionId: string; input: string; principalId?: string }> = [];

    async runTurn(sessionId: string, input: string, principalId?: string): Promise<any> {
        this.calls.push({ sessionId, input, principalId });
        return {
            sessionId,
            message: { id: '1', role: 'assistant', content: `Echo: ${input}`, createdAt: Date.now() }
        };
    }
}

@Suite('Agent service channel')
export class ServiceChannelTest {
    @Test('handles request and response')
    async requestResponse() {
        const runtime = new RuntimeStub();
        const server = new AgentServer(new AgentRequestHandler(runtime as any));
        const response = await server.execute({ sessionId: 's1', input: 'hello', principalId: 'user-1' });
        expect(response.output).toEqual('Echo: hello');
        expect(runtime.calls).toEqual([{ sessionId: 's1', input: 'hello', principalId: 'user-1' }]);
    }
}
