import { Inject, Injectable } from '@tsdi/ioc';
import { AgentServer } from '@tsdi/agent';
import { ChannelMessage } from '../contracts/ChannelMessage';
import { AgentConversationChannel } from '../contracts/AgentConversationChannel';
import { AGENT_CHANNEL_OPTIONS } from '../tokens';
import { AgentChannelsOptions, defaultAgentChannelsOptions } from '../options';
import { ChannelEnvelopeMapper } from './ChannelEnvelopeMapper';
import { AgentChannelRegistry } from './AgentChannelRegistry';

@Injectable()
export class AgentChannelOrchestrator {
    constructor(
        private server: AgentServer,
        private mapper: ChannelEnvelopeMapper,
        private registry: AgentChannelRegistry,
        @Inject(AGENT_CHANNEL_OPTIONS, { nullable: true }) private options: AgentChannelsOptions = defaultAgentChannelsOptions
    ) {
    }

    async dispatch(message: ChannelMessage): Promise<void> {
        const channelName = message.channel || this.options.defaultChannel;
        if (!channelName) {
            throw new Error('channel name is required');
        }
        const channel = this.registry.get(channelName);
        if (!channel) {
            throw new Error(`unknown channel: ${channelName}`);
        }
        await this.dispatchTo(channel, { ...message, channel: channelName });
    }

    async dispatchTo(channel: AgentConversationChannel, message: ChannelMessage): Promise<void> {
        if (message.channel && message.channel !== channel.name()) {
            throw new Error(`channel mismatch: ${message.channel}`);
        }
        const normalized = { ...message, channel: channel.name() };
        const request = this.mapper.toAgentRequest(normalized);
        const response = await this.server.execute(request);
        await channel.send(this.mapper.toSendMessage(normalized, response));
    }
}
