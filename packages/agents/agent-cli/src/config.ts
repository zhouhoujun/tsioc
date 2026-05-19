import { AGENT_CHANNEL_GROUPS, AgentChannelsOptions } from '@tsdi/agent-channels';
import { AGENT_TOOL_GROUPS, AgentToolsOptions } from '@tsdi/agent-tools';

export interface AgentCliOptions {
    session?: string;
    cwd?: string;
    tools?: string;
    channels?: string;
    skillRoots?: string;
    withHermesSkills?: boolean;
    defaultTools?: boolean;
    defaultChannels?: boolean;
    provider?: string;
    model?: string;
    json?: boolean;
}

export interface AgentCliResolvedConfig {
    sessionId: string;
    tools: AgentToolsOptions;
    channels: AgentChannelsOptions;
    skillRoots: string[];
    withHermesSkills: boolean;
}

function parseList(input?: string): string[] {
    return (input ?? '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
}

function isKnownGroup(name: string, groups: Record<string, unknown>): boolean {
    return Object.prototype.hasOwnProperty.call(groups, name);
}

export function resolveCliConfig(options: AgentCliOptions): AgentCliResolvedConfig {
    const toolNames = parseList(options.tools);
    const channelNames = parseList(options.channels);
    const tools: AgentToolsOptions = {
        file: options.cwd ? { rootDir: options.cwd } : undefined,
        registration: {
            preset: options.defaultTools === false ? 'none' : 'default',
            groups: {},
            items: {}
        }
    };
    const channels: AgentChannelsOptions = {
        defaultChannel: channelNames[0],
        registration: {
            preset: options.defaultChannels === false ? 'none' : 'default',
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
        sessionId: options.session || 'default',
        tools,
        channels,
        skillRoots: parseList(options.skillRoots),
        withHermesSkills: options.withHermesSkills === true
    };
}
