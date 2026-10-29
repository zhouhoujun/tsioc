import { AgentConsoleTheme, AgentConsoleThemeStyles, defaultAgentConsoleTheme, resolveAgentConsoleThemeStyles, styleTextToObject } from './AgentConsoleTheme';
import { AgentConsoleSessionState } from './AgentConsoleSessionState';

export function resolvePanelThemeStyles(state?: AgentConsoleSessionState, theme?: AgentConsoleTheme): AgentConsoleThemeStyles {
    return state?.themeStyles || resolveAgentConsoleThemeStyles(theme || defaultAgentConsoleTheme);
}

export function resolveSectionFrameStyle(baseStyleText: string | Record<string, string>): Record<string, string> {
    return {
        ...(typeof baseStyleText === 'string' ? styleTextToObject(baseStyleText) : baseStyleText),
        'border-top': '1px solid #30363d',
        'border-bottom': '1px solid #30363d',
        padding: '0.35em 0'
    };
}
