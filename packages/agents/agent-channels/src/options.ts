import type { SSEChannelOptions } from './adapters/SSEAgentChannel';
import type { WebhookChannelOptions } from './adapters/WebhookAgentChannel';

export interface AgentChannelsOptions {
    defaultChannel?: string;
    imports?: any[];
    sse?: SSEChannelOptions;
    webhook?: WebhookChannelOptions;
}

export const defaultAgentChannelsOptions: AgentChannelsOptions = {};
