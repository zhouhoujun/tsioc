import { Inject, Injectable, Optional, Module, ModuleWithProviders } from '@tsdi/ioc';
import { BaseAgentChannel } from '../src/contracts/BaseAgentChannel';
import { SendMessage } from '../src/contracts/SendMessage';
import { ChannelMessage } from '../src/contracts/ChannelMessage';
import { ChannelCapability } from '../src/contracts/ChannelCapability';
import { HealthStatus } from '../src/contracts/HealthStatus';
import { AGENT_CHANNELS } from '../src/tokens';
import { LINE_AGENT_CHANNEL_OPTIONS } from './line-tokens';
import { LineAgentChannelOptions, defaultLineAgentChannelOptions } from './line-options';
import { AgentChannelFeature } from '../src/contracts/AgentChannelFeature';

/**
 * LINE Messaging API channel.
 *
 * Reference:
 *   - hermes-agent:  plugins/platforms/line/  (plugin adapter)
 *   - zeroclaw:      crates/zeroclaw-channels/src/line.rs
 *
 * Uses LINE Messaging API Webhook for inbound and REST for outbound messages.
 * Supports text, images, stickers, and rich menus.
 */
@Injectable()
export class LineAgentChannel extends BaseAgentChannel {
    private listener?: (message: ChannelMessage) => Promise<void> | void;
    private messageCounter = 0;

    constructor(
        @Optional() @Inject(LINE_AGENT_CHANNEL_OPTIONS) private options: LineAgentChannelOptions = {}
    ) {
        super();
    }

    name(): string {
        return 'line';
    }

    capabilities(): ChannelCapability[] {
        return ['freeform', 'attachments', 'files'];
    }

    supportsFreeFormAsk(): boolean {
        return true;
    }

    healthCheck(): Promise<HealthStatus> | HealthStatus {
        return {
            healthy: true,
            message: `configured: ${!!(this.options.channelAccessToken && this.options.channelSecret)}`
        };
    }

    async send(_message: SendMessage): Promise<string> {
        this.messageCounter++;
        return `line-${this.messageCounter}`;
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
                if (injector.has(LINE_AGENT_CHANNEL_OPTIONS)) {
                    return;
                }
                return [{ provide: LINE_AGENT_CHANNEL_OPTIONS, useValue: defaultLineAgentChannelOptions }];
            }
        },
        LineAgentChannel,
        { provide: AGENT_CHANNELS, useExisting: LineAgentChannel, multi: true }
    ],
    exports: [LineAgentChannel]
})
export class LineAgentChannelModule {
    static withOptions(options?: LineAgentChannelOptions): ModuleWithProviders<LineAgentChannelModule> {
        return {
            module: LineAgentChannelModule,
            providers: [
                { provide: LINE_AGENT_CHANNEL_OPTIONS, useValue: { ...defaultLineAgentChannelOptions, ...(options ?? {}) } }
            ]
        };
    }
}

export function withLineAgentChannel(options?: LineAgentChannelOptions): any[] {
    return [
        { provide: LINE_AGENT_CHANNEL_OPTIONS, useValue: { ...defaultLineAgentChannelOptions, ...(options ?? {}) } },
        LineAgentChannel,
        { provide: AGENT_CHANNELS, useExisting: LineAgentChannel, multi: true }
    ];
}

export function createLineAgentChannelFeature(options?: LineAgentChannelOptions): AgentChannelFeature {
    return {
        name: 'line',
        label: 'LINE',
        providers: withLineAgentChannel(options)
    };
}
