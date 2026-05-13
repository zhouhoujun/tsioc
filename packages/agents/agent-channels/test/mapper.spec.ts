import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ChannelEnvelopeMapper } from '../src/orchestrator/ChannelEnvelopeMapper';
import { ChannelMessage } from '../src/contracts/ChannelMessage';

@Suite('Channel envelope mapper')
export class ChannelEnvelopeMapperTest {
    @Test('maps channel message to agent request and response back to send message')
    mapRequestAndResponse() {
        const mapper = new ChannelEnvelopeMapper();
        const inbound: ChannelMessage = {
            id: 'm1',
            channel: 'pubsub',
            sender: 'u1',
            content: 'hello',
            timestamp: 1,
            threadId: 't1',
            metadata: { source: 'test' }
        };

        const request = mapper.toAgentRequest(inbound);
        expect(request.input).toBe('hello');
        expect(request.sessionId).toBe('pubsub|u1|t1');

        const outbound = mapper.toSendMessage(inbound, {
            sessionId: request.sessionId,
            output: 'Echo: hello'
        });
        expect(outbound.channel).toBe('pubsub');
        expect(outbound.recipient).toBe('u1');
        expect(outbound.content).toBe('Echo: hello');
        expect(outbound.metadata?.replyTo).toBe('m1');
        expect(outbound.metadata?.source).toBe('test');
    }
}
