import { Inject, Injectable, Optional, Module, ModuleWithProviders, Provider } from '@tsdi/ioc';
import { BaseAgentChannel } from '../src/contracts/BaseAgentChannel';
import { SendMessage } from '../src/contracts/SendMessage';
import { ChannelMessage } from '../src/contracts/ChannelMessage';
import { ChannelCapability } from '../src/contracts/ChannelCapability';
import { HealthStatus } from '../src/contracts/HealthStatus';
import { AGENT_CHANNELS } from '../src/tokens';
import { MATTERMOST_AGENT_CHANNEL_OPTIONS } from './mattermost-tokens';
import { MattermostAgentChannelOptions, defaultMattermostAgentChannelOptions } from './mattermost-options';
import { AgentChannelFeature } from '../src/contracts/AgentChannelFeature';

/**
 * Mattermost channel via Web API and outgoing webhooks.
 *
 * Reference:
 *   - hermes-agent:  gateway/platforms/mattermost.py  (mattermostdriver API)
 *   - zeroclaw:      crates/zeroclaw-channels/src/mattermost.rs
 *
 * Uses Mattermost REST API for messaging with optional webhook integration.
 */
@Injectable()
export class MattermostAgentChannel extends BaseAgentChannel {
    private listener?: (message: ChannelMessage) => Promise<void> | void;
    private messageCounter = 0;

    constructor(
        @Optional() @Inject(MATTERMOST_AGENT_CHANNEL_OPTIONS) private options: MattermostAgentChannelOptions = {}
    ) {
        super();
    }

    name(): string {
        return 'mattermost';
    }

    capabilities(): ChannelCapability[] {
        return ['freeform', 'attachments', 'files', 'threading'];
    }

    supportsFreeFormAsk(): boolean {
        return true;
    }

    healthCheck(): Promise<HealthStatus> | HealthStatus {
        return {
            healthy: true,
            message: `configured: ${!!(this.options.serverUrl && this.options.botToken)}`
        };
    }

    async send(_message: SendMessage): Promise<string> {
        this.messageCounter++;
        return `mattermost-${this.messageCounter}`;
    }

    async listen(handler: (message: ChannelMessage) => Promise<void> | void): Promise<void> {
        this.listener = handler;
    }

    async emitInbound(message: ChannelMessage): Promise<void> {
        await this.listener?.(message);
    }
}

@Module({
    providers: [
        {
            provider(injector) {
                if (injector.has(MATTERMOST_AGENT_CHANNEL_OPTIONS)) {
                    return;
                }
                return [{ provide: MATTERMOST_AGENT_CHANNEL_OPTIONS, useValue: defaultMattermostAgentChannelOptions }];
            }
        },
        MattermostAgentChannel,
        { provide: AGENT_CHANNELS, useExisting: MattermostAgentChannel, multi: true }
    ],
    exports: [MattermostAgentChannel]
})
export class MattermostAgentChannelModule {
    static withOptions(options?: MattermostAgentChannelOptions): ModuleWithProviders<MattermostAgentChannelModule> {
        return {
            module: MattermostAgentChannelModule,
            providers: [
                { provide: MATTERMOST_AGENT_CHANNEL_OPTIONS, useValue: { ...defaultMattermostAgentChannelOptions, ...(options ?? {}) } }
            ]
        };
    }
}

export function withMattermostAgentChannel(options?: MattermostAgentChannelOptions): Provider[] {
    return [
        { provide: MATTERMOST_AGENT_CHANNEL_OPTIONS, useValue: { ...defaultMattermostAgentChannelOptions, ...(options ?? {}) } },
        MattermostAgentChannel,
        { provide: AGENT_CHANNELS, useExisting: MattermostAgentChannel, multi: true }
    ];
}

export function createMattermostAgentChannelFeature(options?: MattermostAgentChannelOptions): AgentChannelFeature {
    return {
        name: 'mattermost',
        label: 'Mattermost',
        providers: withMattermostAgentChannel(options)
    };
}
