import { Module, ModuleWithProviders } from '@tsdi/ioc';
import { AgentModule } from '@tsdi/agent';
import { AGENT_CHANNEL_OPTIONS, AGENT_CHANNELS } from './tokens';
import { AgentChannelsOptions, defaultAgentChannelsOptions } from './options';
import { AgentChannelRegistry } from './orchestrator/AgentChannelRegistry';
import { ChannelEnvelopeMapper } from './orchestrator/ChannelEnvelopeMapper';
import { AgentChannelOrchestrator } from './orchestrator/AgentChannelOrchestrator';
import { LocalLoopbackAgentChannel } from './adapters/LocalLoopbackAgentChannel';
import { PubSubConversationChannel } from './adapters/PubSubConversationChannel';
import { ConsoleAgentChannel } from './adapters/ConsoleAgentChannel';
import { WebhookAgentChannel } from './adapters/WebhookAgentChannel';
import { SSEAgentChannel } from './adapters/SSEAgentChannel';

@Module({
    imports: [AgentModule],
    providers: [
        { provide: AGENT_CHANNEL_OPTIONS, useValue: defaultAgentChannelsOptions },
        LocalLoopbackAgentChannel,
        PubSubConversationChannel,
        ConsoleAgentChannel,
        WebhookAgentChannel,
        SSEAgentChannel,
        { provide: AGENT_CHANNELS, useExisting: LocalLoopbackAgentChannel, multi: true },
        { provide: AGENT_CHANNELS, useExisting: PubSubConversationChannel, multi: true },
        { provide: AGENT_CHANNELS, useExisting: ConsoleAgentChannel, multi: true },
        { provide: AGENT_CHANNELS, useExisting: WebhookAgentChannel, multi: true },
        { provide: AGENT_CHANNELS, useExisting: SSEAgentChannel, multi: true },
        AgentChannelRegistry,
        ChannelEnvelopeMapper,
        AgentChannelOrchestrator
    ],
    exports: [
        LocalLoopbackAgentChannel,
        PubSubConversationChannel,
        ConsoleAgentChannel,
        WebhookAgentChannel,
        SSEAgentChannel,
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
