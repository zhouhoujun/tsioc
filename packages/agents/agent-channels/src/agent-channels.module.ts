import { Module, ModuleWithProviders } from '@tsdi/ioc';
import { AgentModule } from '@tsdi/agent';
import { AGENT_CHANNEL_OPTIONS } from './tokens';
import { AgentChannelsOptions, defaultAgentChannelsOptions, mergeAgentChannelsOptions } from './options';
import { AgentChannelRegistry } from './orchestrator/AgentChannelRegistry';
import { ChannelEnvelopeMapper } from './orchestrator/ChannelEnvelopeMapper';
import { AgentChannelOrchestrator } from './orchestrator/AgentChannelOrchestrator';
import { LocalLoopbackAgentChannel } from './adapters/LocalLoopbackAgentChannel';
import { PubSubConversationChannel } from './adapters/PubSubConversationChannel';
import { ConsoleAgentChannel } from './adapters/ConsoleAgentChannel';
import { WebhookAgentChannel } from './adapters/WebhookAgentChannel';
import { SSEAgentChannel } from './adapters/SSEAgentChannel';
import { provideResolvedAgentChannels } from './provider';

@Module({
    imports: [AgentModule],
    providers: [
        {
            provider(injector) {
                if (injector.has(AGENT_CHANNEL_OPTIONS)) {
                    return;
                }
                return [{ provide: AGENT_CHANNEL_OPTIONS, useValue: defaultAgentChannelsOptions }];
            }
        },
        LocalLoopbackAgentChannel,
        PubSubConversationChannel,
        ConsoleAgentChannel,
        WebhookAgentChannel,
        SSEAgentChannel,
        provideResolvedAgentChannels(),
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
                { provide: AGENT_CHANNEL_OPTIONS, useValue: mergeAgentChannelsOptions(options) }
            ]
        };
    }
}
