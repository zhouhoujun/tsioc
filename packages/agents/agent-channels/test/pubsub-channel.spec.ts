import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { PubSubConversationChannel } from '../src/adapters/PubSubConversationChannel';
import { ChannelMessage } from '../src/contracts/ChannelMessage';
import { SendMessage } from '../src/contracts/SendMessage';

@Suite('PubSub conversation channel')
export class PubSubConversationChannelTest {
    @Test('publishes outbound messages to subscribers')
    async publishOutboundMessages() {
        const channel = new PubSubConversationChannel();
        const received: SendMessage[] = [];
        channel.subscribe('u1', (message: SendMessage) => {
            received.push(message);
        });

        await channel.send({ channel: 'pubsub', recipient: 'u1', content: 'hello' });
        expect(received.length).toBe(1);
        expect(received[0].content).toBe('hello');
    }

    @Test('emits inbound messages to listeners')
    async emitInboundMessages() {
        const channel = new PubSubConversationChannel();
        const received: ChannelMessage[] = [];
        channel.onMessage((message) => {
            received.push(message);
        });

        await channel.emit({
            id: 'm1',
            channel: 'pubsub',
            sender: 'u1',
            content: 'hello',
            timestamp: Date.now()
        });
        expect(received.length).toBe(1);
        expect(received[0].content).toBe('hello');
    }
}
