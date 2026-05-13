import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentServer } from '../src/channels/AgentServer';
import { AgentRequestHandler } from '../src/channels/AgentRequestHandler';

class RuntimeStub {
    async runTurn(sessionId: string, input: string): Promise<any> {
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
        const server = new AgentServer(new AgentRequestHandler(new RuntimeStub() as any));
        const response = await server.execute({ sessionId: 's1', input: 'hello' });
        expect(response.output).toEqual('Echo: hello');
    }
}
