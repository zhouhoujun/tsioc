import { Injectable } from '@tsdi/ioc';
import { AgentConversationChannel } from '../contracts/AgentConversationChannel';
import { BaseAgentChannel } from '../contracts/BaseAgentChannel';
import { ChannelCapability } from '../contracts/ChannelCapability';
import { ChannelMessage } from '../contracts/ChannelMessage';
import { SendMessage } from '../contracts/SendMessage';

@Injectable()
export class LocalLoopbackAgentChannel extends BaseAgentChannel implements AgentConversationChannel {
    readonly inbox: ChannelMessage[] = [];
    readonly outbox: SendMessage[] = [];
    private messageCounter = 0;
    private handler?: (message: ChannelMessage) => Promise<void> | void;

    name(): string {
        return 'loopback';
    }

    capabilities(): ChannelCapability[] {
        return ['threading', 'freeform'];
    }

    supportsFreeFormAsk(): boolean {
        return true;
    }

    async send(message: SendMessage): Promise<string> {
        const id = `loopback-${++this.messageCounter}`;
        this.outbox.push({ ...message, id });
        return id;
    }

    async listen(handler: (message: ChannelMessage) => Promise<void> | void): Promise<void> {
        this.handler = handler;
    }

    async receive(message: ChannelMessage): Promise<void> {
        this.inbox.push(message);
        await this.handler?.(message);
    }
}
