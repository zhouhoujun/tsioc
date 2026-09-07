import { FileAdapter } from '@tsdi/common';
import { Injectable, Optional } from '@tsdi/ioc';
import { AgentConsolePathProvider, resolveAgentConsoleDirectory, resolveAgentConsoleStoreFile } from './AgentConsolePathProvider';

export interface AgentConsoleTheme {
    statusTitle: string;
    statusShell: string;
    statusLabel: string;
    statusValue: string;
    statusIdleValue: string;
    statusBusyValue: string;
    statusErrorLabel: string;
    statusErrorValue: string;
    statusNoticeLabel: string;
    statusNoticeValue: string;
    inputTitle: string;
    inputShell: string;
    inputEntry: string;
    inputPrompt: string;
    inputCaption: string;
    inputField: string;
    inputButton: string;
    inputHint: string;
    workingTitle: string;
    workingShell: string;
    workingLabel: string;
    workingValue: string;
    sessionsTitle: string;
    sessionsShell: string;
    sessionsAccent: string;
    sessionsSelected: string;
    toolsTitle: string;
    toolsShell: string;
    toolsAccent: string;
    toolRunsTitle: string;
    toolRunsShell: string;
    toolRunsAccent: string;
    messagesTitle: string;
    messagesShell: string;
    messagesUser: string;
    messagesSelected: string;
    messageDetailLineNumber: string;
    activityTitle: string;
    activityShell: string;
    selectTitle: string;
    selectShell: string;
    selectHeader: string;
    selectHint: string;
    selectOption: string;
    selectOptionActive: string;
    selectDetailLabel: string;
    selectDetailValue: string;
}

export type AgentConsoleThemeInput = Partial<AgentConsoleTheme>;
export type AgentConsoleThemeStyles = {
    [K in keyof AgentConsoleTheme]: Record<string, string>;
};

export const defaultAgentConsoleTheme: AgentConsoleTheme = {
    statusTitle: 'color: #8b949e;',
    statusShell: 'color: #c9d1d9;',
    statusLabel: 'color: #6e7681;',
    statusValue: 'color: #c9d1d9;',
    statusIdleValue: 'color: #7ee787;',
    statusBusyValue: 'color: #d29922;',
    statusErrorLabel: 'color: #f85149;',
    statusErrorValue: 'color: #ffa198;',
    statusNoticeLabel: 'color: #d29922;',
    statusNoticeValue: 'color: #e3b341;',
    inputTitle: 'color: #8b949e;',
    inputShell: 'background: #1b2128; color: #c9d1d9; padding: 1em 1ch;',
    inputEntry: 'color: #c9d1d9;',
    inputPrompt: 'color: #8b949e;',
    inputCaption: 'color: #8b949e;',
    inputField: 'color: #c9d1d9;',
    inputButton: 'background: #161b22; color: #c9d1d9; border: 1px solid #30363d;',
    inputHint: 'color: #6e7681;',
    workingTitle: 'color: #8b949e;',
    workingShell: 'color: #c9d1d9;',
    workingLabel: 'color: #6e7681;',
    workingValue: 'color: #c9d1d9;',
    sessionsTitle: 'color: #8b949e;',
    sessionsShell: 'color: #c9d1d9;',
    sessionsAccent: 'color: #ffb86b;',
    sessionsSelected: 'background: #2a1f12; color: #ffb86b; padding: 0 1ch; font-weight: bold;',
    toolsTitle: 'color: #8b949e;',
    toolsShell: 'color: #c9d1d9;',
    toolsAccent: 'color: #79c0ff;',
    toolRunsTitle: 'color: #8b949e;',
    toolRunsShell: 'color: #c9d1d9;',
    toolRunsAccent: 'color: #79c0ff;',
    messagesTitle: 'color: #8b949e;',
    messagesShell: 'color: #c9d1d9;',
    messagesUser: 'background-color: #1b2128; background: #1b2128; color: #c9d1d9; padding: 0 1ch;',
    messagesSelected: 'background-color: #13202b; background: #13202b; color: #8fd0ff; padding: 0 1ch; font-weight: bold;',
    messageDetailLineNumber: 'color: #6e7681;',
    activityTitle: 'color: #8b949e;',
    activityShell: 'color: #c9d1d9;',
    selectTitle: 'color: #8b949e;',
    selectShell: 'color: #d6dee6; padding: 0 1ch;',
    selectHeader: 'color: #c9d1d9; font-weight: bold;',
    selectHint: 'color: #6e7681;',
    selectOption: 'color: #8b949e; padding: 0 1ch;',
    selectOptionActive: 'color: #5f8fc7; padding: 0 1ch; font-weight: bold;',
    selectDetailLabel: 'color: #6f7c8a;',
    selectDetailValue: 'color: #c9d1d9; padding: 0 1ch;'
};

export type AgentConsoleThemeName = 'dark' | 'light' | 'solarized' | 'high-contrast';

function remapTheme(colors: Record<string, string>): AgentConsoleTheme {
    return Object.keys(defaultAgentConsoleTheme).reduce((theme, key) => {
        const themeKey = key as keyof AgentConsoleTheme;
        theme[themeKey] = Object.entries(colors).reduce(
            (style, [source, target]) => style.replace(new RegExp(source, 'gi'), target),
            defaultAgentConsoleTheme[themeKey]
        );
        return theme;
    }, {} as AgentConsoleTheme);
}

