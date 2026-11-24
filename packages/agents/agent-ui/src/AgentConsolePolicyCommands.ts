import { AgentDelegationMode, SandboxMode, describeSandboxCapabilities, detectSandboxExecTool } from '@tsdi/agent';
import { formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';
import { explainAgentConsolePermission } from './AgentConsolePermissionInspector';
import { readProjectApprovalAllowRules, saveProjectApprovalAllowRules } from './AgentConsoleApprovalAllowRules';
import { runApprovalRulesCommand, describeApprovalRule, readEffectiveApprovalRules } from './AgentConsoleApprovalRuleCommands';
import { DefaultApprovalStrategy } from '@tsdi/agent';

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
    setYoloMode?(enabled: boolean, persist?: boolean): Promise<void> | void;
    persistSettings?(patch: Record<string, any>): Promise<void> | void;
    /** Runtime approval manager that owns project-scoped allow rules. */
    approvalManager?: any;
    resolvedApprovalManager?: any;
    settingsStore?: any;
    select?(title: string, options: Array<{ label: string; value: string; description?: string }>, index?: number, hint?: string): Promise<string | undefined>;
}

/**
 * Apply one security level across the existing knobs: plan mode denies write
 * tools, yolo auto-approves gated tools, and Full Access also drops the
 * session sandbox. `sandbox: false` skips the sandbox when no session exists
 * yet (startup restores the level before the session is opened).
 *
 * `preservePlan` is used when re-syncing a session after a tab switch: the
 * target session's manual plan mode must survive unless the level itself is
 * `read-only` (which requires plan mode).
 */
export async function applySecurityLevel(
    host: PolicyCommandHost,
    level: AgentConsoleSecurityLevel,
    options: { notify?: boolean; persist?: boolean; sandbox?: boolean; session?: boolean; preservePlan?: boolean } = {}
): Promise<void> {
    host.state.securityLevel = level;
    if (level === 'read-only') {
        if (!host.state.planMode) {
            await host.runPlanCommand('on');
        }
    } else if (host.state.planMode && options.preservePlan !== true) {
        await host.runPlanCommand('off');
    }
    await host.setYoloMode?.(level === 'auto' || level === 'full', options.persist !== false);
    if (options.sandbox !== false && host.state.sessionId) {
        await host.setSessionSandboxMode(host.state.sessionId, (level === 'full' ? 'off' : null) as SandboxMode | null);
    }
    if (options.persist !== false) {
        // The persisted value is the workspace default; a global change also
        // drops the current tab's one-off override so the UI stays truthful.
        host.state.workspaceSecurityLevel = level;
        const sessionId = String(host.state.sessionId || '');
        if (sessionId && host.state.sessionSecurityLevels?.[sessionId]) {
            const next = { ...host.state.sessionSecurityLevels };
            delete next[sessionId];
            host.state.sessionSecurityLevels = next;
        }
        await host.persistSettings?.({ securityLevel: level });
    }
    if (options.notify !== false) {
        host.notify(formatAgentUiNotice(
            host.translator,
            options.session === true ? 'securityLevelSessionSet' : 'securityLevelSet',
            { level: securityLevelText(host.translator, level) }
        ));
    }
}

/**
 * `/permissions session` — apply a level to the current tab only. The value is
 * kept in `sessionSecurityLevels` so switching tabs re-applies it, and writing
 * a workspace level later clears it.
 */
export async function applySessionSecurityLevel(
    host: PolicyCommandHost,
    level: AgentConsoleSecurityLevel,
    options: { notify?: boolean } = {}
): Promise<void> {
    const sessionId = String(host.state.sessionId || '');
    if (sessionId) {
        host.state.sessionSecurityLevels = {
            ...(host.state.sessionSecurityLevels || {}),
            [sessionId]: level
        };
    }
    await applySecurityLevel(host, level, {
        persist: false,
        session: true,
        notify: options.notify !== false
    });
}

/**
 * Re-apply the level a tab owns when it becomes active. Sessions without an
 * override fall back to the workspace default, so a previous tab's `full`
 * override never leaks into them. Plan mode is preserved during the sync.
 */
