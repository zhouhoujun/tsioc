import { AGENT_PERSONALITY_PRESETS } from '@tsdi/agent';

export interface PreferenceCommandHost {
    state: any;
    options: any;
    workspace?: string;
    runtime: any;
    appRpc?: any;
    projectMemory?: any;
    translator?: { translate(key: string): string };
    rpcRequestContext(): any;
    notify(message: string): void;
    pushCommandOutput(command: string, text: string, kind?: any): void;
}

export function resolveProjectMemoryId(host: PreferenceCommandHost): string {
    const consoleOptions = host.options?.ui?.console as Record<string, any> | undefined;
    return String(host.state.projectKey || consoleOptions?.workspace || '').trim();
}

export async function runHooksCommand(host: PreferenceCommandHost): Promise<boolean> {
    let summary: Array<{ stage: string; commands: string[]; functions: string[] }> = [];
    if (host.appRpc) {
        try {
            const result = await host.appRpc.request('hooks.list', {}, host.rpcRequestContext());
            if (Array.isArray(result)) {
                summary = result;
            }
        } catch {
            summary = [];
        }
    }
    if (!summary.length) {
        summary = host.runtime.getHookSummary();
    }
    const stages = summary.filter(entry => entry.commands.length > 0 || entry.functions.length > 0);
    if (!stages.length) {
        host.notify('No hooks registered. Configure hooks in agent options (hooks.beforeTurn, hooks.afterTool, ...).');
        return true;
    }
    const lines = stages.map(entry => {
        const commands = entry.commands.length ? `cmd: ${entry.commands.join('; ')}` : '';
        const functions = entry.functions.length ? `fn: ${entry.functions.join(', ')}` : '';
        return `${entry.stage}${commands ? ` [${commands}]` : ''}${functions ? ` [${functions}]` : ''}`;
    });
    host.pushCommandOutput('/hooks', `Registered hooks:\n${lines.join('\n')}`);
    return true;
}

export async function runMemoriesCommand(host: PreferenceCommandHost, args?: string): Promise<boolean> {
    const raw = String(args || '').trim();
    const parsed = raw.toLowerCase();
    const current = host.options.ui?.memoryInjection !== false;
    if (!parsed) {
        host.notify(`Memory injection ${current ? 'ON' : 'OFF'}. Use /memories list|add|remove or on|off.`);
        return true;
    }
    if (parsed === 'list' || parsed === 'injected') {
        const projectId = resolveProjectMemoryId(host);
        const records: Array<{ key: string; value: string }> = host.appRpc
            ? await host.appRpc.request('project_memory.list', { sessionId: host.state.sessionId }, host.rpcRequestContext()).catch(() => [])
            : (projectId && host.projectMemory ? await host.projectMemory.list(projectId) : []);
        if (!records.length) {
            host.notify(projectId ? 'No project memories.' : 'Project memory requires a project or workspace.');
            return true;
        }
        host.pushCommandOutput('/memories list', `Project memories (${records.length}):\n${records.map(record => `- ${record.key}: ${record.value}`).join('\n')}`);
        return true;
    }
    if (parsed.startsWith('add ')) {
        const projectId = resolveProjectMemoryId(host);
        const body = raw.slice(4).trim();
        const separator = body.indexOf('=') >= 0 ? body.indexOf('=') : body.indexOf(' ');
        if (!projectId || (!host.appRpc && !host.projectMemory) || separator <= 0 || !body.slice(separator + 1).trim()) {
            host.notify('Usage: /memories add <key>=<value>');
            return true;
        }
        const input = { sessionId: host.state.sessionId, projectId, key: body.slice(0, separator).trim(), value: body.slice(separator + 1).trim(), conflict: 'replace' as const };
        const record = host.appRpc
            ? await host.appRpc.request('project_memory.add', input, host.rpcRequestContext())
            : await host.projectMemory!.add(input);
        host.notify(`Project memory saved: ${record.key}`);
        return true;
    }
    if (parsed.startsWith('remove ') || parsed.startsWith('rm ')) {
        const projectId = resolveProjectMemoryId(host);
        const target = raw.slice(raw.indexOf(' ') + 1).trim();
        const result = host.appRpc
            ? await host.appRpc.request('project_memory.remove', { sessionId: host.state.sessionId, target }, host.rpcRequestContext()).catch(() => ({ removed: 0 }))
            : { removed: projectId && host.projectMemory ? await host.projectMemory.remove(projectId, target) : 0 };
        const removed = Number(result?.removed || 0);
        host.notify(removed ? `Removed ${removed} project memory record${removed === 1 ? '' : 's'}.` : `Project memory not found: ${target || '-'}`);
        return true;
    }
    const enabled = parsed === 'on';
    if (parsed !== 'on' && parsed !== 'off') {
        host.notify('Usage: /memories [on|off|list|injected|add <key>=<value>|remove <id-or-key>]');
        return true;
    }
    host.options.ui = { ...(host.options.ui || {}), memoryInjection: enabled };
    host.notify(enabled ? 'Memory injection enabled.' : 'Memory injection disabled.');
    return true;
}

