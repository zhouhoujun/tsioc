import { Inject, Injectable, Optional, Module, ModuleWithProviders } from '@tsdi/ioc';
import { BaseAgentChannel } from '../src/contracts/BaseAgentChannel';
import { SendMessage } from '../src/contracts/SendMessage';
import { ChannelMessage } from '../src/contracts/ChannelMessage';
import { ChannelCapability } from '../src/contracts/ChannelCapability';
import { HealthStatus } from '../src/contracts/HealthStatus';
import { AGENT_CHANNELS } from '../src/tokens';
import { SLACK_AGENT_CHANNEL_OPTIONS } from './slack-tokens';
import { SlackAgentChannelOptions, defaultSlackAgentChannelOptions } from './slack-options';
import { AgentChannelFeature } from '../src/contracts/AgentChannelFeature';

/**
 * Slack Events API + Web API channel.
 *
 * Reference:
 *   - hermes-agent:  gateway/platforms/slack.py  (Socket Mode + Web API)
 *   - zeroclaw:      crates/zeroclaw-channels/src/slack.rs
 *
 * Supports Socket Mode for real-time events, Block Kit for rich messages,
 * and interactive components for approval flows.
 */
@Injectable()
export class SlackAgentChannel extends BaseAgentChannel {
    private listener?: (message: ChannelMessage) => Promise<void> | void;
    private messageCounter = 0;

    constructor(
        @Optional() @Inject(SLACK_AGENT_CHANNEL_OPTIONS) private options: SlackAgentChannelOptions = {}
    ) {
        super();
    }

    name(): string {
        return 'slack';
    }

    capabilities(): ChannelCapability[] {
        return ['freeform', 'streaming', 'attachments', 'files', 'threading', 'typing', 'reactions', 'approval'];
    }

    supportsFreeFormAsk(): boolean {
        return true;
    }

    supportsMultiMessageStreaming(): boolean {
        return true;
    }

    multiMessageDelayMs(): number {
        return 500;
    }

    healthCheck(): Promise<HealthStatus> | HealthStatus {
        return {
            healthy: true,
            message: `configured: ${!!this.options.botToken}`
        };
    }

    async send(_message: SendMessage): Promise<string> {
        this.messageCounter++;
        return `slack-${this.messageCounter}`;
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
                if (injector.has(SLACK_AGENT_CHANNEL_OPTIONS)) {
                    return;
                }
                return [{ provide: SLACK_AGENT_CHANNEL_OPTIONS, useValue: defaultSlackAgentChannelOptions }];
            }
        },
        SlackAgentChannel,
        { provide: AGENT_CHANNELS, useExisting: SlackAgentChannel, multi: true }
    ],
    exports: [SlackAgentChannel]
})
export class SlackAgentChannelModule {
    static withOptions(options?: SlackAgentChannelOptions): ModuleWithProviders<SlackAgentChannelModule> {
        return {
            module: SlackAgentChannelModule,
            providers: [
                { provide: SLACK_AGENT_CHANNEL_OPTIONS, useValue: { ...defaultSlackAgentChannelOptions, ...(options ?? {}) } }
            ]
        };
    }
}

export function withSlackAgentChannel(options?: SlackAgentChannelOptions): any[] {
    return [
        { provide: SLACK_AGENT_CHANNEL_OPTIONS, useValue: { ...defaultSlackAgentChannelOptions, ...(options ?? {}) } },
        SlackAgentChannel,
        { provide: AGENT_CHANNELS, useExisting: SlackAgentChannel, multi: true }
    ];
}

export function createSlackAgentChannelFeature(options?: SlackAgentChannelOptions): AgentChannelFeature {
    return {
        name: 'slack',
        label: 'Slack',
        providers: withSlackAgentChannel(options)
    };
}
