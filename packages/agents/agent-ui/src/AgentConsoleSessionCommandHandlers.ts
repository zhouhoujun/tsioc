import type { CommandHandlerContext } from './AgentConsoleCommandHandlerContext';
import type { SnapshotCommandHost } from './AgentConsoleSnapshotCommands';
import { formatAgentUiNotice, formatAgentPanelLabel as panelLabel } from './agent-ui.i18n';
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
    if (!ctx.state.sessions.length) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'sessionsAvailable'));
        return true;
    }
    ctx.state.closeReview();
    ctx.state.closeGitSnapshotDetail();
    ctx.transcriptNavigationController.setFocused(false);
    ctx.state.setSessionsFocused(true);
    return true;
}

// ── /new ─────────────────────────────────────────────────────────────────────

export async function handleNew(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    await ctx.openSession(args || undefined, { scoped: true });
    return true;
}

// ── /sessions ────────────────────────────────────────────────────────────────

export async function handleSessions(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    await ctx.refreshSessions();
    const sessionQuery = String(args || '').trim();
    const currentSession = ctx.state.sessions.find(item => item.current);
    const projectScope = currentSession?.projectKey || currentSession?.projectId;
    ctx.state.setNavFilter({ ...(sessionQuery ? { text: sessionQuery } : {}), ...(projectScope ? { projectId: projectScope } : {}) });
    if (!ctx.state.sessions.length) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'sessionsAvailable'));
        return true;
    }
    ctx.state.closeReview();
    ctx.state.closeGitSnapshotDetail();
    ctx.transcriptNavigationController.setFocused(false);
    ctx.state.setSessionsFocused(true);
    return true;
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
