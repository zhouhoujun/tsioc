export interface AgentConsoleTheme {
    statusTitle: string;
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
    inputCaption: string;
    inputField: string;
    inputButton: string;
    inputHint: string;
    workingTitle: string;
    workingLabel: string;
    workingValue: string;
    toolsTitle: string;
    toolsAccent: string;
    toolRunsTitle: string;
    toolRunsAccent: string;
    messagesTitle: string;
    activityTitle: string;
    selectTitle: string;
    selectShell: string;
    selectHeader: string;
    selectHint: string;
    selectOption: string;
    selectOptionActive: string;
}

export type AgentConsoleThemeInput = Partial<AgentConsoleTheme>;

export const defaultAgentConsoleTheme: AgentConsoleTheme = {
    statusTitle: 'color: #7d8ca6;',
    statusLabel: 'color: #7d8ca6;',
    statusValue: 'color: #d8e5ff;',
    statusIdleValue: 'color: #8ed3a5;',
    statusBusyValue: 'color: #f4c76f;',
    statusErrorLabel: 'color: #c76b6b;',
    statusErrorValue: 'color: #f3b0b0;',
    statusNoticeLabel: 'color: #c9a25b;',
    statusNoticeValue: 'color: #f1e4b8;',
    inputTitle: 'color: #3aa675;',
    inputShell: 'background: #102218; color: #d8ffea; padding: 1; border: 1px solid #29543d;',
    inputCaption: 'color: #7dd9a8;',
    inputField: 'background: #173323; color: #7ef0a6; border: 1px solid #34845e;',
    inputButton: 'background: #1f6a46; color: #e9fff1; border: 1px solid #3aa675;',
    inputHint: 'color: #75b894;',
    workingTitle: 'color: #c99a58;',
    workingLabel: 'color: #c99a58;',
    workingValue: 'color: #f8f0da;',
    toolsTitle: 'color: #7b5ea7;',
    toolsAccent: 'color: #7b5ea7;',
    toolRunsTitle: 'color: #7b5ea7;',
    toolRunsAccent: 'color: #7b5ea7;',
    messagesTitle: 'color: #3f5f8f;',
    activityTitle: 'color: #a36a2a;',
    selectTitle: 'color: #7d8ca6;',
    selectShell: 'background: #111923; color: #dbe7fb; padding: 1; border: 1px solid #30445f;',
    selectHeader: 'color: #90a8cc;',
    selectHint: 'color: #73859f;',
    selectOption: 'background: #111923; color: #dbe7fb; border: 1px solid #223042;',
    selectOptionActive: 'background: #1f3045; color: #9ed0ff; border: 1px solid #5c86b6;'
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
