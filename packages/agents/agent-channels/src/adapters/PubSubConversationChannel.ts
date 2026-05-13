import { Injectable } from '@tsdi/ioc';
import { AgentConversationChannel } from '../contracts/AgentConversationChannel';
import { BaseAgentChannel } from '../contracts/BaseAgentChannel';
import { ChannelCapability } from '../contracts/ChannelCapability';
import { ChannelMessage } from '../contracts/ChannelMessage';
import { SendMessage } from '../contracts/SendMessage';

@Injectable()
export class PubSubConversationChannel extends BaseAgentChannel implements AgentConversationChannel {
    private inbound = new Set<(message: ChannelMessage) => Promise<void> | void>();
    private outbound = new Map<string, Set<(message: SendMessage) => void>>();
    private messageCounter = 0;

    name(): string {
        return 'pubsub';
    }

    capabilities(): ChannelCapability[] {
        return ['threading', 'streaming', 'freeform'];
    }

    supportsFreeFormAsk(): boolean {
        return true;
    }

    supportsMultiMessageStreaming(): boolean {
        return true;
    }

    multiMessageDelayMs(): number {
        return 50;
    }

    subscribe(recipient: string, listener: (message: SendMessage) => void): () => void {
        const listeners = this.outbound.get(recipient) ?? new Set();
        listeners.add(listener);
        this.outbound.set(recipient, listeners);
        return () => {
            listeners.delete(listener);
            if (!listeners.size) {
                this.outbound.delete(recipient);
            }
        };
    }

    onMessage(listener: (message: ChannelMessage) => Promise<void> | void): () => void {
        this.inbound.add(listener);
        return () => this.inbound.delete(listener);
    }

    async listen(handler: (message: ChannelMessage) => Promise<void> | void): Promise<void> {
        this.inbound.add(handler);
    }

    async emit(message: ChannelMessage): Promise<void> {
        const handlers = Array.from(this.inbound.values());
        for (const handler of handlers) {
            await handler(message);
        }
    }

    async send(message: SendMessage): Promise<string> {
        const id = `pubsub-${++this.messageCounter}`;
        const listeners = this.outbound.get(message.recipient);
        listeners?.forEach(listener => listener({ ...message, id }));
        return id;
    }
}
