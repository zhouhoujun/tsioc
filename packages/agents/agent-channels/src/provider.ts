import { ModuleWithProviders, Provider, ProvdierOf, toProviders } from '@tsdi/ioc';
import { AgentModule } from '@tsdi/agent';
import { AgentConversationChannel } from './contracts/AgentConversationChannel';
import { AGENT_CHANNEL_OPTIONS, AGENT_CHANNELS } from './tokens';
import { AgentChannelsModule } from './agent-channels.module';
import { AgentChannelsOptions, defaultAgentChannelsOptions } from './options';

export function withAgentChannels(...channels: ProvdierOf<AgentConversationChannel>[]): Provider[] {
    return toProviders(AGENT_CHANNELS, channels, true);
}

export function provideAgentChannels(options?: AgentChannelsOptions, ...channels: ProvdierOf<AgentConversationChannel>[]): ModuleWithProviders<AgentChannelsModule> {
    return {
        module: AgentChannelsModule,
        imports: [AgentModule],
        providers: [
            { provide: AGENT_CHANNEL_OPTIONS, useValue: { ...defaultAgentChannelsOptions, ...(options ?? {}) } },
            ...withAgentChannels(...channels)
        ]
    } as any;
}
