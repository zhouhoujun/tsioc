import type { CommandHandlerContext } from './AgentConsoleCommandHandlerContext';
import type { SnapshotCommandHost } from './AgentConsoleSnapshotCommands';
import { formatAgentUiNotice, formatAgentPanelLabel as panelLabel } from './agent-ui.i18n';
import { formatSessionAge } from './AgentConsoleFormatters';
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
    const matched = search
        ? candidates.filter(item => [item.title, item.id, item.workspace, item.projectLabel, item.summary]
            .some(value => String(value || '').toLowerCase().includes(search)))
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
            return {
                label: `${title}${currentBadge}${archivedBadge} (${item.messageCount ?? '?'})${pinnedBadge}${formatSessionAge(item.updatedAt)}`,
                value: item.id,
                description: item.workspace || item.summary || '',
                detail: item.summary
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
