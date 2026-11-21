import { formatAgentUiNotice, formatAgentPanelLabel as panelLabel, type AgentUiTranslator } from './agent-ui.i18n';
import type { CommandHandlerContext } from './AgentConsoleCommandHandlers';
import type { AgentConsoleSelectOption, AgentConsoleSessionState } from './AgentConsoleSessionState';
import type { AgentConsoleRemoteCenter } from './AgentConsoleRemoteCenterConfig';
import { maskAgentConsoleRemoteUrl } from './AgentConsoleRemoteCenterConfig';
import { probeAgentConsoleRemoteCenter, type AgentConsoleRemoteProbe } from './AgentConsoleRemoteCenterCommands';
import { formatSessionAge } from './AgentConsoleFormatters';

export interface AgentConsoleWorkSession {
    id: string;
    title?: string;
    summary?: string;
    sessionRole?: string;
}

export interface AgentConsoleWorkTask {
    id: string;
    sessionId: string;
    status: string;
    goal: string;
    startedAt?: number;
    updatedAt?: number;
    finishedAt?: number;
}

export interface AgentConsoleWorkRow {
    value: string;
    sessionId: string;
    label: string;
    depth: number;
    status: string;
    detail?: string;
}

export interface AgentConsoleWorkInput {
    currentSessionId: string;
    tree?: Record<string, any> | null;
    tasks?: AgentConsoleWorkTask[];
    sessions?: AgentConsoleWorkSession[];
}

/** Status glyphs keep work rows compact and language-neutral. */
const STATUS_GLYPHS: Record<string, string> = {
    running: '●',
    queued: '○',
    pending: '○',
    blocked: '!',
    failed: '✗',
    error: '✗',
    completed: '✓',
    done: '✓',
    cancelled: '–',
    idle: '·'
};

function statusGlyph(status: string): string {
    return STATUS_GLYPHS[String(status || '').toLowerCase()] || '·';
}

function shortId(id: string): string {
    return String(id || '').length > 18 ? `${String(id).slice(0, 18)}…` : String(id || '?');
}

/**
 * Flatten the persisted delegation tree plus its background tasks into
 * navigable rows. Pure projection: no state mutation, no polling.
 */
export function buildWorkRows(input: AgentConsoleWorkInput): AgentConsoleWorkRow[] {
    const sessions = new Map((input.sessions || []).map(session => [session.id, session]));
    const tasksBySession = new Map<string, AgentConsoleWorkTask[]>();
    for (const task of input.tasks || []) {
        const list = tasksBySession.get(task.sessionId) || [];
        list.push(task);
        tasksBySession.set(task.sessionId, list);
    }
    for (const list of tasksBySession.values()) {
        list.sort((left, right) => (left.startedAt || 0) - (right.startedAt || 0));
    }
    const rows: AgentConsoleWorkRow[] = [];
    const pushTasks = (sessionId: string, depth: number): void => {
        for (const task of tasksBySession.get(sessionId) || []) {
            rows.push({
                value: `task:${task.id}:${task.sessionId}`,
                sessionId: task.sessionId,
                label: `${'  '.repeat(depth)}${statusGlyph(task.status)} ${task.goal || shortId(task.id)}`,
                depth,
                status: task.status,
                detail: task.goal
            });
        }
    };
    const visit = (node: Record<string, any>, depth: number, isRoot: boolean): void => {
        const sessionId = String(node?.sessionId || '');
        if (!sessionId) return;
        const session = sessions.get(sessionId);
        const title = String(session?.title || session?.summary || node?.metadata?.title || '').trim();
        const role = String(session?.sessionRole || node?.kind || (isRoot ? 'main' : 'worker'));
        const status = String(node?.status || (isRoot ? 'running' : '') || '');
        rows.push({
            value: `session:${sessionId}`,
            sessionId,
            label: `${'  '.repeat(depth)}${statusGlyph(status)} ${title || shortId(sessionId)}`,
            depth,
            status,
            detail: role
        });
        pushTasks(sessionId, depth + 1);
        const children = Array.isArray(node?.children) ? node.children : [];
        for (const child of children) {
            visit(child as Record<string, any>, depth + 1, false);
        }
    };
    if (input.tree) {
        visit(input.tree, 0, true);
    } else if (input.currentSessionId) {
        visit({ sessionId: input.currentSessionId, status: 'running' }, 0, true);
    }
    return rows;
}

