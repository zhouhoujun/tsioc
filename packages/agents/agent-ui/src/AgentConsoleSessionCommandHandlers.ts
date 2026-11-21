import type { CommandHandlerContext } from './AgentConsoleCommandHandlerContext';
import type { SnapshotCommandHost } from './AgentConsoleSnapshotCommands';
import { formatAgentUiNotice, formatAgentPanelLabel as panelLabel } from './agent-ui.i18n';
import { rankAgentConsoleFuzzyOptions } from './AgentConsoleFuzzy';
import { formatSessionAge, resolveSessionRecencyBucket } from './AgentConsoleFormatters';
import { runSnapshotsCommand } from './AgentConsoleSnapshotCommands';

export async function handleSession(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    if (args) {
        await ctx.refreshSessions();
        await ctx.openSession(args);
        return true;
    }
    return openSessionsDialog(ctx);
}

// ── /new ─────────────────────────────────────────────────────────────────────

export async function handleNew(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    await ctx.openSession(args || undefined, { scoped: true });
    return true;
}

// ── /sessions ────────────────────────────────────────────────────────────────

/**
 * Rendered by the shared `SelectComponent` (`@tsdi/components/common/select`) via
 * `ctx.select`; this module only projects sessions into its options and does not
 * own dialog chrome or filtering.
 */
async function openSessionsDialog(ctx: CommandHandlerContext, query = ''): Promise<boolean> {
    await ctx.refreshSessions();
    const search = String(query || '').trim().toLowerCase();
    const current = ctx.state.sessions.find(item => item.current);
    const scope = current?.projectKey || current?.projectId || current?.workspace;
    const inScope = scope
        ? ctx.state.sessions.filter(item => (item.projectKey || item.projectId || item.workspace) === scope)
        : ctx.state.sessions;
    const candidates = (inScope.length ? inScope : ctx.state.sessions).slice();
    // Fuzzy pre-filter: `/sessions typo` still finds "TypeScript ...", while an
    // exact/prefix title hit ranks first. The dialog's own live filter uses the
    // same scorer through `setSelectMenuFilter`.
    const matched = search
        ? rankAgentConsoleFuzzyOptions(
            candidates.map(item => ({
                item,
                label: String(item.title || item.id || ''),
                value: String(item.id || ''),
                description: [item.workspace, item.projectLabel, item.summary].filter(Boolean).join(' ')
            })),
            search
        ).map(entry => entry.item)
        : candidates;
    if (!matched.length) {
        ctx.notify(formatAgentUiNotice(
            ctx.translator,
            search ? 'noSessionsMatching' : 'sessionsAvailable',
            search ? { rawQuery: query } : undefined
        ));
        return true;
    }
    matched.sort((left, right) => Number(right.updatedAt || 0) - Number(left.updatedAt || 0));
    void ctx.select(
        panelLabel(ctx.translator, 'sessions', 'title', 'Sessions'),
        matched.map(item => {
            const title = String(item.title || '').trim() || item.id;
            const currentBadge = item.current ? ` [${panelLabel(ctx.translator, 'sessions', 'current', 'current')}]` : '';
            const archivedBadge = item.archived ? ` [${panelLabel(ctx.translator, 'sessions', 'archived', 'archived')}]` : '';
            const pinnedBadge = item.pinned ? ' 📌' : '';
            const bucket = resolveSessionRecencyBucket(item.updatedAt);
            const groupFallback = bucket === 'today'
                ? 'Today'
                : bucket === 'yesterday'
                    ? 'Yesterday'
                    : bucket === 'previous7Days' ? 'Previous 7 days' : 'Older';
            return {
                label: `${title}${currentBadge}${archivedBadge} (${item.messageCount ?? '?'})${pinnedBadge}${formatSessionAge(item.updatedAt)}`,
                value: item.id,
                description: item.workspace || item.summary || '',
                detail: item.summary,
                group: panelLabel(ctx.translator, 'sidebar', bucket, groupFallback)
            };
        }),
        0,
        ctx.state.consoleOptions.selectHint,
        'sessions'
    ).then(selected => {
        if (selected) {
            void ctx.openSession(selected);
        }
    }).catch(() => undefined);
    return true;
}