export const agentConsoleThemes: Record<AgentConsoleThemeName, AgentConsoleTheme> = {
    dark: defaultAgentConsoleTheme,
    light: remapTheme({
        '#8b949e': '#57606a', '#c9d1d9': '#24292f', '#6e7681': '#6e7781',
        '#7ee787': '#1a7f37', '#d29922': '#9a6700', '#f85149': '#cf222e',
        '#ffa198': '#a40e26', '#e3b341': '#9a6700', '#1b2128': '#f6f8fa',
        '#161b22': '#ffffff', '#30363d': '#d0d7de', '#ffb86b': '#bc4c00',
        '#2a1f12': '#fff1e5', '#79c0ff': '#0969da', '#13202b': '#ddf4ff',
        '#8fd0ff': '#0550ae', '#d6dee6': '#24292f', '#5f8fc7': '#0969da',
        '#6f7c8a': '#57606a'
    }),
    solarized: remapTheme({
        '#8b949e': '#839496', '#c9d1d9': '#93a1a1', '#6e7681': '#657b83',
        '#7ee787': '#859900', '#d29922': '#b58900', '#f85149': '#dc322f',
        '#ffa198': '#cb4b16', '#e3b341': '#b58900', '#1b2128': '#073642',
        '#161b22': '#002b36', '#30363d': '#586e75', '#ffb86b': '#cb4b16',
        '#2a1f12': '#073642', '#79c0ff': '#268bd2', '#13202b': '#073642',
        '#8fd0ff': '#2aa198', '#d6dee6': '#93a1a1', '#5f8fc7': '#268bd2',
        '#6f7c8a': '#657b83'
    }),
    'high-contrast': remapTheme({
        '#8b949e': '#ffffff', '#c9d1d9': '#ffffff', '#6e7681': '#d0d0d0',
        '#7ee787': '#00ff66', '#d29922': '#ffdd00', '#f85149': '#ff4d4d',
        '#ffa198': '#ff8080', '#e3b341': '#ffdd00', '#1b2128': '#000000',
        '#161b22': '#000000', '#30363d': '#ffffff', '#ffb86b': '#ff9900',
        '#2a1f12': '#331f00', '#79c0ff': '#00ccff', '#13202b': '#002b3d',
        '#8fd0ff': '#66e0ff', '#d6dee6': '#ffffff', '#5f8fc7': '#00ccff',
        '#6f7c8a': '#d0d0d0'
    })
};

export const agentConsoleThemeNames = Object.keys(agentConsoleThemes) as AgentConsoleThemeName[];

export function isAgentConsoleThemeName(value: string): value is AgentConsoleThemeName {
    return agentConsoleThemeNames.includes(value as AgentConsoleThemeName);
}

@Injectable()
export class AgentConsoleThemeStore {
    constructor(@Optional() private fileAdapter?: FileAdapter | null, @Optional() private paths?: AgentConsolePathProvider | null) {}

    async load(workspace: string): Promise<AgentConsoleThemeName | undefined> {
        if (!workspace || !this.fileAdapter) return undefined;
        try {
            const parsed = JSON.parse(await this.fileAdapter.readText(this.path(workspace)));
            return isAgentConsoleThemeName(parsed?.theme) ? parsed.theme : undefined;
        } catch {
            return undefined;
        }
    }

    async save(workspace: string, theme: AgentConsoleThemeName): Promise<void> {
        if (!workspace || !this.fileAdapter) return;
        const directory = this.paths?.dotDirectory(workspace) || resolveAgentConsoleDirectory(this.fileAdapter, workspace);
        await this.fileAdapter.mkdir(directory, { recursive: true });
        await this.fileAdapter.writeText(this.path(workspace), JSON.stringify({ version: 1, theme }, null, 2));
    }

    private path(workspace: string): string {
        return this.paths?.storeFile(workspace, 'theme.json') || resolveAgentConsoleStoreFile(this.fileAdapter!, workspace, 'theme.json');
    }
}

export function mergeAgentConsoleTheme(theme?: AgentConsoleThemeInput | null): AgentConsoleTheme {
    return {
        ...defaultAgentConsoleTheme,
        ...(theme || {})
    };
}

export function resolveAgentConsoleThemeStyles(theme: AgentConsoleTheme): AgentConsoleThemeStyles {
    return Object.keys(theme).reduce((styles, key) => {
        const themeKey = key as keyof AgentConsoleTheme;
        styles[themeKey] = styleTextToObject(theme[themeKey]);
        return styles;
    }, {} as AgentConsoleThemeStyles);
}

export function styleTextToObject(styleText?: string | null): Record<string, string> {
    const style: Record<string, string> = {};
    String(styleText || '')
        .split(';')
        .map(part => part.trim())
        .filter(Boolean)
        .forEach(part => {
            const index = part.indexOf(':');
            if (index === -1) {
                return;
            }
            const key = part.slice(0, index).trim();
            const value = part.slice(index + 1).trim();
            if (key && value) {
                style[key] = value;
            }
        });
    return style;
}
