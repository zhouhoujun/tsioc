import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentChannelRegistry } from '../src/orchestrator/AgentChannelRegistry';
import { ChannelEnvelopeMapper } from '../src/orchestrator/ChannelEnvelopeMapper';
import { AgentChannelOrchestrator } from '../src/orchestrator/AgentChannelOrchestrator';
import { LocalLoopbackAgentChannel } from '../src/adapters/LocalLoopbackAgentChannel';

class ServerStub {
    async execute(request: any): Promise<any> {
        return {
            sessionId: request.sessionId,
            output: `Echo: ${request.input}`
        };
    }
}

@Suite('Local loopback agent channel')
export class LocalLoopbackAgentChannelTest {
    @Test('creates a full local conversation loop')
    async fullLoop() {
        const channel = new LocalLoopbackAgentChannel();
        const orchestrator = new AgentChannelOrchestrator(new ServerStub() as any, new ChannelEnvelopeMapper(), new AgentChannelRegistry([channel]));

        await channel.listen((message) => orchestrator.dispatch(message));
        await channel.receive({
            id: 'm1',
            channel: 'loopback',
            sender: 'user-1',
            content: 'hello',
            timestamp: Date.now()
        });

        expect(channel.inbox.length).toBe(1);
        expect(channel.outbox.length).toBe(1);
        expect(channel.outbox[0].content).toBe('Echo: hello');
    }
}
