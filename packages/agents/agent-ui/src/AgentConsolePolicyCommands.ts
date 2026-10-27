import { AgentDelegationMode, SandboxMode, describeSandboxCapabilities, detectSandboxExecTool } from '@tsdi/agent';
import { formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';

export type AgentConsoleSecurityLevel = 'read-only' | 'ask' | 'auto' | 'full';

/** Codex-style approval levels, ordered from strictest to most permissive. */
export const AGENT_CONSOLE_SECURITY_LEVELS: AgentConsoleSecurityLevel[] = ['read-only', 'ask', 'auto', 'full'];

const SECURITY_LEVEL_ALIASES: Record<string, AgentConsoleSecurityLevel> = {
    'read-only': 'read-only',
    readonly: 'read-only',
    ask: 'ask',
    'ask-for-approval': 'ask',
    auto: 'auto',
    'approve-for-me': 'auto',
    full: 'full',
    'full-access': 'full'
};

export function normalizeSecurityLevel(value: unknown): AgentConsoleSecurityLevel | undefined {
    return SECURITY_LEVEL_ALIASES[String(value || '').trim().toLowerCase()];
}

function securityLevelText(translator: AgentUiTranslator | null | undefined, level: AgentConsoleSecurityLevel): string {
    const key = level === 'read-only'
        ? 'securityLevelReadOnly'
        : level === 'ask'
            ? 'securityLevelAsk'
            : level === 'auto'
                ? 'securityLevelAuto'
                : 'securityLevelFull';
    return formatAgentUiNotice(translator, key);
}

export interface PolicyCommandHost {
    translator?: AgentUiTranslator | null;
    state: any;
    options: any;
    runtime: any;
    appRpc?: any;
    notify(message: string): void;
    rpcRequestContext(): any;
    getSessionDelegationMode(sessionId: string): Promise<any>;
    getSessionSandboxMode(sessionId: string): Promise<any>;
    setSessionSandboxMode(sessionId: string, mode: SandboxMode | null): Promise<void>;
    runPlanCommand(args: string): Promise<any>;
    setYoloMode?(enabled: boolean): Promise<void> | void;
    persistSettings?(patch: Record<string, any>): Promise<void> | void;
    select?(title: string, options: Array<{ label: string; value: string; description?: string }>, index?: number, hint?: string): Promise<string | undefined>;
}

/**
 * Apply one security level across the existing knobs: plan mode denies write
 * tools, yolo auto-approves gated tools, and Full Access also drops the
 * session sandbox. `sandbox: false` skips the sandbox when no session exists
 * yet (startup restores the level before the session is opened).
 */
export async function applySecurityLevel(
    host: PolicyCommandHost,
    level: AgentConsoleSecurityLevel,
    options: { notify?: boolean; persist?: boolean; sandbox?: boolean } = {}
): Promise<void> {
    host.state.securityLevel = level;
    if (level === 'read-only') {
        if (!host.state.planMode) {
            await host.runPlanCommand('on');
        }
    } else if (host.state.planMode) {
        await host.runPlanCommand('off');
    }
    await host.setYoloMode?.(level === 'auto' || level === 'full');
    if (options.sandbox !== false && host.state.sessionId) {
        await host.setSessionSandboxMode(host.state.sessionId, (level === 'full' ? 'off' : null) as SandboxMode | null);
    }
    if (options.persist !== false) {
        await host.persistSettings?.({ securityLevel: level });
    }
    if (options.notify !== false) {
        host.notify(formatAgentUiNotice(host.translator, 'securityLevelSet', { level: securityLevelText(host.translator, level) }));
    }
}

export async function runDelegationModeCommand(host: PolicyCommandHost, args: string): Promise<void> {
    const sessionId = host.state.sessionId;
    const mode = String(args || '').trim().toLowerCase();
    const modes = ['disabled', 'explicit', 'proactive'];
    try {
        if (!mode || mode === 'default') {
            if (mode === 'default') {
                if (host.appRpc) {
                    await host.appRpc.request('session.delegation_mode.set', { sessionId, mode: 'default' }, host.rpcRequestContext());
                } else {
                    host.runtime.setSessionDelegationMode(sessionId, null);
                }
                host.notify(formatAgentUiNotice(host.translator, 'delegationModeReset'));
                return;
            }
            const current = await host.getSessionDelegationMode(sessionId);
            host.notify(formatAgentUiNotice(host.translator, 'delegationModeCurrent', { current: current, modes: modes.join(' | ') }));
            return;
        }
        if (!modes.includes(mode)) {
            host.notify(formatAgentUiNotice(host.translator, 'invalidDelegationMode', { mode: mode, modes: modes.join(' | ') }));
            return;
        }
        if (host.appRpc) {
            await host.appRpc.request('session.delegation_mode.set', { sessionId, mode }, host.rpcRequestContext());
        } else {
            host.runtime.setSessionDelegationMode(sessionId, mode as AgentDelegationMode);
        }
        host.notify(formatAgentUiNotice(host.translator, 'sessionDelegationModeSet', { sessionId: sessionId, mode: mode }));
    } catch (error) {
        host.notify(formatAgentUiNotice(host.translator, 'failedSetDelegation', { error: error instanceof Error ? error.message : String(error) }));
    }
}

export async function runPermissionsCommand(host: PolicyCommandHost, args: string): Promise<void> {
    const tokens = String(args || '').trim().split(/\s+/).filter(Boolean);
    if (!tokens.length || tokens[0].toLowerCase() === 'status') {
        await showSandboxCapabilities(host);
        return;
    }
    const area = tokens[0].toLowerCase();
    if (area === 'level') {
        const requested = normalizeSecurityLevel(tokens[1]);
        if (!tokens[1]) {
            if (!host.select) {
                host.notify(formatAgentUiNotice(host.translator, 'securityLevelUsage'));
                return;
            }
            const current = normalizeSecurityLevel(host.state.securityLevel) || (host.state.yoloMode ? 'auto' : 'ask');
            const selected = await host.select(
                formatAgentUiNotice(host.translator, 'securityLevelTitle'),
                AGENT_CONSOLE_SECURITY_LEVELS.map(level => ({ label: securityLevelText(host.translator, level), value: level })),
                Math.max(0, AGENT_CONSOLE_SECURITY_LEVELS.indexOf(current))
            );
            const picked = normalizeSecurityLevel(selected);
            if (picked) {
                await applySecurityLevel(host, picked);
            }
            return;
        }
        if (!requested) {
            host.notify(formatAgentUiNotice(host.translator, 'securityLevelUsage'));
            return;
        }
        await applySecurityLevel(host, requested);
        return;
    }
    if (area === 'readonly' || area === 'plan') {
        await host.runPlanCommand(tokens.slice(1).join(' '));
        return;
    }
    if (area !== 'sandbox') {
        host.notify(formatAgentUiNotice(host.translator, 'permissionsReadonlyOff'));
        return;
    }

    const rawMode = String(tokens[1] || '').trim().toLowerCase();
    if (!rawMode) {
        const mode = await host.getSessionSandboxMode(host.state.sessionId);
        host.notify(formatAgentUiNotice(host.translator, 'sandboxMode', { mode: mode }));
        return;
    }
    if (!['default', 'off', 'workspace', 'network-block'].includes(rawMode)) {
        host.notify(formatAgentUiNotice(host.translator, 'sandboxModeMust'));
        return;
    }
    try {
        await host.setSessionSandboxMode(host.state.sessionId, rawMode === 'default' ? null : rawMode as SandboxMode);
        host.notify(formatAgentUiNotice(host.translator, 'sandboxModeSet', { rawMode: rawMode }));
    } catch (error) {
        host.notify(formatAgentUiNotice(host.translator, 'failedSetSandbox', { error: error instanceof Error ? error.message : String(error) }));
    }
}

export async function showSandboxCapabilities(host: PolicyCommandHost): Promise<void> {
    const platform = (globalThis as { process?: { platform?: string } }).process?.platform;
    const probe = await detectSandboxExecTool(platform);
    const proxy = host.options?.sandbox?.proxy;
    const capabilities = describeSandboxCapabilities(platform, probe, !!(proxy?.http || proxy?.https));
    const mode = await host.getSessionSandboxMode(host.state.sessionId).catch(() => 'default');
    const level = normalizeSecurityLevel(host.state.securityLevel) || (host.state.yoloMode ? 'auto' : 'ask');
    const lines = [formatAgentUiNotice(host.translator, 'securityLevelCurrent', { level })];
    lines.push(formatAgentUiNotice(host.translator, 'sandboxCapabilitiesHeader', { mode, platform: platform || formatAgentUiNotice(host.translator, 'sandboxPlatformUnknown'), tool: probe.tool || formatAgentUiNotice(host.translator, 'sandboxProcessFallback') }));
    for (const item of capabilities) {
        lines.push(formatAgentUiNotice(host.translator, item.supported ? 'sandboxCapabilitySupported' : 'sandboxCapabilityDegraded', { capability: item.capability, enforcement: item.enforcement }));
    }
    if (proxy?.required) {
        lines.push(formatAgentUiNotice(host.translator, proxy.http || proxy.https ? 'sandboxProxyConfigured' : 'sandboxProxyMissing'));
    }
    host.notify(lines.join('\n'));
}

export async function runGoalCommand(host: PolicyCommandHost, args: string): Promise<void> {
    const sessionId = host.state.sessionId;
    const [command = 'show', ...rest] = String(args || '').trim().split(/\s+/);
    try {
        if (command === 'create') {
            const parts = rest.join(' ').split('|').map(item => item.trim());
            if (parts.length < 2 || !parts[0] || !parts[1]) { host.notify(formatAgentUiNotice(host.translator, 'goalCreateUsage')); return; }
            const input = { title: parts[0], objective: parts[1], successCriteria: (parts[2] || '').split(';').map(item => item.trim()).filter(Boolean) };
            const goal = host.appRpc ? await host.appRpc.request('goal.create', { sessionId, ...input }, host.rpcRequestContext()) : await host.runtime.createGoal(input, sessionId);
            host.notify(formatAgentUiNotice(host.translator, 'goalCreated', { goalId: goal.id, goalTitle: goal.title })); return;
        }
        if (command === 'list') {
            const goals = host.appRpc ? await host.appRpc.request('goal.list', {}, host.rpcRequestContext()) : await host.runtime.listGoals();
            host.notify(goals.length ? goals.map((goal: any) => `${goal.id} [${goal.status}] ${goal.title}`).join('\n') : formatAgentUiNotice(host.translator, 'noGoals')); return;
        }
        if (command === 'link') {
            const goalId = rest[0]; if (!goalId) { host.notify(formatAgentUiNotice(host.translator, 'goalLinkUsage')); return; }
            if (host.appRpc) await host.appRpc.request('goal.link', { sessionId, goalId }, host.rpcRequestContext()); else await host.runtime.linkSessionGoal(sessionId, goalId);
            host.notify(formatAgentUiNotice(host.translator, 'goalLinked', { goalId: goalId })); return;
        }
        if (command === 'complete' || command === 'reopen') {
            const goal = host.appRpc ? await host.appRpc.request(`goal.${command}`, { sessionId, goalId: rest[0] }, host.rpcRequestContext()) : await (async () => {
                const linked = rest[0] ? await host.runtime.getGoal(rest[0]) : await host.runtime.getSessionGoal(sessionId);
                if (!linked) throw new Error(formatAgentUiNotice(host.translator, 'noGoalLinked'));
                return host.runtime.updateGoal(linked.id, { status: command === 'complete' ? 'completed' : 'active' });
            })();
            host.notify(formatAgentUiNotice(host.translator, 'goalState', { goalId: goal.id, goalStatus: goal.status })); return;
        }
        const goal = host.appRpc ? await host.appRpc.request('goal.get', { sessionId, goalId: command === 'show' ? rest[0] : command }, host.rpcRequestContext()) : await (command === 'show' ? (rest[0] ? host.runtime.getGoal(rest[0]) : host.runtime.getSessionGoal(sessionId)) : host.runtime.getGoal(command));
        host.notify(goal ? `${goal.id} [${goal.status}] ${goal.title}\n${goal.objective}\n${goal.successCriteria.map((item: string) => `- ${item}`).join('\n')}` : formatAgentUiNotice(host.translator, 'noGoalLinkedToSession'));
    } catch (error) { host.notify(formatAgentUiNotice(host.translator, 'goalCommandFailed', { error: error instanceof Error ? error.message : String(error) })); }
}
