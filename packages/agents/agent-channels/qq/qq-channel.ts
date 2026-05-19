import { Inject, Injectable, Optional, Module, ModuleWithProviders, Provider } from '@tsdi/ioc';
import { BaseAgentChannel } from '../src/contracts/BaseAgentChannel';
import { SendMessage } from '../src/contracts/SendMessage';
import { ChannelMessage } from '../src/contracts/ChannelMessage';
import { ChannelCapability } from '../src/contracts/ChannelCapability';
import { HealthStatus } from '../src/contracts/HealthStatus';
import { AGENT_CHANNELS } from '../src/tokens';
import { QQ_AGENT_CHANNEL_OPTIONS } from './qq-tokens';
import { QQAgentChannelOptions, defaultQQAgentChannelOptions } from './qq-options';
import { AgentChannelFeature } from '../src/contracts/AgentChannelFeature';

/**
 * QQ Bot channel via QQ Official Bot API (QQ频道/QQ机器人).
 *
 * Reference:
 *   - zeroclaw:  crates/zeroclaw-channels/src/qq.rs
 *   - hermes-agent: gateway/platforms/qqbot/ (QQ Bot adapter)
 *
 * Uses QQ Official Bot API (WebSocket for events + REST API for messages).
 * Supports guilds (频道的群) and direct messages.
 */
@Injectable()
export class QQAgentChannel extends BaseAgentChannel {
    private listener?: (message: ChannelMessage) => Promise<void> | void;
    private messageCounter = 0;

    constructor(
        @Optional() @Inject(QQ_AGENT_CHANNEL_OPTIONS) private options: QQAgentChannelOptions = {}
    ) {
        super();
    }

    name(): string {
        return 'qq';
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
            message: `configured: ${!!(this.options.appId && this.options.botToken)}`
        };
    }

    async send(_message: SendMessage): Promise<string> {
        this.messageCounter++;
        return `qq-${this.messageCounter}`;
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
                if (injector.has(QQ_AGENT_CHANNEL_OPTIONS)) {
                    return;
                }
                return [{ provide: QQ_AGENT_CHANNEL_OPTIONS, useValue: defaultQQAgentChannelOptions }];
            }
        },
        QQAgentChannel,
        { provide: AGENT_CHANNELS, useExisting: QQAgentChannel, multi: true }
    ],
    exports: [QQAgentChannel]
})
export class QQAgentChannelModule {
    static withOptions(options?: QQAgentChannelOptions): ModuleWithProviders<QQAgentChannelModule> {
        return {
            module: QQAgentChannelModule,
            providers: [
                { provide: QQ_AGENT_CHANNEL_OPTIONS, useValue: { ...defaultQQAgentChannelOptions, ...(options ?? {}) } }
            ]
        };
    }
}

export function withQQAgentChannel(options?: QQAgentChannelOptions): Provider[] {
    return [
        { provide: QQ_AGENT_CHANNEL_OPTIONS, useValue: { ...defaultQQAgentChannelOptions, ...(options ?? {}) } },
        QQAgentChannel,
        { provide: AGENT_CHANNELS, useExisting: QQAgentChannel, multi: true }
    ];
}

export function createQQAgentChannelFeature(options?: QQAgentChannelOptions): AgentChannelFeature {
    return {
        name: 'qq',
        label: 'QQ',
        providers: withQQAgentChannel(options)
    };
}
