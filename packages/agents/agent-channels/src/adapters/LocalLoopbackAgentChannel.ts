import { Injectable } from '@tsdi/ioc';
import { AgentConversationChannel } from '../contracts/AgentConversationChannel';
import { ChannelCapability } from '../contracts/ChannelCapability';
import { ChannelMessage } from '../contracts/ChannelMessage';
import { SendMessage } from '../contracts/SendMessage';

@Injectable()
export class LocalLoopbackAgentChannel implements AgentConversationChannel {
    readonly inbox: ChannelMessage[] = [];
    readonly outbox: SendMessage[] = [];

    name(): string {
        return 'loopback';
    }

    capabilities(): ChannelCapability[] {
        return ['threading'];
    }

    async send(message: SendMessage): Promise<void> {
        this.outbox.push(message);
    }

    async receive(message: ChannelMessage, handler: (message: ChannelMessage) => Promise<void>): Promise<void> {
        this.inbox.push(message);
        await handler(message);
    }
}
