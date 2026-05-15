import { Injector, ModuleWithProviders, Provider, ProvdierOf, toProviders } from '@tsdi/ioc';
import { AgentConversationChannel } from './contracts/AgentConversationChannel';
import { AgentChannelFeature } from './contracts/AgentChannelFeature';
import { AGENT_CHANNEL_OPTIONS, AGENT_CHANNELS } from './tokens';
import { AgentChannelsModule } from './agent-channels.module';
import { AgentChannelsOptions, defaultAgentChannelsOptions } from './options';

export function withAgentChannels(...channels: ProvdierOf<AgentConversationChannel>[]): Provider[] {
    return toProviders(AGENT_CHANNELS, channels, true);
}

export function withAgentChannelFeatures(...features: AgentChannelFeature[]): Provider[] {
    return features.flatMap(feature => feature.providers);
}

export function provideAgentChannels(options?: AgentChannelsOptions, ...channels: ProvdierOf<AgentConversationChannel>[]): ModuleWithProviders<AgentChannelsModule> {
    const merged = { ...defaultAgentChannelsOptions, ...(options ?? {}) };
    return {
        module: AgentChannelsModule,
        providers: [
            {
                provider(injector: Injector) {
                    return Promise.all((merged.imports ?? []).map(imp => (injector as any).import(imp))).then(() => []);
                }
            },
            { provide: AGENT_CHANNEL_OPTIONS, useValue: merged },
            ...withAgentChannels(...channels)
        ]
    } as any;
}
