import { ExchangeMetricsSnapshot } from '@tsdi/agent';
import { agentConsoleThemeNames } from './AgentConsoleTheme';
import { defaultAgentConsoleStatusline, isAgentConsoleStatuslineField, normalizeAgentConsoleStatusline } from './AgentConsoleStatusline';
import { defaultAgentConsoleTitle, isAgentConsoleTitleField, normalizeAgentConsoleTitle } from './AgentConsoleTitle';

export interface AgentConsoleRuntimeHost {
    state: any;
    options: any;
    runtime: any;
    appRpc?: any;
    rawModeStore?: any;
    activeThemeName: string;
    notify(message: string): void;
    select(title: string, options: any[], index: number, hint?: string): Promise<string | undefined>;
    pushCommandOutput(command: string, text: string, kind?: any): void;
    applyTheme(name: string): Promise<boolean>;
    applyStatusline(fields: any[]): Promise<boolean>;
    applyTitleFields(fields: any[]): Promise<boolean>;
    activateModelProfile(profile: string): Promise<any>;
    resolveHistoryWorkspace(): string;
    getSessionSandboxMode(sessionId: string): Promise<any>;
    getSessionDelegationMode(sessionId: string): Promise<any>;
    rpcRequestContext(): any;
}

export async function runThemeCommand(host: AgentConsoleRuntimeHost, args?: string): Promise<boolean> {
    const requested = String(args || '').trim().toLowerCase();
    if (!requested) {
        const selected = await host.select(
            'Theme',
            agentConsoleThemeNames.map(name => ({
                label: `${name === host.activeThemeName ? '● ' : '  '}${name}`,
                value: name,
                description: name === host.activeThemeName ? 'active theme' : 'apply and save'
            })),
            Math.max(0, agentConsoleThemeNames.indexOf(host.activeThemeName as any)),
            'enter apply   esc cancel'
        );
        if (!selected) return true;
        return host.applyTheme(selected);
    }
    return host.applyTheme(requested);
}

export async function runStatusCommand(host: AgentConsoleRuntimeHost): Promise<void> {
    const state = host.state;
    const sessionId = state.sessionId;
    let planMode = state.planMode;
    let sandboxMode = await host.getSessionSandboxMode(sessionId).catch(() => 'default');
    let delegationMode = await host.getSessionDelegationMode(sessionId).catch(() => 'explicit');
    let archetype = host.runtime?.getSessionArchetype?.(sessionId) ?? 'build';
    let exchangeText = '';
    let exchangeCounts: ExchangeMetricsSnapshot | null = null;
    if (host.appRpc) {
        const result = await host.appRpc.request('session.plan_mode.get', { sessionId }, host.rpcRequestContext()).catch(() => null);
        planMode = result?.enabled === true;
        const archetypeResult = await host.appRpc.request('session.archetype.get', { sessionId }, host.rpcRequestContext()).catch(() => null);
        if (archetypeResult?.archetype) {
            archetype = String(archetypeResult.archetype);
        }
        const metrics = await host.appRpc.request('command_exchange.metrics', {}, host.rpcRequestContext()).catch(() => null);
        if (metrics?.dropped != null) {
            exchangeCounts = { dropped: metrics.dropped, stale: metrics.stale, duplicate: metrics.duplicate, unauthorized: metrics.unauthorized };
            exchangeText = ` · exchange d${metrics.dropped} s${metrics.stale} dup${metrics.duplicate} u${metrics.unauthorized}`;
        }
    }
    const model = state.modelProfile || state.model || 'default';
    const planModeText = planMode ? 'ON (read-only)' : 'off';
    host.pushCommandOutput('/status', `session ${sessionId} · model ${model} · archetype ${archetype} · plan mode ${planModeText} · sandbox ${sandboxMode} · delegation ${delegationMode}${exchangeText}`);
    state.openTextOverlay('status', [
        `session: ${sessionId}`,
        `model: ${model}`,
        `archetype: ${archetype}`,
        `plan mode: ${planModeText}`,
        `sandbox: ${sandboxMode}`,
        `delegation: ${delegationMode}`,
        ...(exchangeCounts ? [`exchange: dropped ${exchangeCounts.dropped} · stale ${exchangeCounts.stale} · duplicate ${exchangeCounts.duplicate} · unauthorized ${exchangeCounts.unauthorized}`] : []),
    ]);
}

