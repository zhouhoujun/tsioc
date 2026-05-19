import { Inject, Injectable, Optional, Module, ModuleWithProviders, Provider } from '@tsdi/ioc';
import { WechatSignatureService } from '@tsdi/security';
import { BaseAgentChannel } from '../src/contracts/BaseAgentChannel';
import { SendMessage } from '../src/contracts/SendMessage';
import { ChannelMessage } from '../src/contracts/ChannelMessage';
import { ChannelCapability } from '../src/contracts/ChannelCapability';
import { HealthStatus } from '../src/contracts/HealthStatus';
import { AGENT_CHANNELS } from '../src/tokens';
import { WECHAT_AGENT_CHANNEL_OPTIONS } from './wechat-tokens';
import { WechatAgentChannelOptions, defaultWechatAgentChannelOptions } from './wechat-options';
import { AgentChannelFeature } from '../src/contracts/AgentChannelFeature';

/**
 * WeChat (weixin) personal account channel via Tencent iLink Bot API.
 *
 * Reference:
 *   - hermes-agent:  gateway/platforms/weixin.py  (long-poll REST adapter)
 *   - zeroclaw:      crates/zeroclaw-channels/src/wechat.rs
 */
@Injectable()
export class WechatAgentChannel extends BaseAgentChannel {
    private listener?: (message: ChannelMessage) => Promise<void> | void;
    sent: SendMessage[] = [];

    constructor(
        private signatures: WechatSignatureService,
        @Optional() @Inject(WECHAT_AGENT_CHANNEL_OPTIONS) private options: WechatAgentChannelOptions = {}
    ) {
        super();
    }

    name(): string {
        return 'wechat';
    }

    async send(message: SendMessage): Promise<string> {
        this.sent.push(message);
        return `wechat-${this.sent.length}`;
    }

    async listen(handler: (message: ChannelMessage) => Promise<void> | void): Promise<void> {
        this.listener = handler;
    }

    async emitInbound(message: ChannelMessage): Promise<void> {
        await this.listener?.(message);
    }

    verifyIngressSignature(signature: string, timestamp: string, nonce: string): boolean {
        if (!this.options.token) {
            return false;
        }
        return this.signatures.verify(signature, this.options.token, timestamp, nonce);
    }

    healthCheck(): Promise<HealthStatus> | HealthStatus {
        return {
            healthy: true,
            message: `configured: ${!!(this.options.appId || this.options.token)}`
        };
    }

    capabilities(): ChannelCapability[] {
        return ['freeform'];
    }

    supportsFreeFormAsk(): boolean {
        return true;
    }
}

@Module({
    providers: [
        {
            provider(injector) {
                if (injector.has(WECHAT_AGENT_CHANNEL_OPTIONS)) {
                    return;
                }
                return [{ provide: WECHAT_AGENT_CHANNEL_OPTIONS, useValue: defaultWechatAgentChannelOptions }];
            }
        },
        WechatAgentChannel,
        { provide: AGENT_CHANNELS, useExisting: WechatAgentChannel, multi: true }
    ],
    exports: [WechatAgentChannel]
})
export class WechatAgentChannelModule {
    static withOptions(options?: WechatAgentChannelOptions): ModuleWithProviders<WechatAgentChannelModule> {
        return {
            module: WechatAgentChannelModule,
            providers: [
                { provide: WECHAT_AGENT_CHANNEL_OPTIONS, useValue: { ...defaultWechatAgentChannelOptions, ...(options ?? {}) } }
            ]
        };
    }
}

export function withWechatAgentChannel(options?: WechatAgentChannelOptions): Provider[] {
    return [
        { provide: WECHAT_AGENT_CHANNEL_OPTIONS, useValue: { ...defaultWechatAgentChannelOptions, ...(options ?? {}) } },
        WechatAgentChannel,
        { provide: AGENT_CHANNELS, useExisting: WechatAgentChannel, multi: true }
    ];
}

export function createWechatAgentChannelFeature(options?: WechatAgentChannelOptions): AgentChannelFeature {
    return {
        name: 'wechat',
        label: 'WeChat',
        providers: withWechatAgentChannel(options)
    };
}
