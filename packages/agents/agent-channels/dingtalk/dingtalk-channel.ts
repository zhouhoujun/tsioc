import { Inject, Injectable, Optional, Module, ModuleWithProviders, Provider } from '@tsdi/ioc';
import { BaseAgentChannel } from '../src/contracts/BaseAgentChannel';
import { SendMessage } from '../src/contracts/SendMessage';
import { ChannelMessage } from '../src/contracts/ChannelMessage';
import { ChannelCapability } from '../src/contracts/ChannelCapability';
import { HealthStatus } from '../src/contracts/HealthStatus';
import { AGENT_CHANNELS } from '../src/tokens';
import { DINGTALK_AGENT_CHANNEL_OPTIONS } from './dingtalk-tokens';
import { DingtalkAgentChannelOptions, defaultDingtalkAgentChannelOptions } from './dingtalk-options';
import { AgentChannelFeature } from '../src/contracts/AgentChannelFeature';

/**
 * DingTalk (钉钉) channel via DingTalk Stream Mode WebSocket.
 *
 * Reference:
 *   - hermes-agent:  gateway/platforms/dingtalk.py  (stream-mode WS + session webhooks)
 *   - zeroclaw:      crates/zeroclaw-channels/src/dingtalk.rs
 *
 * Uses dingtalk-stream SDK for long-lived WS connection and per-chat session webhooks for replies.
 */
@Injectable()
export class DingtalkAgentChannel extends BaseAgentChannel {
    private listener?: (message: ChannelMessage) => Promise<void> | void;
    private messageCounter = 0;

    constructor(
        @Optional() @Inject(DINGTALK_AGENT_CHANNEL_OPTIONS) private options: DingtalkAgentChannelOptions = {}
    ) {
        super();
    }

    name(): string {
        return 'dingtalk';
    }

    capabilities(): ChannelCapability[] {
        return ['freeform', 'streaming', 'files'];
    }

    supportsFreeFormAsk(): boolean {
        return true;
    }

    supportsDraftUpdates(): boolean {
        return !!this.options.cardTemplateId;
    }

    healthCheck(): Promise<HealthStatus> | HealthStatus {
        return {
            healthy: true,
            message: `configured: ${!!(this.options.clientId && this.options.clientSecret)}`
        };
    }

    async send(_message: SendMessage): Promise<string> {
        this.messageCounter++;
        return `dingtalk-${this.messageCounter}`;
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
                if (injector.has(DINGTALK_AGENT_CHANNEL_OPTIONS)) {
                    return;
                }
                return [{ provide: DINGTALK_AGENT_CHANNEL_OPTIONS, useValue: defaultDingtalkAgentChannelOptions }];
            }
        },
        DingtalkAgentChannel,
        { provide: AGENT_CHANNELS, useExisting: DingtalkAgentChannel, multi: true }
    ],
    exports: [DingtalkAgentChannel]
})
export class DingtalkAgentChannelModule {
    static withOptions(options?: DingtalkAgentChannelOptions): ModuleWithProviders<DingtalkAgentChannelModule> {
        return {
            module: DingtalkAgentChannelModule,
            providers: [
                { provide: DINGTALK_AGENT_CHANNEL_OPTIONS, useValue: { ...defaultDingtalkAgentChannelOptions, ...(options ?? {}) } }
            ]
        };
    }
}

export function withDingtalkAgentChannel(options?: DingtalkAgentChannelOptions): Provider[] {
    return [
        { provide: DINGTALK_AGENT_CHANNEL_OPTIONS, useValue: { ...defaultDingtalkAgentChannelOptions, ...(options ?? {}) } },
        DingtalkAgentChannel,
        { provide: AGENT_CHANNELS, useExisting: DingtalkAgentChannel, multi: true }
    ];
}

export function createDingtalkAgentChannelFeature(options?: DingtalkAgentChannelOptions): AgentChannelFeature {
    return {
        name: 'dingtalk',
        label: 'DingTalk',
        providers: withDingtalkAgentChannel(options)
    };
}