export async function runFastCommand(host: AgentConsoleRuntimeHost, args?: string): Promise<boolean> {
    const requested = String(args || '').trim().toLowerCase();
    const profiles = (host.options.model?.profiles || {}) as Record<string, unknown>;
    if (requested && !profiles[requested]) {
        host.notify(`Unknown model profile "${requested}". Available: ${Object.keys(profiles).join(', ') || 'none'}.`);
        return true;
    }
    const target = requested || (host.state.modelProfile === 'fast' ? 'strong' : 'fast');
    if (!profiles[target]) {
        host.notify(`No "${target}" model profile configured. Configure model.profiles.fast / model.profiles.strong.`);
        return true;
    }
    await host.activateModelProfile(target);
    return true;
}

export async function runRawModeCommand(host: AgentConsoleRuntimeHost, args?: string): Promise<boolean> {
    const requested = String(args || '').trim().toLowerCase();
    if (requested === 'on' || requested === 'show') {
        host.state.setRawMode(true);
    } else if (requested === 'off' || requested === 'hide') {
        host.state.setRawMode(false);
    } else {
        host.state.setRawMode(!host.state.rawMode);
    }
    try {
        await host.rawModeStore?.save(host.resolveHistoryWorkspace(), host.state.rawMode);
    } catch (error: any) {
        host.notify(error?.message || 'Failed to save raw mode.');
        return true;
    }
    host.notify(host.state.rawMode ? 'Raw mode enabled (plain text scrollback).' : 'Raw mode disabled (markdown rendering).');
    return true;
}

export async function runStatuslineCommand(host: AgentConsoleRuntimeHost, args?: string): Promise<boolean> {
    const parsed = String(args || '').trim();
    if (!parsed || parsed.toLowerCase() === 'list') {
        const current = host.state.statusline;
        host.pushCommandOutput('/statusline list', `Statusline: ${current.join(', ')}. Use /statusline set field1,field2 or unset field.`);
        return true;
    }
    const [verb, ...rest] = parsed.split(/\s+/);
    const requested = rest.join(' ').split(',').map(part => part.trim()).filter(Boolean);
    if (verb.toLowerCase() === 'set') {
        if (!requested.length) {
            host.notify('Usage: /statusline set model,context,git-branch,tokens,session,workspace,agent');
            return true;
        }
        const invalid = requested.filter(field => !isAgentConsoleStatuslineField(field));
        if (invalid.length) {
            host.notify(`Unknown statusline field "${invalid[0]}". Available: ${defaultAgentConsoleStatusline.join(', ')}.`);
            return true;
        }
        return host.applyStatusline(normalizeAgentConsoleStatusline(requested));
    }
    if (verb.toLowerCase() === 'unset') {
        const remaining = host.state.statusline.filter((field: string) => !requested.includes(field));
        if (remaining.length === host.state.statusline.length) {
            host.notify(`Field "${requested[0]}" is not in the statusline. Current: ${host.state.statusline.join(', ')}.`);
            return true;
        }
        return host.applyStatusline(normalizeAgentConsoleStatusline(remaining));
    }
    host.notify('Usage: /statusline [list|set field1,field2|unset field]');
    return true;
}

export async function runTitleCommand(host: AgentConsoleRuntimeHost, args?: string): Promise<boolean> {
    const parsed = String(args || '').trim();
    if (!parsed || parsed.toLowerCase() === 'list') {
        const current = host.state.titleFields;
        host.pushCommandOutput('/title list', `Window title: ${current.join(', ')}. Use /title set field1,field2 or unset field.`);
        return true;
    }
    const [verb, ...rest] = parsed.split(/\s+/);
    const requested = rest.join(' ').split(',').map(part => part.trim()).filter(Boolean);
    if (verb.toLowerCase() === 'set') {
        if (!requested.length) {
            host.notify('Usage: /title set project,status,thread,branch,model,context,task');
            return true;
        }
        const invalid = requested.filter(field => !isAgentConsoleTitleField(field));
        if (invalid.length) {
            host.notify(`Unknown window title field "${invalid[0]}". Available: ${defaultAgentConsoleTitle.join(', ')}.`);
            return true;
        }
        return host.applyTitleFields(normalizeAgentConsoleTitle(requested));
    }
    if (verb.toLowerCase() === 'unset') {
        const remaining = host.state.titleFields.filter((field: string) => !requested.includes(field));
        if (remaining.length === host.state.titleFields.length) {
            host.notify(`Field "${requested[0]}" is not in the window title. Current: ${host.state.titleFields.join(', ')}.`);
            return true;
        }
        return host.applyTitleFields(normalizeAgentConsoleTitle(remaining));
    }
    host.notify('Usage: /title [list|set field1,field2|unset field]');
    return true;
}