export interface AgentConsoleWorkHost {
    translator?: AgentUiTranslator | null;
    state: AgentConsoleSessionState;
    sessionService?: {
        getDelegationTree(sessionId: string, options?: { status?: string | string[]; depth?: number }, context?: any): Promise<Record<string, any> | null>;
        listAllBackgroundTasks(options: { sessionId?: string; delegationRoot?: string }, context?: any): Promise<Array<Record<string, any>>>;
    } | null;
    notify(message: string): void;
    openSession(sessionId?: string): Promise<void> | void;
    /** Command-context select port; falls back to the state method for hosts. */
    select?(title: string, options: AgentConsoleSelectOption[], selectedIndex?: number, hint?: string): Promise<string | undefined>;
    /** Cancel one background task (task-row action). */
    cancelTask?(taskId: string): Promise<boolean>;
    /** Spawn a background worker (spawn/retry actions). */
    spawnWorker?(goal: string, profile?: string, workspace?: string): Promise<{ taskId?: string; sessionId?: string; error?: string }>;
    /** Create/lookup a managed worktree for a worker (`/work spawn --worktree`). */
    createWorktree?(name?: string): Promise<string | undefined>;
    /** Existing managed worktrees for interactive worker selection. */
    listWorktrees?(): Promise<Array<{ path: string; branch?: string }>>;
    /** Read-only worker report overlay. */
    openTextOverlay?(title: string, lines: string[], visibleLines?: number): void;
    /** Open the `/remotes` picker from the Work screen. */
    openRemoteCenters?(): void | Promise<void>;
    /** Configured gateways for `/work remote` (read-only aggregation). */
    remoteCenters?: AgentConsoleRemoteCenter[];
    probeRemoteCenter?(remote: AgentConsoleRemoteCenter): Promise<AgentConsoleRemoteProbe>;
}

function workStatusLabel(status: string, translator?: AgentUiTranslator | null): string {
    const key = String(status || '').toLowerCase();
    const map: Record<string, [string, string]> = {
        running: ['statusRunning', 'running'],
        queued: ['workQueued', 'queued'],
        pending: ['workQueued', 'queued'],
        blocked: ['workBlocked', 'blocked'],
        failed: ['statusFailed', 'failed'],
        error: ['statusError', 'error'],
        completed: ['statusCompleted', 'completed'],
        done: ['statusCompleted', 'completed'],
        cancelled: ['statusCancelled', 'cancelled'],
        idle: ['statusIdle', 'idle']
    };
    const entry = map[key];
    if (!entry) return status;
    const [name, fallback] = entry;
    const fromToolRuns = ['statusRunning', 'statusFailed', 'statusError', 'statusCompleted', 'statusCancelled', 'statusIdle'].includes(name)
        ? panelLabel(translator, 'toolRuns', name, fallback)
        : '';
    return fromToolRuns || formatAgentUiNotice(translator, name);
}

function showTaskReport(host: AgentConsoleWorkHost, task: Record<string, any>): void {
    const result = task?.result || {};
    const lines: string[] = [
        formatAgentUiNotice(host.translator, 'workReportGoal', { goal: String(task?.goal || '') }),
        formatAgentUiNotice(host.translator, 'workReportStatus', { status: String(task?.status || '') })
    ];
    const pushList = (key: string, value: unknown): void => {
        const text = Array.isArray(value) ? value.filter(Boolean).join('; ') : String(value || '').trim();
        if (text) lines.push(formatAgentUiNotice(host.translator, key, { value: text }));
    };
    if (task?.error) {
        lines.push(formatAgentUiNotice(host.translator, 'workReportError', { error: String(task.error) }));
    }
    pushList('workReportSummary', result.summary);
    pushList('workReportDiff', result.diff);
    pushList('workReportCompleted', result.completed);
    pushList('workReportNextSteps', result.nextSteps);
    pushList('workReportRisks', result.risks);
    pushList('workReportArtifacts', result.artifacts);
    if (lines.length === 2) {
        lines.push(formatAgentUiNotice(host.translator, 'workReportEmpty'));
    }
    const title = formatAgentUiNotice(host.translator, 'workReportTitle');
    if (host.openTextOverlay) {
        host.openTextOverlay(title, lines, Math.min(24, Math.max(4, lines.length)));
    } else {
        host.notify(lines.join('\n'));
    }
}

