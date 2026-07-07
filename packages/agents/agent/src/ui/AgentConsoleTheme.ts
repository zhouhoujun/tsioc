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
    inputPrompt: string;
    inputCaption: string;
    inputField: string;
    inputButton: string;
    inputHint: string;
    workingTitle: string;
    workingShell: string;
    workingLabel: string;
    workingValue: string;
    toolsTitle: string;
    toolsShell: string;
    toolsAccent: string;
    toolRunsTitle: string;
    toolRunsShell: string;
    toolRunsAccent: string;
    messagesTitle: string;
    messagesShell: string;
    activityTitle: string;
    activityShell: string;
    selectTitle: string;
    selectShell: string;
    selectHeader: string;
    selectHint: string;
    selectOption: string;
    selectOptionActive: string;
}

export type AgentConsoleThemeInput = Partial<AgentConsoleTheme>;

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
    inputShell: 'background: #0d1117; color: #c9d1d9; padding: 0 1; border: 1px solid #30363d;',
    inputPrompt: 'color: #7ee787; font-weight: bold;',
    inputCaption: 'color: #8b949e;',
    inputField: 'background: #0f1419; color: #7ee787;',
    inputButton: 'background: #161b22; color: #c9d1d9; border: 1px solid #30363d;',
    inputHint: 'color: #6e7681;',
    workingTitle: 'color: #8b949e;',
    workingShell: 'color: #c9d1d9;',
    workingLabel: 'color: #6e7681;',
    workingValue: 'color: #c9d1d9;',
    toolsTitle: 'color: #8b949e;',
    toolsShell: 'color: #c9d1d9;',
    toolsAccent: 'color: #79c0ff;',
    toolRunsTitle: 'color: #8b949e;',
    toolRunsShell: 'color: #c9d1d9;',
    toolRunsAccent: 'color: #79c0ff;',
    messagesTitle: 'color: #8b949e;',
    messagesShell: 'background: #0d1117; color: #c9d1d9; padding: 0 1; border: 1px solid #30363d;',
    activityTitle: 'color: #8b949e;',
    activityShell: 'color: #c9d1d9;',
    selectTitle: 'color: #8b949e;',
    selectShell: 'background: #0d1117; color: #c9d1d9; padding: 0 1; border: 1px solid #30363d;',
    selectHeader: 'color: #c9d1d9;',
    selectHint: 'color: #8b949e;',
    selectOption: 'background: #0d1117; color: #c9d1d9; border: 1px solid #30363d;',
    selectOptionActive: 'background: #161b22; color: #79c0ff; border: 1px solid #58a6ff;'
};

export function mergeAgentConsoleTheme(theme?: AgentConsoleThemeInput | null): AgentConsoleTheme {
    return {
        ...defaultAgentConsoleTheme,
        ...(theme || {})
    };
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