export async function restoreSessionSecurityLevel(host: PolicyCommandHost, sessionId: string): Promise<void> {
    const state = host.state;
    const override = normalizeSecurityLevel(state.sessionSecurityLevels?.[sessionId]);
    const workspace = normalizeSecurityLevel(state.workspaceSecurityLevel);
    const target = override || workspace;
    if (!target) {
        return;
    }
    // Always re-apply on tab activation: sandbox/plan/yolo are per-session
    // runtime state, so skipping when the level string matches would leak the
    // previous tab's sandbox configuration into this one.
    await applySecurityLevel(host, target, {
        persist: false,
        notify: false,
        preservePlan: true
    });
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

async function showPermissionInspector(host: PolicyCommandHost, tool?: string, resource?: string): Promise<void> {
    const state = host.state;
    const sessionId = String(state.sessionId || '');
    let profile: any;
    if (host.appRpc) {
        const result = await host.appRpc.request('session.archetype.list', {}, host.rpcRequestContext()).catch(() => null);
        const profiles = Array.isArray(result?.profiles) ? result.profiles : [];
        const active = state.activeArchetype || host.runtime?.getSessionArchetype?.(sessionId) || 'build';
        profile = profiles.find((item: any) => item?.name === active);
    }
    if (!profile) {
        const profiles = host.runtime?.listAgentProfiles?.() || [];
        const active = state.activeArchetype || host.runtime?.getSessionArchetype?.(sessionId) || 'build';
        profile = profiles.find((item: any) => item?.name === active);
    }
    const level = normalizeSecurityLevel(state.securityLevel) || (state.yoloMode ? 'auto' : 'ask');
    const sandbox = await host.getSessionSandboxMode(sessionId).catch(() => 'default');
    const permissions = profile?.permissions || {};
    const writePaths = Array.isArray(permissions.writePaths) ? permissions.writePaths.join(', ') : '';
    const allow = Array.isArray(permissions.allow) ? permissions.allow.join(', ') : '';
    const deny = Array.isArray(permissions.deny) ? permissions.deny.join(', ') : '';
    const lines = [
        formatAgentUiNotice(host.translator, 'permissionProfileLine', {
            profile: profile?.name || state.activeArchetype || 'build',
            mode: profile?.mode || 'primary'
        }),
        formatAgentUiNotice(host.translator, 'permissionLevelLine', { level: securityLevelText(host.translator, level) }),
        formatAgentUiNotice(host.translator, 'permissionSandboxLine', { sandbox }),
        formatAgentUiNotice(host.translator, 'permissionPlanLine', {
            value: formatAgentUiNotice(host.translator, state.planMode ? 'permissionOn' : 'permissionOff')
        }),
        formatAgentUiNotice(host.translator, 'permissionReadOnlyLine', {
            value: formatAgentUiNotice(host.translator, profile?.readOnly ? 'permissionOn' : 'permissionOff')
        }),
        formatAgentUiNotice(host.translator, 'permissionAllowLine', { value: allow || '-' }),
        formatAgentUiNotice(host.translator, 'permissionDenyLine', { value: deny || '-' }),
        formatAgentUiNotice(host.translator, 'permissionWritePathsLine', { value: writePaths || '-' })
    ];
    const target = String(tool || '').trim();
    const approvalRules = readEffectiveApprovalRules(host.options);
    lines.push(formatAgentUiNotice(host.translator, 'permissionApprovalRulesLine', { count: approvalRules.length }));
    let v3Rules: any[] = [];
    let v3Decision: any;
    if (host.appRpc) {
        const result = await host.appRpc.request(
            'permission.rules.list',
            { sessionId, ...(target ? { tool: target, resource } : {}) },
            host.rpcRequestContext()
        ).catch(() => null);
        v3Rules = Array.isArray(result?.rules) ? result.rules : [];
        v3Decision = result?.decision;
    } else {
        v3Rules = host.runtime?.listPermissionRules?.(sessionId) || [];
        v3Decision = target ? host.runtime?.inspectPermission?.(target, resource, sessionId) : undefined;
    }
    if (v3Rules.length) {
        const layerCount = (layer: string) => v3Rules.filter(rule => rule?.layer === layer).length;
        lines.push(formatAgentUiNotice(host.translator, 'permissionV3RulesLine', {
            count: v3Rules.length,
            workspace: layerCount('workspace'),
            session: layerCount('session'),
            saved: layerCount('saved')
        }));
    }
    if (target && v3Decision?.matched) {
        lines.push(formatAgentUiNotice(host.translator, 'permissionV3MatchLine', {
            effect: String(v3Decision.effect || '').toUpperCase(),
            layer: v3Decision.layer || '-',
            action: v3Decision.rule?.action || '-',
            resource: v3Decision.rule?.resource || '*'
        }));
    }
    if (target) {
        const decision = explainAgentConsolePermission(target, {
            level,
            planMode: state.planMode,
            readOnly: profile?.readOnly === true,
            allow: permissions.allow,
            deny: permissions.deny,
            writePaths: permissions.writePaths
        });
        const reasonKey = decision.reason === 'deny-rule'
            ? 'permissionReasonDeny'
            : decision.reason === 'read-only'
                ? 'permissionReasonReadOnly'
                : decision.reason === 'allow-list'
                    ? 'permissionReasonAllowList'
                    : decision.reason === 'level'
                        ? 'permissionReasonLevel'
                        : 'permissionReasonDefault';
        lines.push(formatAgentUiNotice(host.translator, 'permissionDecisionLine', {
            tool: target,
            effect: decision.effect.toUpperCase()
        }));
        lines.push(formatAgentUiNotice(host.translator, 'permissionReasonLine', {
            reason: formatAgentUiNotice(host.translator, reasonKey, { pattern: decision.pattern || '' })
        }));
        const approval = new DefaultApprovalStrategy(approvalRules).explain(target, resource || undefined);
        lines.push(approval.decision
            ? formatAgentUiNotice(host.translator, 'permissionApprovalMatchLine', {
                decision: approval.decision.toUpperCase(),
                index: (approval.index ?? 0) + 1,
                rule: approval.rule !== undefined ? describeApprovalRule(approval.rule) : '-'
            })
            : formatAgentUiNotice(host.translator, 'permissionApprovalNoMatchLine'));
    }
    host.state.openTextOverlay(
        formatAgentUiNotice(host.translator, 'permissionsTitle'),
        lines,
        Math.min(24, lines.length)
    );
}

export async function runPermissionsCommand(host: PolicyCommandHost, args: string): Promise<void> {
    const tokens = String(args || '').trim().split(/\s+/).filter(Boolean);
    if (!tokens.length || tokens[0].toLowerCase() === 'status') {
        await showSandboxCapabilities(host);
        return;
    }
    if (tokens[0].toLowerCase() === 'inspect') {
        await showPermissionInspector(host, tokens[1], tokens.slice(2).join(' '));
        return;
    }
    if (tokens[0].toLowerCase() === 'rules' || tokens[0].toLowerCase() === 'rule') {
        await runApprovalRulesCommand(host, tokens.slice(1).join(' '));
        return;
    }
    if (tokens[0].toLowerCase() === 'allow') {
        const action = tokens[1] ? tokens.slice(1).join(' ').trim() : '';
        if (!action) {
            const rules = await readProjectApprovalAllowRules(host);
            host.state.openTextOverlay(
                formatAgentUiNotice(host.translator, 'approvalRulesTitle'),
                rules.length ? rules : [formatAgentUiNotice(host.translator, 'approvalRulesEmpty')],
                Math.max(1, Math.min(24, rules.length))
            );
            return;
        }
        if (action.toLowerCase() === 'clear') {
            await saveProjectApprovalAllowRules(host, []);
            host.notify(formatAgentUiNotice(host.translator, 'approvalRulesCleared'));
            return;
        }
        const current = await readProjectApprovalAllowRules(host);
        await saveProjectApprovalAllowRules(host, [...current.filter((rule: string) => rule !== action), action].slice(-50));
        host.notify(formatAgentUiNotice(host.translator, 'approvalAlwaysAllowedProject', { tool: action }));
        return;
    }
    if (tokens[0].toLowerCase() === 'scanner') {
        const requested = String(tokens[1] || '').toLowerCase();
        const enable = ['on', 'true', 'enable', 'enabled'].includes(requested);
        const disable = ['off', 'false', 'disable', 'disabled'].includes(requested);
        const current = host.options?.policy?.approval?.readOnlyShell === true;
        if (!enable && !disable) {
            host.notify(formatAgentUiNotice(host.translator, 'approvalScannerState', { state: current ? 'on' : 'off' }));
            return;
        }
        if (host.options) {
            host.options.policy = {
                ...(host.options.policy || {}),
                approval: { ...(host.options.policy?.approval || {}), readOnlyShell: enable }
            };
        }
        if (host.appRpc) {
            await host.appRpc.request('settings.ui.set', { readOnlyShell: enable }, host.rpcRequestContext()).catch(() => undefined);
        }
        await host.persistSettings?.({ readOnlyShell: enable });
        host.notify(formatAgentUiNotice(host.translator, enable ? 'approvalScannerEnabled' : 'approvalScannerDisabled'));
        return;
    }
    if (tokens[0].toLowerCase() === 'unattended') {
        const requested = String(tokens[1] || '').toLowerCase();
        const mode = requested === 'deny' || requested === 'allow' ? requested : undefined;
        const clear = ['off', 'clear', 'ask', 'none'].includes(requested);
        const current = host.options?.policy?.approval?.unattended;
        if (!mode && !clear) {
            host.notify(formatAgentUiNotice(host.translator, 'permissionUnattendedState', { state: current || 'ask' }));
            return;
        }
        if (host.options) {
            const approval: Record<string, any> = { ...(host.options.policy?.approval || {}) };
            if (mode) approval.unattended = mode; else delete approval.unattended;
            host.options.policy = { ...(host.options.policy || {}), approval };
        }
        if (host.appRpc) {
            await host.appRpc.request('settings.ui.set', { approvalUnattended: mode ?? null }, host.rpcRequestContext()).catch(() => undefined);
        }
        await host.persistSettings?.({ approvalUnattended: mode ?? null });
        host.notify(formatAgentUiNotice(host.translator, mode ? 'permissionUnattendedSet' : 'permissionUnattendedCleared', { mode: mode || '' }));
        return;
    }
    const area = tokens[0].toLowerCase();
    if (area === 'session') {
        const requested = normalizeSecurityLevel(tokens[1]);
        if (!tokens[1]) {
            if (!host.select) {
                const override = normalizeSecurityLevel(host.state.sessionSecurityLevels?.[String(host.state.sessionId || '')]);
                const workspace = normalizeSecurityLevel(host.state.workspaceSecurityLevel);
                const effective = override || workspace || normalizeSecurityLevel(host.state.securityLevel) || (host.state.yoloMode ? 'auto' : 'ask');
                host.notify(formatAgentUiNotice(host.translator, 'securityLevelSessionCurrent', {
                    level: securityLevelText(host.translator, effective as AgentConsoleSecurityLevel),
                    workspace: workspace ? securityLevelText(host.translator, workspace) : formatAgentUiNotice(host.translator, 'securityLevelWorkspaceDefault')
                }));
                return;
            }
            const current = normalizeSecurityLevel(host.state.securityLevel) || (host.state.yoloMode ? 'auto' : 'ask');
            const selected = await host.select(
                formatAgentUiNotice(host.translator, 'securityLevelSessionTitle'),
                AGENT_CONSOLE_SECURITY_LEVELS.map(level => ({ label: securityLevelText(host.translator, level), value: level })),
                Math.max(0, AGENT_CONSOLE_SECURITY_LEVELS.indexOf(current))
            );
            const picked = normalizeSecurityLevel(selected);
            if (picked) {
                await applySessionSecurityLevel(host, picked);
            }
            return;
        }
        if (!requested) {
            host.notify(formatAgentUiNotice(host.translator, 'securityLevelUsage'));
            return;
        }
        await applySessionSecurityLevel(host, requested);
        return;
    }
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
    // A multi-line capability report is a read-only dialog, not a generic notice.
    const overlay = (host.state as any).openTextOverlay;
    if (typeof overlay === 'function') {
        overlay.call(host.state, formatAgentUiNotice(host.translator, 'permissionsTitle'), lines, Math.min(24, lines.length));
    } else {
        host.notify(lines.join('\n'));
    }
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
