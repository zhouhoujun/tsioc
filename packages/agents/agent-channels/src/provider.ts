import { Injector, Provider, ProvdierOf, StaticProvider, toProviders } from '@tsdi/ioc';
import { AgentConversationChannel } from './contracts/AgentConversationChannel';
import { AgentChannelFeature } from './contracts/AgentChannelFeature';
import { AGENT_CHANNEL_OPTIONS, AGENT_CHANNELS } from './tokens';
import { AgentChannelGroup, AgentChannelItem, AgentChannelsOptions, mergeAgentChannelsOptions } from './options';
import { LocalLoopbackAgentChannel } from './adapters/LocalLoopbackAgentChannel';
import { PubSubConversationChannel } from './adapters/PubSubConversationChannel';
import { ConsoleAgentChannel } from './adapters/ConsoleAgentChannel';
import { WebhookAgentChannel } from './adapters/WebhookAgentChannel';
import { SSEAgentChannel } from './adapters/SSEAgentChannel';
import { AgentChannelRegistry } from './orchestrator/AgentChannelRegistry';
import { ChannelEnvelopeMapper } from './orchestrator/ChannelEnvelopeMapper';
import { AgentChannelOrchestrator } from './orchestrator/AgentChannelOrchestrator';
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
    slack: (options?: AgentChannelsOptions) => withSlackAgentChannel(options?.provideChannels?.slack),
    telegram: (options?: AgentChannelsOptions) => withTelegramAgentChannel(options?.provideChannels?.telegram),
    discord: (options?: AgentChannelsOptions) => withDiscordAgentChannel(options?.provideChannels?.discord),
    line: (options?: AgentChannelsOptions) => withLineAgentChannel(options?.provideChannels?.line),
    matrix: (options?: AgentChannelsOptions) => withMatrixAgentChannel(options?.provideChannels?.matrix),
    mattermost: (options?: AgentChannelsOptions) => withMattermostAgentChannel(options?.provideChannels?.mattermost),
    signal: (options?: AgentChannelsOptions) => withSignalAgentChannel(options?.provideChannels?.signal),
    wechat: (options?: AgentChannelsOptions) => withWechatAgentChannel(options?.provideChannels?.wechat),
    wecom: (options?: AgentChannelsOptions) => withWecomAgentChannel(options?.provideChannels?.wecom),
    qq: (options?: AgentChannelsOptions) => withQQAgentChannel(options?.provideChannels?.qq),
    feishu: (options?: AgentChannelsOptions) => withFeishuAgentChannel(options?.provideChannels?.feishu),
    dingtalk: (options?: AgentChannelsOptions) => withDingtalkAgentChannel(options?.provideChannels?.dingtalk)
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
                    providers.push(...factory(options) as StaticProvider[]);
                }
            });

            if (builtIn.length) {
                providers.push(...toProviders(AGENT_CHANNELS, builtIn, true));
            }
            return providers;
        }
    };
}

export function provideChannels(options?: AgentChannelsOptions, ...channels: ProvdierOf<AgentConversationChannel>[]): Provider[] {
    const merged = mergeAgentChannelsOptions(options);
    return [
        {
            async provider(injector: Injector) {
                await Promise.all((merged.imports ?? []).map(imp => (injector as any).import(imp)));
                return [];
            }
        },
        { provide: AGENT_CHANNEL_OPTIONS, useValue: merged },
        AgentChannelRegistry,
        ChannelEnvelopeMapper,
        AgentChannelOrchestrator,
        LocalLoopbackAgentChannel,
        PubSubConversationChannel,
        ConsoleAgentChannel,
        WebhookAgentChannel,
        SSEAgentChannel,
        provideResolvedAgentChannels(),
        ...withAgentChannels(...channels)
    ];
}

export { channelGroups as AGENT_CHANNEL_GROUPS, builtInChannelProviders as AGENT_CHANNEL_PROVIDERS };
