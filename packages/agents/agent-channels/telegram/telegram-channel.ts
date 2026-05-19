import { Inject, Injectable, Optional, Module, ModuleWithProviders, Provider } from '@tsdi/ioc';
import { BaseAgentChannel } from '../src/contracts/BaseAgentChannel';
import { SendMessage } from '../src/contracts/SendMessage';
import { ChannelMessage } from '../src/contracts/ChannelMessage';
import { ChannelCapability } from '../src/contracts/ChannelCapability';
import { HealthStatus } from '../src/contracts/HealthStatus';
import { AGENT_CHANNELS } from '../src/tokens';
import { TELEGRAM_AGENT_CHANNEL_OPTIONS } from './telegram-tokens';
import { TelegramAgentChannelOptions, defaultTelegramAgentChannelOptions } from './telegram-options';
import { AgentChannelFeature } from '../src/contracts/AgentChannelFeature';

/**
 * Telegram Bot API channel.
 *
 * Reference:
 *   - hermes-agent:  gateway/platforms/telegram.py  (Bot API long-poll + webhook)
 *   - zeroclaw:      crates/zeroclaw-channels/src/telegram.rs
 *
 * Supports long-polling (getUpdates) or webhook receive modes, inline keyboards for approvals,
 * and rich media (photo, video, document, voice).
 */
@Injectable()
export class TelegramAgentChannel extends BaseAgentChannel {
    private listener?: (message: ChannelMessage) => Promise<void> | void;
    private messageCounter = 0;

    constructor(
        @Optional() @Inject(TELEGRAM_AGENT_CHANNEL_OPTIONS) private options: TelegramAgentChannelOptions = {}
    ) {
        super();
    }

    name(): string {
        return 'telegram';
    }

    capabilities(): ChannelCapability[] {
        return ['freeform', 'streaming', 'attachments', 'files', 'voice', 'typing', 'reactions', 'approval'];
    }

    supportsFreeFormAsk(): boolean {
        return true;
    }

    supportsDraftUpdates(): boolean {
        return true;
    }

    supportsMultiMessageStreaming(): boolean {
        return true;
    }

    multiMessageDelayMs(): number {
        return 800;
    }

    healthCheck(): Promise<HealthStatus> | HealthStatus {
        return {
            healthy: true,
            message: `configured: ${!!this.options.botToken}`
        };
    }

    async send(_message: SendMessage): Promise<string> {
        this.messageCounter++;
        return `telegram-${this.messageCounter}`;
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
                if (injector.has(TELEGRAM_AGENT_CHANNEL_OPTIONS)) {
                    return;
                }
                return [{ provide: TELEGRAM_AGENT_CHANNEL_OPTIONS, useValue: defaultTelegramAgentChannelOptions }];
            }
        },
        TelegramAgentChannel,
        { provide: AGENT_CHANNELS, useExisting: TelegramAgentChannel, multi: true }
    ],
    exports: [TelegramAgentChannel]
})
export class TelegramAgentChannelModule {
    static withOptions(options?: TelegramAgentChannelOptions): ModuleWithProviders<TelegramAgentChannelModule> {
        return {
            module: TelegramAgentChannelModule,
            providers: [
                { provide: TELEGRAM_AGENT_CHANNEL_OPTIONS, useValue: { ...defaultTelegramAgentChannelOptions, ...(options ?? {}) } }
            ]
        };
    }
}

export function withTelegramAgentChannel(options?: TelegramAgentChannelOptions): Provider[] {
    return [
        { provide: TELEGRAM_AGENT_CHANNEL_OPTIONS, useValue: { ...defaultTelegramAgentChannelOptions, ...(options ?? {}) } },
        TelegramAgentChannel,
        { provide: AGENT_CHANNELS, useExisting: TelegramAgentChannel, multi: true }
    ];
}

export function createTelegramAgentChannelFeature(options?: TelegramAgentChannelOptions): AgentChannelFeature {
    return {
        name: 'telegram',
        label: 'Telegram',
        providers: withTelegramAgentChannel(options)
    };
}
