import { formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';

export interface AgentConsoleSteerHost {
    state: {
        steerMode?: boolean;
        setSteerMode(value: boolean): void;
    };
    translator?: AgentUiTranslator | null;
    notify(message: string): void;
    persistSettings(patch: Record<string, any>): Promise<any>;
}

/**
 * `/steer [on|off]` — Enter during a running turn interrupts it and starts a new
 * turn (instead of queueing). Persisted as a workspace preference.
 */
export async function runSteerCommand(host: AgentConsoleSteerHost, args?: string): Promise<boolean> {
    const parsed = String(args || '').trim().toLowerCase();
    let next: boolean;
    if (parsed === 'on' || parsed === 'true' || parsed === '1') {
        next = true;
    } else if (parsed === 'off' || parsed === 'false' || parsed === '0') {
        next = false;
    } else {
        next = host.state.steerMode !== true;
    }
    host.state.setSteerMode(next);
    host.notify(formatAgentUiNotice(host.translator, next ? 'steerEnabled' : 'steerDisabled'));
    try {
        await host.persistSettings({ steerMode: next });
    } catch (error: any) {
        host.notify(error?.message || formatAgentUiNotice(host.translator, 'steerSaveFailed'));
    }
    return true;
}
