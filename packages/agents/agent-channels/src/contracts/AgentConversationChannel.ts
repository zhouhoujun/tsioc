import { ChannelCapability } from './ChannelCapability';
import { ChannelMessage } from './ChannelMessage';
import { SendMessage } from './SendMessage';

export interface AgentConversationChannel {
    name(): string;
    send(message: SendMessage): Promise<void>;
    listen?(handler: (message: ChannelMessage) => Promise<void> | void): Promise<void> | void;
    healthCheck?(): Promise<boolean> | boolean;
    capabilities?(): ChannelCapability[];
}
