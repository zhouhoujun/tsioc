import type { SSEChannelOptions } from './adapters/SSEAgentChannel';
import type { WebhookChannelOptions } from './adapters/WebhookAgentChannel';
import type { SlackAgentChannelOptions } from '../slack/slack-options';
import type { TelegramAgentChannelOptions } from '../telegram/telegram-options';
import type { DiscordAgentChannelOptions } from '../discord/discord-options';
import type { LineAgentChannelOptions } from '../line/line-options';
import type { MatrixAgentChannelOptions } from '../matrix/matrix-options';
import type { MattermostAgentChannelOptions } from '../mattermost/mattermost-options';
import type { SignalAgentChannelOptions } from '../signal/signal-options';
import type { WechatAgentChannelOptions } from '../wechat/wechat-options';
import type { WecomAgentChannelOptions } from '../wecom/wecom-options';
import type { QQAgentChannelOptions } from '../qq/qq-options';
import type { FeishuAgentChannelOptions } from '../feishu/feishu-options';
import type { DingtalkAgentChannelOptions } from '../dingtalk/dingtalk-options';

export type AgentChannelGroup = 'local' | 'server' | 'domestic' | 'global';

export type AgentChannelItem =
    | 'loopback'
    | 'pubsub'
    | 'console'
    | 'webhook'
    | 'sse'
    | 'slack'
    | 'telegram'
    | 'discord'
    | 'line'
    | 'matrix'
    | 'mattermost'
    | 'signal'
    | 'wechat'
    | 'wecom'
    | 'qq'
    | 'feishu'
    | 'dingtalk';

export interface AgentChannelsRegistrationOptions {
    preset?: 'default' | 'none' | 'local' | 'server' | 'all';
    groups?: Partial<Record<AgentChannelGroup, boolean>>;
    items?: Partial<Record<AgentChannelItem, boolean>>;
}

export interface AgentProviderChannelItemOptions {
    slack?: SlackAgentChannelOptions;
    telegram?: TelegramAgentChannelOptions;
    discord?: DiscordAgentChannelOptions;
    line?: LineAgentChannelOptions;
    matrix?: MatrixAgentChannelOptions;
    mattermost?: MattermostAgentChannelOptions;
    signal?: SignalAgentChannelOptions;
    wechat?: WechatAgentChannelOptions;
    wecom?: WecomAgentChannelOptions;
    qq?: QQAgentChannelOptions;
    feishu?: FeishuAgentChannelOptions;
    dingtalk?: DingtalkAgentChannelOptions;
}

export interface AgentChannelsOptions {
    defaultChannel?: string;
    imports?: any[];
    sse?: SSEChannelOptions;
    webhook?: WebhookChannelOptions;
    registration?: AgentChannelsRegistrationOptions;
    provideChannels?: AgentProviderChannelItemOptions;
}

export const defaultAgentChannelsOptions: AgentChannelsOptions = {
    registration: {
        preset: 'default',
        groups: {},
        items: {}
    },
    provideChannels: {}
};

export function mergeAgentChannelsOptions(options?: AgentChannelsOptions): AgentChannelsOptions {
    return {
        ...defaultAgentChannelsOptions,
        ...(options ?? {}),
        registration: {
            ...(defaultAgentChannelsOptions.registration ?? {}),
            ...(options?.registration ?? {}),
            groups: {
                ...(defaultAgentChannelsOptions.registration?.groups ?? {}),
                ...(options?.registration?.groups ?? {})
            },
            items: {
                ...(defaultAgentChannelsOptions.registration?.items ?? {}),
                ...(options?.registration?.items ?? {})
            }
        },
        sse: {
            ...(options?.sse ?? {})
        },
        webhook: {
            ...(options?.webhook ?? {})
        },
        provideChannels: {
            ...(defaultAgentChannelsOptions.provideChannels ?? {}),
            ...(options?.provideChannels ?? {})
        }
    };
}