export async function handleSessions(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    return openSessionsDialog(ctx, args);
}

// ── /resume ──────────────────────────────────────────────────────────────────

export async function handleResume(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) { ctx.notifyBusyState(); return true; }
    const all = await ctx.sessionService?.listSessions(ctx.state.sessionId, undefined, { includeArchived: true }) || [];
    if (!all.length) { ctx.notify(formatAgentUiNotice(ctx.translator, 'sessionsAvailable')); return true; }
    const selected = await ctx.select(panelLabel(ctx.translator, 'select', 'resume', 'Resume session'), all.map(item => ({
        label: `${item.id}${item.archived ? ` ${panelLabel(ctx.translator, 'select', 'archived', '(archived)')}` : ''}`,
        value: item.id,
        description: item.title || item.summary || panelLabel(ctx.translator, 'sessions', 'messageCount', '{count} messages', { count: item.messageCount || 0 })
    })));
    if (selected) await ctx.openSession(selected);
    return true;
}

// ── /archive ─────────────────────────────────────────────────────────────────

export async function handleArchive(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    const archivedSessionId = ctx.state.sessionId;
    if (!archivedSessionId || !ctx.sessionService) { ctx.notify(formatAgentUiNotice(ctx.translator, 'currentSessionArchive')); return true; }
    await ctx.sessionService.setSessionArchived(archivedSessionId, true);
    await ctx.refreshSessions();
    ctx.notify(formatAgentUiNotice(ctx.translator, 'archivedSession', { archivedSessionId: archivedSessionId }));
    return true;
}

// ── /msg ─────────────────────────────────────────────────────────────────────

/** Resolve a full id or a unique id prefix from the visible session list. */
export function resolveCrossSessionTarget(sessions: Array<{ id: string; archived?: boolean }>, token: string): string | undefined {
    const needle = String(token || '').trim().toLowerCase();
    if (!needle) {
        return undefined;
    }
    const exact = sessions.find(item => String(item.id || '').toLowerCase() === needle);
    if (exact) {
        return exact.id;
    }
    const prefixed = sessions.filter(item => !item.archived && String(item.id || '').toLowerCase().startsWith(needle));
    return prefixed.length === 1 ? prefixed[0].id : undefined;
}

/**
 * `/msg [--wake] <session> <text>` — deliver a message to another agent's
 * session. Default is append-only (it will see it on its next run);
 * `--wake` asks the gateway to start a turn immediately.
 */
export async function handleMessage(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    const tokens = String(args || '').trim().split(/\s+/).filter(Boolean);
    const wake = tokens[0] === '--wake' || tokens[0] === '-w';
    if (wake) {
        tokens.shift();
    }
    const targetToken = tokens.shift();
    const text = tokens.join(' ').trim();
    if (!targetToken || !text) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'msgUsage'));
        return true;
    }
    const target = resolveCrossSessionTarget(ctx.state.sessions, targetToken);
    if (!target) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'msgSessionMissing', { sessionId: targetToken }));
        return true;
    }
    if (!ctx.sessionService) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'messageDeliveryUnavailable'));
        return true;
    }
    try {
        const result = await ctx.sessionService.sendSessionMessage(target, text, {
            wake,
            fromSessionId: ctx.state.sessionId
        });
        ctx.notify(formatAgentUiNotice(
            ctx.translator,
            result.woken ? 'messageSentWake' : 'messageSent',
            { sessionId: result.sessionId }
        ));
    } catch (error) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'failedSendMessage', {
            error: error instanceof Error ? error.message : String(error)
        }));
    }
    return true;
}

// ── /delete ──────────────────────────────────────────────────────────────────

/**
 * Permanently remove a session (transcript + rows). Destructive commands keep a
 * confirmation dialog; `/delete <id> confirm` skips it for scripted cleanup.
 */
