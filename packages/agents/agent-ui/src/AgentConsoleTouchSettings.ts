import { formatAgentUiLabel, formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';

/** Host surface for the touch-mode settings toggle. */
export interface AgentConsoleTouchSettingsHost {
    state: any;
    options: any;
    translator?: AgentUiTranslator | null;
    notify(message: string): void;
    persistSettings(patch: Record<string, any>): Promise<any>;
}

export function isAgentConsoleTouchModeEnabled(host: { state: any }): boolean {
    return host.state?.consoleOptions?.touchMode === true;
}

/** General-tab option row; keeps the settings command file within its budget. */
export function touchModeSettingsOption(host: AgentConsoleTouchSettingsHost, onOff: (value: boolean) => string): any {
    return {
        label: formatAgentUiLabel(host.translator, 'agent.menu.settings.touchLabel', 'Touch mode: {state}', {
            state: onOff(isAgentConsoleTouchModeEnabled(host))
        }),
        value: 'touch',
        description: formatAgentUiLabel(host.translator, 'agent.menu.settings.touchDescription', 'swipe scrolls; taps still click')
    };
}

export async function toggleAgentConsoleTouchMode(host: AgentConsoleTouchSettingsHost): Promise<boolean> {
    const enabled = !isAgentConsoleTouchModeEnabled(host);
    // Replace the options instance instead of mutating the shared default; the
    // TUI surface reads touchMode live from this object.
    host.state.consoleOptions = { ...host.state.consoleOptions, touchMode: enabled };
    host.options.ui = {
        ...(host.options.ui || {}),
        console: { ...(host.options.ui?.console || {}), touchMode: enabled }
    };
    try {
        await host.persistSettings({ touchMode: enabled });
    } catch {
        host.notify(formatAgentUiNotice(host.translator, 'touchModeSaveFailed'));
        return true;
    }
    host.notify(enabled
        ? formatAgentUiNotice(host.translator, 'touchModeEnabled')
        : formatAgentUiNotice(host.translator, 'touchModeDisabled'));
    return true;
}
