import { Module, ModuleWithProviders } from '@tsdi/ioc';
import { AgentModule } from '@tsdi/agent';
import { AGENT_CHANNEL_OPTIONS, AGENT_CHANNELS } from './tokens';
import { AgentChannelsOptions, defaultAgentChannelsOptions } from './options';
import { AgentChannelRegistry } from './orchestrator/AgentChannelRegistry';
import { ChannelEnvelopeMapper } from './orchestrator/ChannelEnvelopeMapper';
import { AgentChannelOrchestrator } from './orchestrator/AgentChannelOrchestrator';
import { LocalLoopbackAgentChannel } from './adapters/LocalLoopbackAgentChannel';
import { PubSubConversationChannel } from './adapters/PubSubConversationChannel';

@Module({
    imports: [AgentModule],
    providers: [
        { provide: AGENT_CHANNEL_OPTIONS, useValue: defaultAgentChannelsOptions },
        LocalLoopbackAgentChannel,
        PubSubConversationChannel,
        { provide: AGENT_CHANNELS, useExisting: LocalLoopbackAgentChannel, multi: true },
        { provide: AGENT_CHANNELS, useExisting: PubSubConversationChannel, multi: true },
        AgentChannelRegistry,
        ChannelEnvelopeMapper,
        AgentChannelOrchestrator
    ],
    exports: [
        LocalLoopbackAgentChannel,
        PubSubConversationChannel,
        AgentChannelRegistry,
        ChannelEnvelopeMapper,
        AgentChannelOrchestrator
    ]
})
export class AgentChannelsModule {
    static withOptions(options: AgentChannelsOptions): ModuleWithProviders<AgentChannelsModule> {
        return {
            module: AgentChannelsModule,
            providers: [
                { provide: AGENT_CHANNEL_OPTIONS, useValue: { ...defaultAgentChannelsOptions, ...options } }
            ]
        };
    }
}
