import { Injector, ModuleWithProviders, Provider, ProvdierOf, StaticProvider, toProviders } from '@tsdi/ioc';
import { AgentConversationChannel } from './contracts/AgentConversationChannel';
import { AgentChannelFeature } from './contracts/AgentChannelFeature';
import { AGENT_CHANNEL_OPTIONS, AGENT_CHANNELS } from './tokens';
import { AgentChannelsModule } from './agent-channels.module';
import { AgentChannelGroup, AgentChannelItem, AgentChannelsOptions, mergeAgentChannelsOptions } from './options';
import { LocalLoopbackAgentChannel } from './adapters/LocalLoopbackAgentChannel';
import { PubSubConversationChannel } from './adapters/PubSubConversationChannel';
import { ConsoleAgentChannel } from './adapters/ConsoleAgentChannel';
import { WebhookAgentChannel } from './adapters/WebhookAgentChannel';
import { SSEAgentChannel } from './adapters/SSEAgentChannel';
import { withSlackAgentChannel } from '../slack/slack-channel';
import { withTelegramAgentChannel } from '../telegram/telegram-channel';
import { withDiscordAgentChannel } from '../discord/discord-channel';
import { withLineAgentChannel } from '../line/line-channel';
import { withMatrixAgentChannel } from '../matrix/matrix-channel';
import { withMattermostAgentChannel } from '../mattermost/mattermost-channel';
import { withSignalAgentChannel } from '../signal/signal-channel';
import { withWechatAgentChannel } from '../wechat/wechat-channel';
import { withWecomAgentChannel } from '../wecom/wecom-channel';
import { withQQAgentChannel } from '../qq/qq-channel';
import { withFeishuAgentChannel } from '../feishu/feishu-channel';
import { withDingtalkAgentChannel } from '../dingtalk/dingtalk-channel';

const builtInChannelItems = {
    loopback: LocalLoopbackAgentChannel,
    pubsub: PubSubConversationChannel,
    console: ConsoleAgentChannel,
    webhook: WebhookAgentChannel,
    sse: SSEAgentChannel
} as const satisfies Partial<Record<AgentChannelItem, ProvdierOf<AgentConversationChannel>>>;

const providerChannelFactories = {
    slack: (options?: AgentChannelsOptions) => withSlackAgentChannel(options?.providerChannels?.slack),
    telegram: (options?: AgentChannelsOptions) => withTelegramAgentChannel(options?.providerChannels?.telegram),
    discord: (options?: AgentChannelsOptions) => withDiscordAgentChannel(options?.providerChannels?.discord),
    line: (options?: AgentChannelsOptions) => withLineAgentChannel(options?.providerChannels?.line),
    matrix: (options?: AgentChannelsOptions) => withMatrixAgentChannel(options?.providerChannels?.matrix),
    mattermost: (options?: AgentChannelsOptions) => withMattermostAgentChannel(options?.providerChannels?.mattermost),
    signal: (options?: AgentChannelsOptions) => withSignalAgentChannel(options?.providerChannels?.signal),
    wechat: (options?: AgentChannelsOptions) => withWechatAgentChannel(options?.providerChannels?.wechat),
    wecom: (options?: AgentChannelsOptions) => withWecomAgentChannel(options?.providerChannels?.wecom),
    qq: (options?: AgentChannelsOptions) => withQQAgentChannel(options?.providerChannels?.qq),
    feishu: (options?: AgentChannelsOptions) => withFeishuAgentChannel(options?.providerChannels?.feishu),
    dingtalk: (options?: AgentChannelsOptions) => withDingtalkAgentChannel(options?.providerChannels?.dingtalk)
} as const satisfies Partial<Record<AgentChannelItem, (options?: AgentChannelsOptions) => Provider[]>>;

