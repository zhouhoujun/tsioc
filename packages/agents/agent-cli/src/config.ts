import { AGENT_CHANNEL_GROUPS, AgentChannelsOptions } from '@tsdi/agent-channels';
import { AGENT_TOOL_GROUPS, AgentRootSettings, AgentToolsOptions, parseAgentSettingsList, resolveAgentToolDiscovery } from '@tsdi/agent-tools';

export interface AgentCliOptions {
    session?: string;
    root?: string;
    tools?: string | string[];
    defaultTools?: boolean;
    channels?: string | string[];
    defaultChannels?: boolean;
    json?: boolean;
}

export interface AgentCliResolvedConfig {
    sessionId: string;
    root: string;
    settingsPath: string;
    workspace: string;
    skillRoots: string[];
    tools: AgentToolsOptions;
    channels: AgentChannelsOptions;
}

function isKnownGroup(name: string, groups: Record<string, unknown>): boolean {
    return Object.prototype.hasOwnProperty.call(groups, name);
}

export function resolveCliConfig(options: AgentCliOptions): AgentCliResolvedConfig {
    const resolved = resolveAgentToolDiscovery(options.root);
    const settings: AgentRootSettings = resolved.settings;
    const toolSettings = resolved.tools;
    const toolNames = parseAgentSettingsList(options.tools ?? settings.tools?.values);
    const channelNames = parseAgentSettingsList(options.channels ?? settings.channels?.values);
    const skillRoots = resolved.skillRoots;
    const workspace = resolved.workspace;
    const tools: AgentToolsOptions = {
        ...toolSettings,
        file: { ...(toolSettings.file ?? {}) },
        roots: (toolSettings.roots ?? []).slice(),
        registration: {
            ...(toolSettings.registration ?? {}),
            preset: options.defaultTools === false ? 'none' : (toolSettings.registration?.preset ?? 'default'),
            groups: { ...(toolSettings.registration?.groups ?? {}) },
            items: { ...(toolSettings.registration?.items ?? {}) }
        }
    };
    const channels: AgentChannelsOptions = {
        defaultChannel: channelNames[0],
        registration: {
            preset: options.defaultChannels === false || settings.channels?.defaultEnabled === false ? 'none' : 'default',
            groups: {},
            items: {}
        }
    };

    toolNames.forEach(name => {
        if (isKnownGroup(name, AGENT_TOOL_GROUPS as any)) {
            (tools.registration!.groups as any)[name] = true;
            return;
        }
        (tools.registration!.items as any)[name] = true;
    });

    channelNames.forEach(name => {
        if (isKnownGroup(name, AGENT_CHANNEL_GROUPS as any)) {
            (channels.registration!.groups as any)[name] = true;
            return;
        }
        (channels.registration!.items as any)[name] = true;
    });

    return {
        sessionId: options.session || settings.session || 'default',
        root: resolved.root,
        settingsPath: resolved.settingsPath,
        workspace,
        skillRoots,
        tools,
        channels
    };
}
