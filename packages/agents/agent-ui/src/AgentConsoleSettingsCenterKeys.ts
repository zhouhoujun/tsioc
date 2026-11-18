import type { TerminalInputSequenceResult } from './console-ports';
import type { AgentConsoleSettingsCenterHost } from './AgentConsoleSettingsCenter';
import { handleSettingsCenterKey } from './AgentConsoleSettingsCenter';
import { decodeGlobalKey } from './AgentConsoleStreamHelpers';

/** Terminal key routing for the settings center (before global keys/composer). */
export async function handleSettingsCenterTerminalInput(
    host: AgentConsoleSettingsCenterHost,
    decoded: TerminalInputSequenceResult,
    raw: string
): Promise<boolean> {
    if (!host.state.settingsCenterOpen) {
        return false;
    }
    const key = decoded.controlKey || decodeGlobalKey(raw);
    const text = decoded.controlKey ? undefined : (decoded.text || raw);
    return handleSettingsCenterKey(host, key, text);
}

/** Browser key routing for the settings center (same mapping as the terminal). */
export async function handleSettingsCenterBrowserKey(
    host: AgentConsoleSettingsCenterHost,
    key: string,
    modifiers: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean }
): Promise<boolean> {
    if (!host.state.settingsCenterOpen) {
        return false;
    }
    const ctrl = !!(modifiers.ctrlKey || modifiers.metaKey);
    const normalized = String(key || '').toLowerCase();
    const arrows: Record<string, string> = { arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right' };
    if (ctrl && normalized === 'r') return handleSettingsCenterKey(host, 'ctrl+r');
    if (arrows[normalized]) return handleSettingsCenterKey(host, arrows[normalized]);
    if (normalized === 'enter') return handleSettingsCenterKey(host, 'return');
    if (normalized === 'escape') return handleSettingsCenterKey(host, 'escape');
    if (normalized === 'backspace') return handleSettingsCenterKey(host, 'backspace');
    if (normalized === 'tab') return handleSettingsCenterKey(host, 'tab');
    if (!ctrl && !modifiers.altKey && String(key || '').length === 1) {
        return handleSettingsCenterKey(host, normalized, String(key));
    }
    return false;
}
