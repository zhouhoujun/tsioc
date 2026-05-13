import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentChannelRegistry } from '../src/orchestrator/AgentChannelRegistry';
import { ChannelEnvelopeMapper } from '../src/orchestrator/ChannelEnvelopeMapper';
import { AgentChannelOrchestrator } from '../src/orchestrator/AgentChannelOrchestrator';
import { AgentConversationChannel } from '../src/contracts/AgentConversationChannel';
import { ChannelMessage } from '../src/contracts/ChannelMessage';
import { SendMessage } from '../src/contracts/SendMessage';

class ServerStub {
    async execute(request: any): Promise<any> {
        return {
            sessionId: request.sessionId,
            output: `Echo: ${request.input}`
        };
    }
}

class CaptureChannel implements AgentConversationChannel {
    sent: SendMessage[] = [];

    constructor(private readonly channelName: string) {
    }

    name(): string {
        return this.channelName;
    }

    async send(message: SendMessage): Promise<void> {
        this.sent.push(message);
    }
}

@Suite('Agent channel orchestrator')
export class AgentChannelOrchestratorTest {
    @Test('dispatches inbound message through agent server and channel')
    async dispatchMessage() {
        const channel = new CaptureChannel('loopback');
        const registry = new AgentChannelRegistry([channel]);
        const orchestrator = new AgentChannelOrchestrator(new ServerStub() as any, new ChannelEnvelopeMapper(), registry);
        const inbound: ChannelMessage = {
            id: 'm1',
            channel: 'loopback',
            sender: 'u1',
            content: 'hello',
            timestamp: Date.now()
        };

        await orchestrator.dispatch(inbound);
        expect(channel.sent.length).toBe(1);
        expect(channel.sent[0].content).toBe('Echo: hello');
        expect(channel.sent[0].recipient).toBe('u1');
    }

    @Test('fails for unknown channel')
    async failUnknownChannel() {
        const orchestrator = new AgentChannelOrchestrator(new ServerStub() as any, new ChannelEnvelopeMapper(), new AgentChannelRegistry());
        let error: any;
        try {
            await orchestrator.dispatch({
                id: 'm1',
                channel: 'missing',
                sender: 'u1',
                content: 'hello',
                timestamp: Date.now()
            });
        } catch (err) {
            error = err;
        }
        expect(String(error?.message ?? error)).toContain('unknown channel');
    }
}
