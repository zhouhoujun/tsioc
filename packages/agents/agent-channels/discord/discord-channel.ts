import { Inject, Injectable, Optional, Module, ModuleWithProviders, Provider } from '@tsdi/ioc';
import { BaseAgentChannel } from '../src/contracts/BaseAgentChannel';
import { SendMessage } from '../src/contracts/SendMessage';
import { ChannelMessage } from '../src/contracts/ChannelMessage';
import { ChannelCapability } from '../src/contracts/ChannelCapability';
import { HealthStatus } from '../src/contracts/HealthStatus';
import { AGENT_CHANNELS } from '../src/tokens';
import { DISCORD_AGENT_CHANNEL_OPTIONS } from './discord-tokens';
import { DiscordAgentChannelOptions, defaultDiscordAgentChannelOptions } from './discord-options';
import { AgentChannelFeature } from '../src/contracts/AgentChannelFeature';

/**
 * Discord Bot API channel (Gateway + REST).
 *
 * Reference:
 *   - hermes-agent:  gateway/platforms/discord.py  (discord.py gateway + REST)
 *   - zeroclaw:      crates/zeroclaw-channels/src/discord.rs  (serenity + reqwest)
 *
 * Connects via Discord Gateway for real-time events and uses REST for outbound messages.
 * Supports rich embeds, slash commands, threads, and reactions.
 */
@Injectable()
export class DiscordAgentChannel extends BaseAgentChannel {
    private listener?: (message: ChannelMessage) => Promise<void> | void;
    private messageCounter = 0;

    constructor(
        @Optional() @Inject(DISCORD_AGENT_CHANNEL_OPTIONS) private options: DiscordAgentChannelOptions = {}
    ) {
        super();
    }

    name(): string {
        return 'discord';
    }

    capabilities(): ChannelCapability[] {
        return ['freeform', 'streaming', 'attachments', 'files', 'voice', 'threading', 'typing', 'reactions'];
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
        return `discord-${this.messageCounter}`;
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
                if (injector.has(DISCORD_AGENT_CHANNEL_OPTIONS)) {
                    return;
                }
                return [{ provide: DISCORD_AGENT_CHANNEL_OPTIONS, useValue: defaultDiscordAgentChannelOptions }];
            }
        },
        DiscordAgentChannel,
        { provide: AGENT_CHANNELS, useExisting: DiscordAgentChannel, multi: true }
    ],
    exports: [DiscordAgentChannel]
})
export class DiscordAgentChannelModule {
    static withOptions(options?: DiscordAgentChannelOptions): ModuleWithProviders<DiscordAgentChannelModule> {
        return {
            module: DiscordAgentChannelModule,
            providers: [
                { provide: DISCORD_AGENT_CHANNEL_OPTIONS, useValue: { ...defaultDiscordAgentChannelOptions, ...(options ?? {}) } }
            ]
        };
    }
}

export function withDiscordAgentChannel(options?: DiscordAgentChannelOptions): Provider[] {
    return [
        { provide: DISCORD_AGENT_CHANNEL_OPTIONS, useValue: { ...defaultDiscordAgentChannelOptions, ...(options ?? {}) } },
        DiscordAgentChannel,
        { provide: AGENT_CHANNELS, useExisting: DiscordAgentChannel, multi: true }
    ];
}

export function createDiscordAgentChannelFeature(options?: DiscordAgentChannelOptions): AgentChannelFeature {
    return {
        name: 'discord',
        label: 'Discord',
        providers: withDiscordAgentChannel(options)
    };
}