export async function runPersonalityCommand(host: PreferenceCommandHost, args?: string): Promise<boolean> {
    const parsed = String(args || '').trim();
    const parts = parsed.split(/\s+/).filter(Boolean);
    const verb = parts[0]?.toLowerCase() ?? '';
    const names = Object.keys(AGENT_PERSONALITY_PRESETS);
    if (!verb) {
        const active = host.options.ui?.personality;
        host.notify(`Personality: ${active || 'none'}. Available: ${names.join(', ')}. Use /personality set <name> or unset.`);
        return true;
    }
    if (verb === 'list') {
        const lines = names.map(name => `${name === host.options.ui?.personality ? '*' : ' '} ${name}`);
        host.pushCommandOutput('/personality list', `Personality presets:\n${lines.join('\n')}`);
        return true;
    }
    if (verb === 'set') {
        const name = parts[1] ?? '';
        if (!name || !AGENT_PERSONALITY_PRESETS[name]) {
            host.notify(`Unknown personality preset "${name}". Available: ${names.join(', ')}.`);
            return true;
        }
        host.options.ui = { ...(host.options.ui || {}), personality: name };
        host.notify(`Personality set to ${name}.`);
        return true;
    }
    if (verb === 'unset') {
        host.options.ui = { ...(host.options.ui || {}), personality: undefined };
        host.notify(host.translator?.translate('agent.notice.personalityCleared') || 'Personality cleared.');
        return true;
    }
    host.notify(host.translator?.translate('agent.notice.personalityUsage') || 'Usage: /personality [list|set <name>|unset]');
    return true;
}

export async function runDebugConfigCommand(host: PreferenceCommandHost): Promise<boolean> {
    const model = host.options.model || {};
    const ui = host.options.ui || {};
    const profiles = (model.profiles || {}) as Record<string, unknown>;
    const activeProfile = String(model.defaultProfile || host.state.modelProfile || 'default');
    const experimental = (ui.experimental || {}) as Record<string, boolean>;
    const lines = [
        `model: ${String(model.provider || '-')} / ${String(model.model || '-')}`,
        `profile: ${activeProfile}${Object.keys(profiles).length ? ` (available: ${Object.keys(profiles).join(', ')})` : ''}`,
        `ui.title: ${ui.title || '(default)'}`,
        `ui.statusline: ${Array.isArray(ui.statusline) ? ui.statusline.join(', ') : '(default)'}`,
        `ui.memoryInjection: ${ui.memoryInjection !== false ? 'on' : 'off'}`,
        `ui.personality: ${ui.personality || '(none)'}`,
        `ui.queueMode: ${ui.queueMode || 'off'}`,
        `ui.planNudges: ${ui.planNudges !== false ? 'on' : 'off'}`,
        `experimental: ${Object.keys(experimental).length ? Object.entries(experimental).map(([name, enabled]) => `${name}=${enabled ? 'on' : 'off'}`).join(', ') : '(none)'}`,
        `session: ${host.state.sessionId} · workspace: ${host.workspace || '(none)'}`
    ];
    host.pushCommandOutput('/debug-config', `Debug config:\n${lines.join('\n')}`);
    return true;
}
