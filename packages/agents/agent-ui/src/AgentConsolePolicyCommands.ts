import { AgentDelegationMode, SandboxMode, describeSandboxCapabilities, detectSandboxExecTool } from '@tsdi/agent';

export interface PolicyCommandHost {
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
                host.notify('Delegation mode reset to the configured default.');
                return;
            }
            const current = await host.getSessionDelegationMode(sessionId);
            host.notify(`Delegation mode: ${current}. Valid modes: ${modes.join(' | ')}.`);
            return;
        }
        if (!modes.includes(mode)) {
            host.notify(`Invalid delegation mode "${mode}". Valid modes: ${modes.join(' | ')}.`);
            return;
        }
        if (host.appRpc) {
            await host.appRpc.request('session.delegation_mode.set', { sessionId, mode }, host.rpcRequestContext());
        } else {
            host.runtime.setSessionDelegationMode(sessionId, mode as AgentDelegationMode);
        }
        host.notify(`Session ${sessionId} delegation mode set to "${mode}".`);
    } catch (error) {
        host.notify(`Failed to set delegation mode: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function runPermissionsCommand(host: PolicyCommandHost, args: string): Promise<void> {
    const tokens = String(args || '').trim().split(/\s+/).filter(Boolean);
    if (!tokens.length || tokens[0].toLowerCase() === 'status') {
        await showSandboxCapabilities(host);
        return;
    }
    const area = tokens[0].toLowerCase();
    if (area === 'readonly' || area === 'plan') {
        await host.runPlanCommand(tokens.slice(1).join(' '));
        return;
    }
    if (area !== 'sandbox') {
        host.notify('Usage: /permissions [readonly on|off] | [sandbox default|off|workspace|network-block]');
        return;
    }

    const rawMode = String(tokens[1] || '').trim().toLowerCase();
    if (!rawMode) {
        const mode = await host.getSessionSandboxMode(host.state.sessionId);
        host.notify(`Sandbox mode ${mode}.`);
        return;
    }
    if (!['default', 'off', 'workspace', 'network-block'].includes(rawMode)) {
        host.notify('Sandbox mode must be one of: default, off, workspace, network-block.');
        return;
    }
    try {
        await host.setSessionSandboxMode(host.state.sessionId, rawMode === 'default' ? null : rawMode as SandboxMode);
        host.notify(`Sandbox mode set to ${rawMode}.`);
    } catch (error) {
        host.notify(`Failed to set sandbox mode: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function showSandboxCapabilities(host: PolicyCommandHost): Promise<void> {
    const platform = (globalThis as { process?: { platform?: string } }).process?.platform;
    const probe = await detectSandboxExecTool(platform);
    const proxy = host.options?.sandbox?.proxy;
    const capabilities = describeSandboxCapabilities(platform, probe, !!(proxy?.http || proxy?.https));
    const mode = await host.getSessionSandboxMode(host.state.sessionId).catch(() => 'default');
    const lines = [`sandbox ${mode} · ${platform || 'unknown'} · ${probe.tool || 'process fallback'}`];
    for (const item of capabilities) {
        lines.push(`${item.capability} ${item.supported ? 'supported' : 'degraded'} · ${item.enforcement}`);
    }
    if (proxy?.required) {
        lines.push(`proxy required · ${proxy.http || proxy.https ? 'configured' : 'missing'}`);
    }
    host.notify(lines.join('\n'));
}

export async function runGoalCommand(host: PolicyCommandHost, args: string): Promise<void> {
    const sessionId = host.state.sessionId;
    const [command = 'show', ...rest] = String(args || '').trim().split(/\s+/);
    try {
        if (command === 'create') {
            const parts = rest.join(' ').split('|').map(item => item.trim());
            if (parts.length < 2 || !parts[0] || !parts[1]) { host.notify('Usage: /goal create <title> | <objective> | criterion 1; criterion 2'); return; }
            const input = { title: parts[0], objective: parts[1], successCriteria: (parts[2] || '').split(';').map(item => item.trim()).filter(Boolean) };
            const goal = host.appRpc ? await host.appRpc.request('goal.create', { sessionId, ...input }, host.rpcRequestContext()) : await host.runtime.createGoal(input, sessionId);
            host.notify(`Goal ${goal.id} created: ${goal.title}`); return;
        }
        if (command === 'list') {
            const goals = host.appRpc ? await host.appRpc.request('goal.list', {}, host.rpcRequestContext()) : await host.runtime.listGoals();
            host.notify(goals.length ? goals.map((goal: any) => `${goal.id} [${goal.status}] ${goal.title}`).join('\n') : 'No goals.'); return;
        }
        if (command === 'link') {
            const goalId = rest[0]; if (!goalId) { host.notify('Usage: /goal link <goalId>'); return; }
            if (host.appRpc) await host.appRpc.request('goal.link', { sessionId, goalId }, host.rpcRequestContext()); else await host.runtime.linkSessionGoal(sessionId, goalId);
            host.notify(`Goal ${goalId} linked.`); return;
        }
        if (command === 'complete' || command === 'reopen') {
            const goal = host.appRpc ? await host.appRpc.request(`goal.${command}`, { sessionId, goalId: rest[0] }, host.rpcRequestContext()) : await (async () => {
                const linked = rest[0] ? await host.runtime.getGoal(rest[0]) : await host.runtime.getSessionGoal(sessionId);
                if (!linked) throw new Error('No goal linked to this session.');
                return host.runtime.updateGoal(linked.id, { status: command === 'complete' ? 'completed' : 'active' });
            })();
            host.notify(`Goal ${goal.id} is ${goal.status}.`); return;
        }
        const goal = host.appRpc ? await host.appRpc.request('goal.get', { sessionId, goalId: command === 'show' ? rest[0] : command }, host.rpcRequestContext()) : await (command === 'show' ? (rest[0] ? host.runtime.getGoal(rest[0]) : host.runtime.getSessionGoal(sessionId)) : host.runtime.getGoal(command));
        host.notify(goal ? `${goal.id} [${goal.status}] ${goal.title}\n${goal.objective}\n${goal.successCriteria.map((item: string) => `- ${item}`).join('\n')}` : 'No goal linked to this session.');
    } catch (error) { host.notify(`Goal command failed: ${error instanceof Error ? error.message : String(error)}`); }
}