/**
 * `/work` — one screen for the current session tree and its background work.
 * Enter opens the owning session; task rows also open their owning session.
 */
export async function runWorkCommandView(host: AgentConsoleWorkHost, args = ''): Promise<void> {
    const tokens = String(args || '').trim().split(/\s+/).filter(Boolean);
    if (tokens[0]?.toLowerCase() === 'remote') {
        await runRemoteWorkView(host);
        return;
    }
    if (tokens[0]?.toLowerCase() === 'spawn') {
        const rest = tokens.slice(1);
        const profileIndex = rest.findIndex(token => token === '--profile' || token === '-p');
        const profile = profileIndex >= 0 ? rest[profileIndex + 1] : undefined;
        const worktreeIndex = rest.findIndex(token =>
            token === '--worktree' || token === '-w'
            || token.startsWith('--worktree=') || token.startsWith('-w=')
        );
        const worktreeToken = worktreeIndex >= 0 ? rest[worktreeIndex] : undefined;
        const inlineWorktreeName = worktreeToken?.includes('=')
            ? worktreeToken.slice(worktreeToken.indexOf('=') + 1).trim()
            : '';
        const worktreeName = inlineWorktreeName || undefined;
        const goal = rest.filter((_token, index) =>
            (profileIndex < 0 || (index !== profileIndex && index !== profileIndex + 1))
            && index !== worktreeIndex
        ).join(' ').trim();
        if (!goal) {
            host.notify(formatAgentUiNotice(host.translator, 'workSpawnUsage'));
            return;
        }
        let workspace: string | undefined;
        if (worktreeIndex >= 0) {
            if (worktreeName) {
                workspace = await host.createWorktree?.(worktreeName);
            } else if (host.listWorktrees && host.select) {
                const items = await host.listWorktrees().catch(() => []);
                const picked = await host.select(
                    formatAgentUiNotice(host.translator, 'workWorktreePickTitle'),
                    [
                        { label: formatAgentUiNotice(host.translator, 'workWorktreePickNew'), value: '__new__' },
                        ...items.map(item => ({
                            label: String(item.path || '').split(/[\\/]/).filter(Boolean).pop() || item.path,
                            value: item.path,
                            description: item.path
                        }))
                    ],
                    0,
                    formatAgentUiNotice(host.translator, 'workWorktreePickHint')
                );
                if (!picked) return;
                workspace = picked === '__new__' ? await host.createWorktree?.() : picked;
            } else {
                workspace = await host.createWorktree?.();
            }
            if (!workspace) {
                host.notify(formatAgentUiNotice(host.translator, 'workWorktreeFailed'));
                return;
            }
        }
        const result = await host.spawnWorker?.(goal, profile, workspace);
        host.notify(result && !result.error
            ? formatAgentUiNotice(host.translator, 'workSpawned', {
                task: result.taskId || result.sessionId || '',
                profile: profile || 'build'
            })
            : formatAgentUiNotice(host.translator, 'workSpawnFailed', { error: result?.error || '' }));
        return;
    }
    if (!host.sessionService) {
        host.notify(formatAgentUiNotice(host.translator, 'workUnavailable'));
        return;
    }
    const sessionId = host.state.sessionId;
    const [tree, tasks] = await Promise.all([
        host.sessionService.getDelegationTree(sessionId).catch(() => null),
        host.sessionService.listAllBackgroundTasks({ delegationRoot: sessionId, sessionId }).catch(() => [])
    ]);
    const rows = buildWorkRows({
        currentSessionId: sessionId,
        tree: tree as Record<string, any> | null,
        tasks: (tasks || []) as any,
        sessions: host.state.sessions as any
    });
    const remoteCount = Array.isArray(host.state.remoteCenters) ? host.state.remoteCenters.length : 0;
    if (!rows.length && !remoteCount) {
        host.notify(formatAgentUiNotice(host.translator, 'workEmpty'));
        return;
    }
    const options: AgentConsoleSelectOption[] = rows.map(row => ({
        label: row.label,
        value: row.value,
        description: row.status ? workStatusLabel(row.status, host.translator) : '',
        detail: row.detail
    }));
    if (remoteCount) {
        // Agent Center aggregation lite: one entry into the read-only remote
        // session lists instead of probing every gateway from this picker.
        options.push({
            label: formatAgentUiNotice(host.translator, 'workRemoteCentersEntry', { count: remoteCount }),
            value: 'remotes',
            description: formatAgentUiNotice(host.translator, 'workRemoteCentersDescription')
        });
    }
    const title = formatAgentUiNotice(host.translator, 'workTitle');
    const hint = formatAgentUiNotice(host.translator, 'workHint');
    const picked = host.select
        ? await host.select(title, options, 0, hint)
        : await host.state.selectAsync(title, options, 0, hint);
    if (!picked) return;
    if (picked === 'remotes') {
        await host.openRemoteCenters?.();
        return;
    }
    const row = rows.find(item => item.value === picked);
    if (!row) return;
    if (row.value.startsWith('task:')) {
        const taskId = row.value.split(':')[1];
        const task = (tasks || []).find(item => String(item?.id || '') === taskId) as Record<string, any> | undefined;
        const hasReport = !!(task?.result || task?.error);
        const actions: AgentConsoleSelectOption[] = [
            { label: formatAgentUiNotice(host.translator, 'workOpenSession'), value: 'open' }
        ];
        if (hasReport) {
            actions.push({ label: formatAgentUiNotice(host.translator, 'workOpenReport'), value: 'report' });
        }
        actions.push({ label: formatAgentUiNotice(host.translator, 'workCancelTask'), value: 'cancel' });
        if (row.status === 'failed') {
            actions.push({ label: formatAgentUiNotice(host.translator, 'workRetryTask'), value: 'retry' });
        }
        const action = host.select
            ? await host.select(
                formatAgentUiNotice(host.translator, 'workTaskTitle'),
                actions,
                0,
                formatAgentUiNotice(host.translator, 'workHint')
            )
            : 'open';
        if (!action) return;
        if (action === 'report') {
            showTaskReport(host, task || { id: taskId, status: row.status, goal: row.detail });
            return;
        }
        if (action === 'retry') {
            const goal = String(row.detail || '').trim();
            if (!goal) {
                host.notify(formatAgentUiNotice(host.translator, 'workSpawnUsage'));
                return;
            }
            const result = await host.spawnWorker?.(goal);
            host.notify(result && !result.error
                ? formatAgentUiNotice(host.translator, 'workSpawned', { task: result.taskId || result.sessionId || '', profile: 'build' })
                : formatAgentUiNotice(host.translator, 'workSpawnFailed', { error: result?.error || '' }));
            return;
        }
        if (action === 'cancel') {
            const taskId = row.value.split(':')[1];
            const cancelled = await host.cancelTask?.(taskId);
            host.notify(formatAgentUiNotice(host.translator, cancelled ? 'workTaskCancelled' : 'workTaskCancelFailed'));
            return;
        }
    }
    await host.openSession(row.sessionId);
}

