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
    dialogShell: string;
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
    statusIdleValue: 'color: #6fa37a;',
    statusBusyValue: 'color: #c2a05e;',
    statusErrorLabel: 'color: #c87670;',
    statusErrorValue: 'color: #cf9893;',
    statusNoticeLabel: 'color: #d29922;',
    statusNoticeValue: 'color: #cdb06a;',
    inputTitle: 'color: #8b949e;',
    inputShell: 'background: #1b2128; color: #c9d1d9; padding: 1em 0 1em 1ch;',
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
    sessionsAccent: 'color: #d8a86f;',
    sessionsSelected: 'background: #2a1f12; color: #d8a86f; padding: 0 1ch; font-weight: bold;',
    toolsTitle: 'color: #8b949e;',
    toolsShell: 'color: #c9d1d9;',
    toolsAccent: 'color: #86a9d6;',
    toolRunsTitle: 'color: #8b949e;',
    toolRunsShell: 'color: #c9d1d9;',
    toolRunsAccent: 'color: #86a9d6;',
    messagesTitle: 'color: #8b949e;',
    messagesShell: 'color: #c9d1d9;',
    messagesUser: 'background-color: #1b2128; background: #1b2128; color: #c9d1d9; padding: 0 0 0 1ch;',
    messagesSelected: 'background-color: #13202b; background: #13202b; color: #9fc0e4; padding: 0 0 0 1ch; font-weight: bold;',
    messageDetailLineNumber: 'color: #6e7681;',
    activityTitle: 'color: #8b949e;',
    activityShell: 'color: #c9d1d9;',
    selectTitle: 'color: #8b949e;',
    dialogShell: 'color: #d6dee6; border: 1px solid #30363d; border-radius: 1; background: #161b22; padding: 0 2; max-width: 88ch;',
    selectShell: 'color: #d6dee6; padding: 0 1ch;',
    selectHeader: 'color: #c9d1d9; font-weight: bold;',
    selectHint: 'color: #6e7681;',
    selectOption: 'color: #8b949e; padding: 0 1ch;',
    selectOptionActive: 'color: #7fa6d4; padding: 0 1ch; font-weight: bold;',
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
        '#6fa37a': '#1a7f37', '#c2a05e': '#9a6700', '#c87670': '#cf222e',
        '#cf9893': '#a40e26', '#cdb06a': '#9a6700', '#1b2128': '#f6f8fa',
        '#161b22': '#ffffff', '#30363d': '#d0d7de', '#d8a86f': '#bc4c00',
        '#2a1f12': '#fff1e5', '#86a9d6': '#0969da', '#13202b': '#ddf4ff',
        '#9fc0e4': '#0550ae', '#d6dee6': '#24292f', '#7fa6d4': '#0969da',
        '#6f7c8a': '#57606a'
    }),
    solarized: remapTheme({
        '#8b949e': '#839496', '#c9d1d9': '#93a1a1', '#6e7681': '#657b83',
        '#6fa37a': '#859900', '#c2a05e': '#b58900', '#c87670': '#dc322f',
        '#cf9893': '#cb4b16', '#cdb06a': '#b58900', '#1b2128': '#073642',
        '#161b22': '#002b36', '#30363d': '#586e75', '#d8a86f': '#cb4b16',
        '#2a1f12': '#073642', '#86a9d6': '#268bd2', '#13202b': '#073642',
        '#9fc0e4': '#2aa198', '#d6dee6': '#93a1a1', '#7fa6d4': '#268bd2',
        '#6f7c8a': '#657b83'
    }),
    'high-contrast': remapTheme({
        '#8b949e': '#ffffff', '#c9d1d9': '#ffffff', '#6e7681': '#d0d0d0',
        '#6fa37a': '#00ff66', '#c2a05e': '#ffdd00', '#c87670': '#ff4d4d',
        '#cf9893': '#ff8080', '#cdb06a': '#ffdd00', '#1b2128': '#000000',
        '#161b22': '#000000', '#30363d': '#ffffff', '#d8a86f': '#ff9900',
        '#2a1f12': '#331f00', '#86a9d6': '#00ccff', '#13202b': '#002b3d',
        '#9fc0e4': '#66e0ff', '#d6dee6': '#ffffff', '#7fa6d4': '#00ccff',
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

/** CSS variables consumed by renderer-neutral common components. */
export function resolveAgentConsoleCssVariables(theme?: AgentConsoleTheme | null): string {
    const active = theme || defaultAgentConsoleTheme;
    const color = (style: string, key: 'color' | 'background' = 'color') => styleTextToObject(style)?.[key] || '';
    return [
        `--console-text:${color(active.statusValue) || '#c9d1d9'}`,
        `--console-meta:${color(active.statusLabel) || '#6e7681'}`,
        `--console-accent:${color(active.toolsAccent) || '#86a9d6'}`,
        `--console-selected:${color(active.sessionsSelected) || '#7fa6d4'}`,
        `--console-panel-bg:${color(active.messagesShell, 'background') || 'transparent'}`,
        `--console-dialog-bg:${color(active.dialogShell, 'background') || '#161b22'}`,
        `--console-input-bg:${color(active.inputShell, 'background') || '#161b22'}`
    ].join(';') + ';';
}
