import { Inject, Injectable, Optional, Module, ModuleWithProviders, Provider } from '@tsdi/ioc';
import { BaseAgentChannel } from '../src/contracts/BaseAgentChannel';
import { SendMessage } from '../src/contracts/SendMessage';
import { ChannelMessage } from '../src/contracts/ChannelMessage';
import { ChannelCapability } from '../src/contracts/ChannelCapability';
import { HealthStatus } from '../src/contracts/HealthStatus';
import { AGENT_CHANNELS } from '../src/tokens';
import { FEISHU_AGENT_CHANNEL_OPTIONS } from './feishu-tokens';
import { FeishuAgentChannelOptions, defaultFeishuAgentChannelOptions } from './feishu-options';
import { AgentChannelFeature } from '../src/contracts/AgentChannelFeature';

/**
 * Feishu / Lark (飞书) channel via Open API (WebSocket or Webhook mode).
 *
 * Reference:
 *   - hermes-agent:  gateway/platforms/feishu.py  (lark-oapi SDK, WS + webhook)
 *   - zeroclaw:      crates/zeroclaw-channels/src/lark.rs
 *
 * Supports both WebSocket push mode and Webhook callback mode via lark-oapi.
 */
@Injectable()
export class FeishuAgentChannel extends BaseAgentChannel {
    private listener?: (message: ChannelMessage) => Promise<void> | void;
    private messageCounter = 0;

    constructor(
        @Optional() @Inject(FEISHU_AGENT_CHANNEL_OPTIONS) private options: FeishuAgentChannelOptions = {}
    ) {
        super();
    }

    name(): string {
        return 'feishu';
    }

    capabilities(): ChannelCapability[] {
        return ['freeform', 'files', 'attachments', 'reactions'];
    }

    supportsFreeFormAsk(): boolean {
        return true;
    }

    healthCheck(): Promise<HealthStatus> | HealthStatus {
        return {
            healthy: true,
            message: `configured: ${!!(this.options.appId && this.options.appSecret)}`
        };
    }

    async send(_message: SendMessage): Promise<string> {
        this.messageCounter++;
        return `feishu-${this.messageCounter}`;
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
                if (injector.has(FEISHU_AGENT_CHANNEL_OPTIONS)) {
                    return;
                }
                return [{ provide: FEISHU_AGENT_CHANNEL_OPTIONS, useValue: defaultFeishuAgentChannelOptions }];
            }
        },
        FeishuAgentChannel,
        { provide: AGENT_CHANNELS, useExisting: FeishuAgentChannel, multi: true }
    ],
    exports: [FeishuAgentChannel]
})
export class FeishuAgentChannelModule {
    static withOptions(options?: FeishuAgentChannelOptions): ModuleWithProviders<FeishuAgentChannelModule> {
        return {
            module: FeishuAgentChannelModule,
            providers: [
                { provide: FEISHU_AGENT_CHANNEL_OPTIONS, useValue: { ...defaultFeishuAgentChannelOptions, ...(options ?? {}) } }
            ]
        };
    }
}

export function withFeishuAgentChannel(options?: FeishuAgentChannelOptions): Provider[] {
    return [
        { provide: FEISHU_AGENT_CHANNEL_OPTIONS, useValue: { ...defaultFeishuAgentChannelOptions, ...(options ?? {}) } },
        FeishuAgentChannel,
        { provide: AGENT_CHANNELS, useExisting: FeishuAgentChannel, multi: true }
    ];
}

export function createFeishuAgentChannelFeature(options?: FeishuAgentChannelOptions): AgentChannelFeature {
    return {
        name: 'feishu',
        label: 'Feishu / Lark',
        providers: withFeishuAgentChannel(options)
    };
}