/** `/work remote` — read-only tree across configured gateways. */
async function runRemoteWorkView(host: AgentConsoleWorkHost): Promise<void> {
    const remotes = Array.isArray(host.remoteCenters) ? host.remoteCenters : [];
    if (!remotes.length) {
        host.notify(formatAgentUiNotice(host.translator, 'remoteCenterEmpty'));
        return;
    }
    if (!host.select || !host.probeRemoteCenter) {
        host.notify(formatAgentUiNotice(host.translator, 'workUnavailable'));
        return;
    }
    const probes = await Promise.all(remotes.map(remote => host.probeRemoteCenter!(remote).catch(error => ({
        remote,
        sessions: [],
        ok: false,
        error: error instanceof Error ? error.message : String(error)
    }))));
    const options: AgentConsoleSelectOption[] = [];
    const sessionsByValue = new Map<string, { probe: AgentConsoleRemoteProbe; session: any }>();
    for (const probe of probes) {
        const url = maskAgentConsoleRemoteUrl(probe.remote.url);
        options.push({
            label: probe.ok
                ? formatAgentUiNotice(host.translator, 'remoteCenterReachable', { name: probe.remote.name, count: probe.sessions.length })
                : formatAgentUiNotice(host.translator, 'remoteCenterUnreachableLabel', { name: probe.remote.name }),
            value: `remote:${probe.remote.name}`,
            description: probe.ok ? url : `${url} · ${probe.error || 'unreachable'}`
        });
        if (!probe.ok) {
            continue;
        }
        for (const session of probe.sessions.slice(0, 20)) {
            const id = String(session?.id || '');
            if (!id) {
                continue;
            }
            const value = `remote-session:${probe.remote.name}:${id}`;
            sessionsByValue.set(value, { probe, session });
            const title = String(session?.title || session?.summary || id).trim();
            const count = Number(session?.messageCount);
            options.push({
                label: `  ${title}${Number.isFinite(count) ? ` (${count})` : ''}${formatSessionAge(session?.updatedAt || session?.lastActiveAt)}`,
                value,
                description: url
            });
        }
    }
    const picked = await host.select(
        formatAgentUiNotice(host.translator, 'workRemoteTitle'),
        options,
        0,
        formatAgentUiNotice(host.translator, 'workHint')
    );
    if (!picked || picked.startsWith('remote:')) {
        return;
    }
    const entry = sessionsByValue.get(picked);
    if (!entry) {
        return;
    }
    const session = entry.session;
    const lines = [
        `URL: ${maskAgentConsoleRemoteUrl(entry.probe.remote.url)}`,
        `ID: ${String(session?.id || '')}`,
        `Title: ${String(session?.title || session?.summary || '')}`,
        `Messages: ${String(Number(session?.messageCount) || 0)}`,
        `Updated${formatSessionAge(session?.updatedAt || session?.lastActiveAt)}`,
        formatAgentUiNotice(host.translator, 'remoteCenterSnapshotHint')
    ];
    host.openTextOverlay?.(
        formatAgentUiNotice(host.translator, 'workRemoteSessionTitle', { name: entry.probe.remote.name }),
        lines,
        Math.min(24, lines.length)
    );
}

