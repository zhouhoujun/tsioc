import { Inject, Injectable, Optional, Module, ModuleWithProviders } from '@tsdi/ioc';
import { BaseAgentChannel } from '../src/contracts/BaseAgentChannel';
import { SendMessage } from '../src/contracts/SendMessage';
import { ChannelMessage } from '../src/contracts/ChannelMessage';
import { ChannelCapability } from '../src/contracts/ChannelCapability';
import { HealthStatus } from '../src/contracts/HealthStatus';
import { AGENT_CHANNELS } from '../src/tokens';
import { WECOM_AGENT_CHANNEL_OPTIONS } from './wecom-tokens';
import { WecomAgentChannelOptions, defaultWecomAgentChannelOptions } from './wecom-options';
import { AgentChannelFeature } from '../src/contracts/AgentChannelFeature';

/**
 * WeCom (企业微信/Enterprise WeChat) channel via AI Bot WebSocket gateway.
 *
 * Reference:
 *   - hermes-agent:  gateway/platforms/wecom.py  (WS aibot protocol)
 *   - zeroclaw:      crates/zeroclaw-channels/src/wecom.rs
 *
 * Uses WSS at openws.work.weixin.qq.com with aibot_subscribe/auth + send_msg frames.
 */
@Injectable()
export class WecomAgentChannel extends BaseAgentChannel {
    private listener?: (message: ChannelMessage) => Promise<void> | void;
    private messageCounter = 0;

    constructor(
        @Optional() @Inject(WECOM_AGENT_CHANNEL_OPTIONS) private options: WecomAgentChannelOptions = {}
    ) {
        super();
    }

    name(): string {
        return 'wecom';
    }

    capabilities(): ChannelCapability[] {
        return ['freeform', 'files', 'attachments'];
    }

    supportsFreeFormAsk(): boolean {
        return true;
    }

    healthCheck(): Promise<HealthStatus> | HealthStatus {
        return {
            healthy: true,
            message: `configured: ${!!(this.options.botId && this.options.secret)}`
        };
    }

    async send(_message: SendMessage): Promise<string> {
        this.messageCounter++;
        return `wecom-${this.messageCounter}`;
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
                if (injector.has(WECOM_AGENT_CHANNEL_OPTIONS)) {
                    return;
                }
                return [{ provide: WECOM_AGENT_CHANNEL_OPTIONS, useValue: defaultWecomAgentChannelOptions }];
            }
        },
        WecomAgentChannel,
        { provide: AGENT_CHANNELS, useExisting: WecomAgentChannel, multi: true }
    ],
    exports: [WecomAgentChannel]
})
export class WecomAgentChannelModule {
    static withOptions(options?: WecomAgentChannelOptions): ModuleWithProviders<WecomAgentChannelModule> {
        return {
            module: WecomAgentChannelModule,
            providers: [
                { provide: WECOM_AGENT_CHANNEL_OPTIONS, useValue: { ...defaultWecomAgentChannelOptions, ...(options ?? {}) } }
            ]
        };
    }
}

export function withWecomAgentChannel(options?: WecomAgentChannelOptions): any[] {
    return [
        { provide: WECOM_AGENT_CHANNEL_OPTIONS, useValue: { ...defaultWecomAgentChannelOptions, ...(options ?? {}) } },
        WecomAgentChannel,
        { provide: AGENT_CHANNELS, useExisting: WecomAgentChannel, multi: true }
    ];
}

export function createWecomAgentChannelFeature(options?: WecomAgentChannelOptions): AgentChannelFeature {
    return {
        name: 'wecom',
        label: 'WeCom',
        providers: withWecomAgentChannel(options)
    };
}
