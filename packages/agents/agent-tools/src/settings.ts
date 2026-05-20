import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { AgentToolsOptions } from './options';

export const DEFAULT_AGENT_ROOT_DIRNAME = '.tsdi-agent';
export const AGENT_SETTINGS_FILE = 'settings.json';
export const DEFAULT_AGENT_WORKSPACE_DIRNAME = 'workspace';

export interface AgentRootSettings {
    workspace?: string;
    skills?: {
        roots?: string | string[];
    };
    tools?: {
        root?: string;
        values?: string | string[];
        defaultEnabled?: boolean;
    };
    channels?: {
        values?: string | string[];
        defaultEnabled?: boolean;
    };
    session?: string;
}

export interface ResolvedAgentRootSettings {
    root: string;
    settingsPath: string;
    settings: AgentRootSettings;
    workspace: string;
    toolsRoot?: string;
    skillRoots: string[];
}

export interface AgentToolDiscoverySettings extends AgentRootSettings {
}

export interface ResolvedAgentToolDiscovery {
    root: string;
    settingsPath: string;
    settings: AgentToolDiscoverySettings;
    workspace: string;
    skillRoots: string[];
    tools: AgentToolsOptions;
}

export function resolveAgentRoot(root?: string): string {
    return path.resolve(root || path.join(os.homedir(), DEFAULT_AGENT_ROOT_DIRNAME));
}

export function resolveAgentSettingsPath(root: string): string {
    return path.join(root, AGENT_SETTINGS_FILE);
}

export function loadAgentRootSettings(settingsPath: string): AgentRootSettings {
    if (!fs.existsSync(settingsPath)) {
        return {};
    }
    const raw = fs.readFileSync(settingsPath, 'utf8').trim();
    if (!raw) {
        return {};
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`Invalid agent settings at '${settingsPath}': expected a JSON object.`);
    }
    return parsed as AgentRootSettings;
}

export function parseAgentSettingsList(input?: string | string[]): string[] {
    if (Array.isArray(input)) {
        return input.map(item => item.trim()).filter(Boolean);
    }
    return (input ?? '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
}

export function resolveAgentRootWorkspace(root: string, settings: AgentRootSettings): string {
    return path.resolve(root, settings.workspace || DEFAULT_AGENT_WORKSPACE_DIRNAME);
}

export function resolveAgentRootSettings(root?: string): ResolvedAgentRootSettings {
    const resolvedRoot = resolveAgentRoot(root);
    const settingsPath = resolveAgentSettingsPath(resolvedRoot);
    const settings = loadAgentRootSettings(settingsPath);
    const workspace = resolveAgentRootWorkspace(resolvedRoot, settings);
    const toolsRoot = settings.tools?.root?.trim() ? path.resolve(workspace, settings.tools.root) : undefined;
    const skillRoots = parseAgentSettingsList(settings.skills?.roots).map(item => path.resolve(workspace, item));
    return {
        root: resolvedRoot,
        settingsPath,
        settings,
        workspace,
        ...(toolsRoot ? { toolsRoot } : {}),
        skillRoots
    };
}

export function resolveAgentToolDiscovery(root?: string): ResolvedAgentToolDiscovery {
    const resolved = resolveAgentRootSettings(root);
    const settings = resolved.settings as AgentToolDiscoverySettings;
    const toolsRoot = resolved.toolsRoot || resolved.workspace;
    return {
        root: resolved.root,
        settingsPath: resolved.settingsPath,
        settings,
        workspace: resolved.workspace,
        skillRoots: resolved.skillRoots,
        tools: {
            file: { rootDir: toolsRoot },
            roots: resolved.toolsRoot ? [toolsRoot] : [],
            registration: {
                preset: settings.tools?.defaultEnabled === false ? 'none' : 'default',
                groups: {},
                items: {}
            }
        }
    };
}