/** Command-context adapter for `/work`. */
export function workCommandHost(ctx: CommandHandlerContext): AgentConsoleWorkHost {
    return {
        translator: ctx.translator,
        state: ctx.state as any,
        sessionService: ctx.sessionService as any,
        notify: (message: string) => ctx.notify(message),
        openSession: (sessionId?: string) => ctx.openSession(sessionId),
        select: (title, options, index, hint) => ctx.select(title, options, index, hint),
        openRemoteCenters: async () => { await ctx.executeCommand?.('/remotes'); },
        remoteCenters: (ctx.state as any).remoteCenters || [],
        probeRemoteCenter: (remote: AgentConsoleRemoteCenter) => probeAgentConsoleRemoteCenter(remote),
        cancelTask: async (taskId: string) => {
            const result = await ctx.sessionService?.cancelBackgroundTasks?.([taskId]);
            return !!(result && Array.isArray(result.cancelled) && result.cancelled.includes(taskId));
        },
        spawnWorker: async (goal: string, profile?: string, workspace?: string) => {
            try {
                await ctx.activateTool?.('spawn_agent');
                const output = await ctx.invokeTool?.('spawn_agent', {
                    goal,
                    background: true,
                    ...(profile ? { archetype: profile } : {}),
                    ...(workspace ? { workspace } : {})
                });
                const parsed = typeof output === 'string' && output.trim().startsWith('{')
                    ? (() => { try { return JSON.parse(output); } catch { return undefined; } })()
                    : output;
                return {
                    taskId: parsed?.taskId ? String(parsed.taskId) : undefined,
                    sessionId: parsed?.sessionId ? String(parsed.sessionId) : undefined,
                    error: parsed?.error ? String(parsed.error) : undefined
                };
            } catch (error) {
                return { error: error instanceof Error ? error.message : String(error) };
            }
        },
        createWorktree: async (name?: string) => {
            const requested = String(name || '').trim() || `worker-${Date.now().toString(36)}`;
            try {
                const result = await ctx.state.worktreeCommand?.({ action: 'create', name: requested, activate: false });
                if (result?.path) return result.path;
            } catch {
                // Name collision: reuse the managed worktree if it already exists.
            }
            const list = await ctx.state.worktreeCommand?.({ action: 'list' }).catch(() => undefined);
            const existing = (list?.items || []).find(item => {
                const base = String(item.path || '').split(/[\\/]/).filter(Boolean).pop();
                return item.path === requested || base === requested || item.branch === requested;
            });
            return existing?.path;
        },
        listWorktrees: async () => {
            const result = await ctx.state.worktreeCommand?.({ action: 'list' }).catch(() => undefined);
            return (result?.items || []).map(item => ({ path: item.path, branch: item.branch }));
        },
        openTextOverlay: (title: string, lines: string[], visibleLines?: number) => ctx.state.openTextOverlay(title, lines, visibleLines)
    };
}