export async function handleDelete(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    const tokens = String(args || '').trim().split(/\s+/).filter(Boolean);
    const confirmed = tokens.includes('confirm') || tokens.includes('--yes');
    const requested = tokens.find(token => token !== 'confirm' && token !== '--yes');
    const targetId = requested || ctx.state.sessionId;
    if (!targetId || !ctx.sessionService) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'currentSessionDelete'));
        return true;
    }
    if (targetId === ctx.state.sessionId && ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    if (!confirmed) {
        if (!ctx.select) {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'deleteSessionHint'));
            return true;
        }
        const target = ctx.state.sessions.find(item => item.id === targetId);
        const picked = await ctx.select(
            formatAgentUiNotice(ctx.translator, 'deleteSessionTitle'),
            [
                {
                    label: formatAgentUiNotice(ctx.translator, 'deleteSessionYes'),
                    value: 'delete',
                    description: String(target?.title || targetId)
                },
                { label: formatAgentUiNotice(ctx.translator, 'deleteSessionNo'), value: 'cancel' }
            ],
            0,
            formatAgentUiNotice(ctx.translator, 'deleteSessionHint')
        );
        if (picked !== 'delete') {
            return true;
        }
    }
    try {
        await ctx.sessionService.deleteSession(targetId);
    } catch (error) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'failedDeleteSession', {
            error: error instanceof Error ? error.message : String(error)
        }));
        return true;
    }
    await ctx.refreshSessions();
    ctx.notify(formatAgentUiNotice(ctx.translator, 'deletedSession', { sessionId: targetId }));
    if (targetId === ctx.state.sessionId) {
        const next = ctx.state.sessions.find(item => item.id !== targetId && !item.archived);
        await ctx.openSession(next?.id);
    }
    return true;
}

// ── /fork + /side ────────────────────────────────────────────────────────────

export async function handleForkSide(ctx: CommandHandlerContext, args: string, resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) { ctx.notifyBusyState(); return true; }
    const source = ctx.state.sessionId;
    if (!source || !ctx.sessionService) { ctx.notify(formatAgentUiNotice(ctx.translator, 'currentSessionFork')); return true; }
    const messageId = String(args || '').trim() || undefined;
    const forked = await ctx.sessionService.forkSession(source, messageId);
    if (!forked) { ctx.notify(formatAgentUiNotice(ctx.translator, 'failedForkCurrent')); return true; }
    await ctx.openSession(forked);
    ctx.notify(formatAgentUiNotice(ctx.translator, resolved.command === '/side' ? 'openedSideSession' : 'forkedSession', { forked }));
    return true;
}

// ── /pin + /unpin ────────────────────────────────────────────────────────────

export async function handlePinUnpin(ctx: CommandHandlerContext, _args: string, resolved: { command: string; matches: string[] }): Promise<boolean> {
    const pinSessionId = ctx.state.sessionId;
    if (!pinSessionId || !ctx.sessionService) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'currentSessionPin'));
        return true;
    }
    const pin = resolved.command === '/pin';
    await ctx.sessionService.setSessionPinned(pinSessionId, pin);
    await ctx.refreshSessions();
    ctx.notify(pin ? formatAgentUiNotice(ctx.translator, 'pinnedSession', { sessionId: pinSessionId }) : formatAgentUiNotice(ctx.translator, 'unpinnedSession', { sessionId: pinSessionId }));
    return true;
}

// ── /snapshot ────────────────────────────────────────────────────────────────

export async function handleSnapshot(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    const snapshotSessionId = ctx.state.sessionId;
    if (!snapshotSessionId || !ctx.sessionService) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'currentSessionSnapshot'));
        return true;
    }
    const label = String(args || '').trim() || undefined;
    const snapshotId = await ctx.sessionService.createSessionSnapshot(snapshotSessionId, label);
    if (snapshotId) {
        ctx.pushCommandOutput('/snapshot', formatAgentUiNotice(ctx.translator, 'snapshotCreatedOutput', { id: snapshotId }));
    } else {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'snapshotCreationFailed'));
    }
    return true;
}

// ── /snapshots ───────────────────────────────────────────────────────────────

export async function handleSnapshots(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    return runSnapshotsCommand(ctx as unknown as SnapshotCommandHost, args);
}

// ── /toolruns ────────────────────────────────────────────────────────────────