const channelGroups = {
    local: ['loopback', 'pubsub', 'console'],
    server: ['webhook', 'sse'],
    domestic: ['wechat', 'wecom', 'qq', 'feishu', 'dingtalk'],
    global: ['slack', 'telegram', 'discord', 'line', 'matrix', 'mattermost', 'signal']
} as const satisfies Record<AgentChannelGroup, AgentChannelItem[]>;

const defaultChannelGroups: AgentChannelGroup[] = ['local', 'server'];
const allChannelGroups = Object.keys(channelGroups) as AgentChannelGroup[];
const builtInChannelProviders = Object.values(builtInChannelItems) as any[];

export function withAgentChannels(...channels: ProvdierOf<AgentConversationChannel>[]): Provider[] {
    return toProviders(AGENT_CHANNELS, channels, true);
}

export function withAgentChannelFeatures(...features: AgentChannelFeature[]): Provider[] {
    return features.flatMap(feature => feature.providers);
}

export function resolveAgentChannelNames(options?: AgentChannelsOptions): AgentChannelItem[] {
    const merged = mergeAgentChannelsOptions(options);
    const enabled = new Map<AgentChannelItem, boolean>();
    const preset = merged.registration?.preset ?? 'default';
    const baseGroups: AgentChannelGroup[] = preset === 'all'
        ? allChannelGroups
        : preset === 'none'
            ? []
            : preset === 'local'
                ? ['local']
                : preset === 'server'
                    ? ['server']
                    : defaultChannelGroups;

    baseGroups.forEach((group: AgentChannelGroup) => {
        channelGroups[group].forEach((item: AgentChannelItem) => enabled.set(item, true));
    });

    const registrationGroups = merged.registration?.groups ?? {};
    (Object.keys(registrationGroups) as AgentChannelGroup[]).forEach(group => {
        const isEnabled = registrationGroups[group];
        if (isEnabled == null) {
            return;
        }
        const groupItems = channelGroups[group] ?? [];
        groupItems.forEach((item: AgentChannelItem) => enabled.set(item, !!isEnabled));
    });

    Object.entries(merged.registration?.items ?? {}).forEach(([item, isEnabled]) => {
        if (isEnabled == null) {
            return;
        }
        enabled.set(item as AgentChannelItem, !!isEnabled);
    });

    return Array.from(enabled.entries())
        .filter(([, isEnabled]) => isEnabled)
        .map(([name]) => name);
}

export function provideResolvedAgentChannels(): Provider {
    return {
        provider(injector: Injector) {
            const options = mergeAgentChannelsOptions(injector.get(AGENT_CHANNEL_OPTIONS, undefined as any));
            const names = resolveAgentChannelNames(options);
            const providers: StaticProvider[] = [];
            const builtIn: ProvdierOf<AgentConversationChannel>[] = [];

            names.forEach(name => {
                const builtInChannel = builtInChannelItems[name as keyof typeof builtInChannelItems];
                if (builtInChannel) {
                    builtIn.push(builtInChannel);
                    return;
                }
                const factory = providerChannelFactories[name as keyof typeof providerChannelFactories];
                if (factory) {
                    providers.push(...factory(options));
                }
            });

            if (builtIn.length) {
                providers.push(...toProviders(AGENT_CHANNELS, builtIn, true));
            }
            return providers;
        }
    };
}

export function providerChannels(options?: AgentChannelsOptions, ...channels: ProvdierOf<AgentConversationChannel>[]): ModuleWithProviders<AgentChannelsModule> {
    const merged = mergeAgentChannelsOptions(options);
    return {
        module: AgentChannelsModule,
        providers: [
            {
                provider(injector: Injector) {
                    return Promise.all((merged.imports ?? []).map(imp => (injector as any).import(imp))).then(() => []);
                }
            },
            { provide: AGENT_CHANNEL_OPTIONS, useValue: merged },
            ...withAgentChannels(...channels)
        ]
    } as any;
}

export const provideAgentChannels = providerChannels;

export { channelGroups as AGENT_CHANNEL_GROUPS, builtInChannelProviders as AGENT_CHANNEL_PROVIDERS };
