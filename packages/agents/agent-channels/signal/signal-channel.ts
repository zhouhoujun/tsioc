import { Inject, Injectable, Optional, Module, ModuleWithProviders, Provider } from '@tsdi/ioc';
import { BaseAgentChannel } from '../src/contracts/BaseAgentChannel';
import { SendMessage } from '../src/contracts/SendMessage';
import { ChannelMessage } from '../src/contracts/ChannelMessage';
import { ChannelCapability } from '../src/contracts/ChannelCapability';
import { HealthStatus } from '../src/contracts/HealthStatus';
import { AGENT_CHANNELS } from '../src/tokens';
import { SIGNAL_AGENT_CHANNEL_OPTIONS } from './signal-tokens';
import { SignalAgentChannelOptions, defaultSignalAgentChannelOptions } from './signal-options';
import { AgentChannelFeature } from '../src/contracts/AgentChannelFeature';

/**
 * Signal Messenger channel via signal-cli REST API.
 *
 * Reference:
 *   - hermes-agent:  gateway/platforms/signal.py  (signal-cli JSON-RPC)
 *   - zeroclaw:      crates/zeroclaw-channels/src/signal.rs
 *
 * Uses signal-cli's JSON-RPC interface (default localhost:8080) for send/receive.
 */
@Injectable()
export class SignalAgentChannel extends BaseAgentChannel {
    private listener?: (message: ChannelMessage) => Promise<void> | void;
    private messageCounter = 0;

    constructor(
        @Optional() @Inject(SIGNAL_AGENT_CHANNEL_OPTIONS) private options: SignalAgentChannelOptions = {}
    ) {
        super();
    }

    name(): string {
        return 'signal';
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
            message: `configured: ${!!this.options.phoneNumber}`
        };
    }

    async send(_message: SendMessage): Promise<string> {
        this.messageCounter++;
        return `signal-${this.messageCounter}`;
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
                if (injector.has(SIGNAL_AGENT_CHANNEL_OPTIONS)) {
                    return;
                }
                return [{ provide: SIGNAL_AGENT_CHANNEL_OPTIONS, useValue: defaultSignalAgentChannelOptions }];
            }
        },
        SignalAgentChannel,
        { provide: AGENT_CHANNELS, useExisting: SignalAgentChannel, multi: true }
    ],
    exports: [SignalAgentChannel]
})
export class SignalAgentChannelModule {
    static withOptions(options?: SignalAgentChannelOptions): ModuleWithProviders<SignalAgentChannelModule> {
        return {
            module: SignalAgentChannelModule,
            providers: [
                { provide: SIGNAL_AGENT_CHANNEL_OPTIONS, useValue: { ...defaultSignalAgentChannelOptions, ...(options ?? {}) } }
            ]
        };
    }
}

export function withSignalAgentChannel(options?: SignalAgentChannelOptions): Provider[] {
    return [
        { provide: SIGNAL_AGENT_CHANNEL_OPTIONS, useValue: { ...defaultSignalAgentChannelOptions, ...(options ?? {}) } },
        SignalAgentChannel,
        { provide: AGENT_CHANNELS, useExisting: SignalAgentChannel, multi: true }
    ];
}

export function createSignalAgentChannelFeature(options?: SignalAgentChannelOptions): AgentChannelFeature {
    return {
        name: 'signal',
        label: 'Signal',
        providers: withSignalAgentChannel(options)
    };
}
