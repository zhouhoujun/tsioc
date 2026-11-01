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

export const DIALOG_CLOSE_STYLE = { 'text-align': 'right', color: '#8b949e' };

/** Dialog shell used by the composer-anchored overlays (menus, approvals, questions). */
export function menuShellStyle(theme: AgentConsoleTheme): Record<string, string> {
    const style = styleTextToObject(theme.dialogShell);
    delete style['max-width'];
    style['border-bottom'] = 'none';
    const input = styleTextToObject(theme.inputShell);
    const background = input.background || input['background-color'];
    if (background) style.background = background;
    return style;
}
