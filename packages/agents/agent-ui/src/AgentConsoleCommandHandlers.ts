/**
 * Command dispatch handlers for AgentConsoleComponent (P199 batch F).
 *
 * Every slash-command that was previously inlined in the 89-case
 * `handleCommand` switch is now an independent exported function
 * receiving a minimal structural context (`CommandHandlerContext`).
 * The component retains thin delegation via `buildCommandContext()`.
 */

import type {
    AgentConsoleApprovalRequest,
    AgentConsoleCommandOutputEntry,
    AgentConsolePendingAttachment,
    AgentConsoleSelectOption,
    AgentConsoleSessionItem
} from './AgentConsoleSessionState';
import { buildAgentConsoleHelpOptions } from './AgentConsoleCommandRegistry';
import type { AgentConsoleParsedCommandArguments } from './AgentConsoleCommandRegistry';
import type { AgentConsoleSessionService } from './AgentConsoleSessionService';
import type { NavFilter, NavSelection, SessionSearchMatch } from '@tsdi/agent';
import { AGENT_CONSOLE_OVERLAY_HINTS, AGENT_CONSOLE_OVERLAY_TITLES } from './AgentConsoleOverlayPresenter';
import type { CommandHandlerContext } from './AgentConsoleCommandHandlerContext';
export type { CommandHandlerContext } from './AgentConsoleCommandHandlerContext';
import { formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';

// ── Command handler type ─────────────────────────────────────────────────────

export type CommandHandler = (
    ctx: CommandHandlerContext,
    args: string,
    resolved: { command: string; matches: string[]; parsedArgs?: AgentConsoleParsedCommandArguments }
) => Promise<boolean>;

function canonicalArgsOf(meta: { parsedArgs?: AgentConsoleParsedCommandArguments }, raw: string): string {
    return meta.parsedArgs ? meta.parsedArgs.resolved.join(' ') : raw;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseTrendTokens(args: string, sep = ' '): { sessionId?: string; bucketSize?: number; maxBuckets?: number } {
    const tokens = args.split(sep).filter(Boolean);
    let sessionId: string | undefined;
    let bucketSize: number | undefined;
    let maxBuckets: number | undefined;
    for (const token of tokens) {
        if (/^\d+d$/.test(token)) {
            bucketSize = parseInt(token, 10) * 86400000;
        } else if (/^\d+$/.test(token) && !sessionId) {
            sessionId = token;
        } else if (/^\d+$/.test(token) && sessionId && !maxBuckets) {
            maxBuckets = parseInt(token, 10);
        }
    }
    return { sessionId, bucketSize, maxBuckets };
}

// ── Handler functions ────────────────────────────────────────────────────────

async function handleHelp(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    const helpSelection = await ctx.select('Help', buildAgentConsoleHelpOptions(), 0, ctx.state.consoleOptions.selectHint);
    if (helpSelection) {
        await ctx.handleMenuSelection(helpSelection);
    }
    return true;
}

async function handleModel(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    if (args) {
        const modelArgs = String(args || '').trim();
        if (modelArgs.toLowerCase().startsWith('once')) {
            const profileName = modelArgs.slice(4).trim();
            if (!profileName) {
                ctx.notify(formatAgentUiNotice(ctx.translator, 'modelOnceUsage'));
                return true;
            }
            await ctx.queueNextTurnModelProfile(profileName);
            return true;
        }
        await ctx.activateModelProfile(args);
        return true;
    }
    await ctx.openModelSwitcher();
    return true;
}

async function handleProvider(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    await ctx.startProviderWizard?.();
    return true;
}

// ── Simple guard + delegate handlers ─────────────────────────────────────────

async function guardDelegate(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }, method: (args: string) => Promise<boolean>): Promise<boolean> {
    if (ctx.isTurnInProgress()) { ctx.notifyBusyState(); return true; }
    return method(args);
}

async function guardDelegateNoArgs(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }, method: () => Promise<boolean>): Promise<boolean> {
    if (ctx.isTurnInProgress()) { ctx.notifyBusyState(); return true; }
    return method();
}

// ── /pwd ─────────────────────────────────────────────────────────────────────

async function handlePwd(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    ctx.notify(ctx.workspace);
    return true;
}

// ── /tools ───────────────────────────────────────────────────────────────────

async function handleTools(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (args) {
        await ctx.activateSelectedToolActionHandler(args);
        return true;
    }
    if (!ctx.state.tools.length) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'toolsAvailable'));
        return true;
    }
    ctx.state.setSessionsFocused(false);
    ctx.transcriptNavigationController.setFocused(false);
    ctx.state.closeMessageDetail();
    ctx.state.closeReview();
    ctx.state.closeGitSnapshotDetail();
    ctx.state.setToolsFocused(true);
    return true;
}

// ── /clear ───────────────────────────────────────────────────────────────────

async function handleClear(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    await ctx.openSession(undefined);
    ctx.notify(formatAgentUiNotice(ctx.translator, 'startedNewSession'));
    return true;
}

// ── /approve + /deny ────────────────────────────────────────────────────────

async function handleApproveDeny(ctx: CommandHandlerContext, args: string, resolved: { command: string; matches: string[] }): Promise<boolean> {
    const isApprove = resolved.command === '/approve';
    if (isApprove && String(args || '').trim().toLowerCase() === 'retry') {
        return ctx.runApproveRetryCommand();
    }
    const pend = await ctx.getPendingApprovals(ctx.state.sessionId);
    if (!pend.length) { ctx.notify(formatAgentUiNotice(ctx.translator, 'pendingApprovals')); return true; }
    if (args) {
        const exact = pend.find((item: any) => item.id === args);
        const matches = exact ? [exact] : pend.filter((item: any) => item.id.startsWith(args));
        if (matches.length === 1) {
            const applied = await ctx.applyApprovalDecision(isApprove ? 'approve' : 'deny', matches[0].id);
            ctx.notify(applied
                ? formatAgentUiNotice(ctx.translator, 'approvalApplied', { decision: formatAgentUiNotice(ctx.translator, isApprove ? 'approvalDecisionApprove' : 'approvalDecisionDeny'), tool: matches[0].toolName, id: matches[0].id.slice(0, 8) })
                : formatAgentUiNotice(ctx.translator, 'approvalNoLongerPending', { id: matches[0].id.slice(0, 8) }));
        } else {
            ctx.notify(matches.length > 1
                ? formatAgentUiNotice(ctx.translator, 'approvalIdAmbiguous', { id: args })
                : formatAgentUiNotice(ctx.translator, 'approvalIdNotFound', { id: args }));
        }
        return true;
    }
    const req = pend.length === 1 ? pend[0] : null;
    if (!req) {
        const sel = await ctx.select(isApprove ? 'Approve' : 'Deny',
            pend.map((r: any) => ({ label: r.toolName + ' (' + r.id.slice(0, 8) + ')', value: r.id, description: r.reason })));
        if (!sel) { return true; }
        const found = pend.find((r: any) => r.id === sel);
        if (found) {
            const applied = await ctx.applyApprovalDecision(isApprove ? 'approve' : 'deny', found.id);
            ctx.notify(applied
                ? formatAgentUiNotice(ctx.translator, 'approvalApplied', { decision: formatAgentUiNotice(ctx.translator, isApprove ? 'approvalDecisionApprove' : 'approvalDecisionDeny'), tool: found.toolName, id: found.id.slice(0, 8) })
                : formatAgentUiNotice(ctx.translator, 'approvalNoLongerPending', { id: found.id.slice(0, 8) }));
        }
        return true;
    }
    if (req) {
        const applied = await ctx.applyApprovalDecision(isApprove ? 'approve' : 'deny', req.id);
        ctx.notify(applied
            ? formatAgentUiNotice(ctx.translator, 'approvalApplied', { decision: formatAgentUiNotice(ctx.translator, isApprove ? 'approvalDecisionApprove' : 'approvalDecisionDeny'), tool: req.toolName, id: req.id.slice(0, 8) })
            : formatAgentUiNotice(ctx.translator, 'approvalNoLongerPending', { id: req.id.slice(0, 8) }));
    }
    return true;
}

// ── /exit ────────────────────────────────────────────────────────────────────

async function handleQuitExit(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    await ctx.requestTerminalExit(ctx.closingSessionMessage());
    return true;
}

// ── /multiline ───────────────────────────────────────────────────────────────

async function handleMultiline(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    ctx.multilineMode = !ctx.multilineMode;
    if (!ctx.multilineMode) { ctx.draftLines = []; }
    return true;
}

// ── /cancel ──────────────────────────────────────────────────────────────────

async function handleCancel(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        const cancelled = await ctx.sessionService?.cancelTurn(ctx.state.sessionId) ?? false;
        ctx.notify(cancelled
            ? formatAgentUiNotice(ctx.translator, 'cancellingCurrentTurn')
            : formatAgentUiNotice(ctx.translator, 'nothingToCancel'));
        return true;
    }
    ctx.draftLines = [];
    ctx.multilineMode = false;
    ctx.shellDraftLines = [];
    ctx.shellMultilineMode = false;
    return true;
}

// ── /send ────────────────────────────────────────────────────────────────────

async function handleSend(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (!ctx.draftLines.length) { return true; }
    await ctx.submitMultilineDraft();
    return true;
}

// ── /copy ────────────────────────────────────────────────────────────────────

async function handleCopy(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (args) {
        switch (args) {
            case 'input':
                await ctx.copyFocusedTextActionHandler(ctx.state.input, 'input');
                return true;
            case 'workspace':
                await ctx.copyFocusedTextActionHandler(ctx.state.workspace, 'workspace');
                return true;
            case 'session':
                await ctx.copyFocusedTextActionHandler(ctx.state.sessionId, 'session');
                return true;
            case 'model':
                await ctx.copyFocusedTextActionHandler(
                    [ctx.state.provider, ctx.state.model].filter(Boolean).join(' / '),
                    'model'
                );
                return true;
            default:
                ctx.notify(formatAgentUiNotice(ctx.translator, 'nothingCopy'));
                return true;
        }
    }
    const msgs = ctx.state.messages;
    for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'assistant' && msgs[i].content) {
            await ctx.copyFocusedTextActionHandler(msgs[i].content, 'assistant message');
            return true;
        }
    }
    ctx.notify(formatAgentUiNotice(ctx.translator, 'nothingCopy'));
    return true;
}

// ── /session ─────────────────────────────────────────────────────────────────

async function handleSession(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
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

async function handleNew(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    await ctx.openSession(args || undefined);
    return true;
}

// ── /sessions ────────────────────────────────────────────────────────────────

async function handleSessions(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    await ctx.refreshSessions();
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

async function handleResume(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) { ctx.notifyBusyState(); return true; }
    const all = await ctx.sessionService?.listSessions(ctx.state.sessionId, undefined, { includeArchived: true }) || [];
    if (!all.length) { ctx.notify(formatAgentUiNotice(ctx.translator, 'sessionsAvailable')); return true; }
    const selected = await ctx.select('Resume session', all.map(item => ({
        label: `${item.id}${item.archived ? ' (archived)' : ''}`,
        value: item.id,
        description: item.title || item.summary || `${item.messageCount || 0} messages`
    })));
    if (selected) await ctx.openSession(selected);
    return true;
}

// ── /archive ─────────────────────────────────────────────────────────────────

async function handleArchive(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    const archivedSessionId = ctx.state.sessionId;
    if (!archivedSessionId || !ctx.sessionService) { ctx.notify(formatAgentUiNotice(ctx.translator, 'currentSessionArchive')); return true; }
    await ctx.sessionService.setSessionArchived(archivedSessionId, true);
    await ctx.refreshSessions();
    ctx.notify(formatAgentUiNotice(ctx.translator, 'archivedSession', { archivedSessionId: archivedSessionId }));
    return true;
}

// ── /fork + /side ────────────────────────────────────────────────────────────

async function handleForkSide(ctx: CommandHandlerContext, args: string, resolved: { command: string; matches: string[] }): Promise<boolean> {
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

async function handlePinUnpin(ctx: CommandHandlerContext, _args: string, resolved: { command: string; matches: string[] }): Promise<boolean> {
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

// ── /title ───────────────────────────────────────────────────────────────────

async function handleTitle(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    const titleText = String(args || '').trim();
    const titleVerb = titleText.split(/\s+/)[0]?.toLowerCase();
    if (!titleText || titleVerb === 'list' || titleVerb === 'set' || titleVerb === 'unset') {
        return ctx.runTitleCommand(titleText);
    }
    const titleSessionId = ctx.state.sessionId;
    if (!titleSessionId || !ctx.sessionService) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'currentSessionTitle'));
        return true;
    }
    const title = titleText;
    await ctx.sessionService.setSessionTitle(titleSessionId, title || undefined);
    await ctx.refreshSessions();
    ctx.state.setTitle(title);
    ctx.updateTerminalTitle();
    ctx.pushCommandOutput('/title', title ? `Session titled "${title}".` : 'Session title cleared.');
    return true;
}

// ── /snapshot ────────────────────────────────────────────────────────────────

async function handleSnapshot(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    const snapshotSessionId = ctx.state.sessionId;
    if (!snapshotSessionId || !ctx.sessionService) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'currentSessionSnapshot'));
        return true;
    }
    const label = String(args || '').trim() || undefined;
    const snapshotId = await ctx.sessionService.createSessionSnapshot(snapshotSessionId, label);
    if (snapshotId) {
        ctx.pushCommandOutput('/snapshot', `Snapshot created: ${snapshotId}`);
    } else {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'snapshotCreationFailed'));
    }
    return true;
}

// ── /snapshots ───────────────────────────────────────────────────────────────

async function handleSnapshots(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    const snapshotSessionId = ctx.state.sessionId;
    if (!snapshotSessionId || !ctx.sessionService) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'currentSessionSnapshots'));
        return true;
    }
    const snapshots = await ctx.sessionService.listSessionSnapshots(snapshotSessionId);
    if (!snapshots.length) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'snapshotsCurrentSession'));
        return true;
    }
    const choice = await ctx.select(
        `Snapshots (${snapshots.length})`,
        snapshots.map((snapshot, index) => ({
            label: `${String(snapshot.label || 'snapshot').trim()} · ${snapshot.messageCount ?? 0} msgs${snapshot.summary ? ` · ${snapshot.summary}` : ''}`,
            value: String(snapshot.snapshotId || index),
            detail: snapshot.snapshotId
        })),
        0,
        ctx.state.consoleOptions.selectHint
    );
    if (!choice) return true;
    const action = await ctx.select(
        'Snapshot action',
        [
            { label: 'restore', value: 'restore', detail: 'replace current transcript with this snapshot' },
            { label: 'delete', value: 'delete', detail: 'remove this snapshot' }
        ],
        0,
        ctx.state.consoleOptions.selectHint
    );
    if (!action) return true;
    if (action === 'restore') {
        await ctx.sessionService.restoreSessionSnapshot(snapshotSessionId, choice);
        await ctx.refreshSessions();
        await ctx.openSession(snapshotSessionId);
        ctx.notify(formatAgentUiNotice(ctx.translator, 'snapshotRestored'));
    } else {
        await ctx.sessionService.deleteSessionSnapshot(snapshotSessionId, choice);
        ctx.notify(formatAgentUiNotice(ctx.translator, 'snapshotDeleted'));
    }
    return true;
}

// ── /toolruns ────────────────────────────────────────────────────────────────

async function handleToolruns(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (!ctx.state.toolRuns.length) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'toolRunsAvailable'));
        return true;
    }
    ctx.state.setSessionsFocused(false);
    ctx.transcriptNavigationController.setFocused(false);
    ctx.state.setProjectsFocused(false);
    ctx.state.setToolsFocused(false);
    ctx.state.setApprovalsFocused(false);
    ctx.state.setTasksFocused(false);
    ctx.state.setJobsFocused(false);
    ctx.state.closeMessageDetail();
    ctx.state.closeReview();
    ctx.state.closeGitSnapshotDetail();
    ctx.state.setToolRunsFocused(true);
    return true;
}

// ── /messages ────────────────────────────────────────────────────────────────

async function handleMessages(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    ctx.state.closeReview();
    ctx.state.closeGitSnapshotDetail();
    ctx.state.setSessionsFocused(false);
    ctx.transcriptNavigationController.setFocused(true);
    return true;
}

// ── /search ──────────────────────────────────────────────────────────────────

async function handleSearch(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (!args || !args.trim()) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'searchUsage'));
        return true;
    }
    {
        const rawQuery = args.trim();
        let agentResults: SessionSearchMatch[] = [];
        try {
            agentResults = await (ctx.sessionService?.searchSessions(rawQuery) ?? Promise.resolve([]));
        } catch {
            agentResults = [];
        }
        if (agentResults.length) {
            const currentId = ctx.state.sessionId;
            const sessionId = await ctx.select(
                `Search: "${rawQuery}" (${agentResults.length})`,
                agentResults.map(result => ({
                    label: `${result.sessionId}${result.sessionId === currentId ? ' [current]' : ''} (${result.count} msg)`,
                    value: result.sessionId,
                    detail: result.snippet || result.summary || result.workspace || ''
                })),
                0,
                ctx.state.consoleOptions.selectHint
            );
            if (sessionId) {
                await ctx.openSession(sessionId);
            }
            return true;
        }
        const query = rawQuery.toLowerCase();
        let sessions = ctx.state.sessions.slice();
        if (!sessions.length && ctx.sessionService) {
            const loaded = await ctx.sessionService.listSessions(ctx.state.sessionId);
            sessions = loaded.map(item => ({
                id: item.id,
                current: !!item.current,
                workspace: item.workspace,
                updatedAt: item.lastActiveAt,
                messageCount: item.messageCount,
                summary: item.summary,
                title: item.title,
                pinned: !!item.pinned,
                projectKey: item.projectKey,
                projectId: item.projectId,
                primaryThreadId: item.primaryThreadId,
                sessionRole: item.sessionRole,
                rootRequest: item.rootRequest,
                focusSummary: item.focusSummary,
                projectLabel: item.projectId || item.focusSummary || item.workspace || item.primaryThreadId || item.rootRequest || item.id
            }));
        }
        if (!sessions.length) {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'sessionsSearch'));
            return true;
        }
        const metadataMatches = sessions.filter(s => {
            const id = (s.id || '').toLowerCase();
            const summary = (s.summary || '').toLowerCase();
            const ws = (s.workspace || '').toLowerCase();
            const proj = (s.projectLabel || s.projectKey || s.projectId || '').toLowerCase();
            return id.includes(query) || summary.includes(query) || ws.includes(query) || proj.includes(query);
        });
        ctx.notify(formatAgentUiNotice(ctx.translator, 'searchingSessionsForQuery', { sessionCount: sessions.length, plural: sessions.length === 1 ? '' : 's', rawQuery: rawQuery }));
        const contentHits = await ctx.searchSessionContent(query, sessions);
        const seen = new Set<string>();
        const merged: AgentConsoleSessionItem[] = [];
        for (const s of metadataMatches) {
            if (!seen.has(s.id)) {
                seen.add(s.id);
                merged.push(s);
            }
        }
        for (const s of sessions) {
            if (!seen.has(s.id) && contentHits.has(s.id)) {
                seen.add(s.id);
                merged.push(s);
            }
        }
        if (!merged.length) {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'noSessionsMatching', { rawQuery: rawQuery }));
            return true;
        }
        const sessionId = await ctx.select(
            `Search: "${rawQuery}" (${merged.length})`,
            merged.map(s => {
                const hit = contentHits.get(s.id);
                const name = String(s.title || '').trim() || s.id;
                const pinned = s.pinned ? ' 📌' : '';
                return {
                    label: `${name}${s.current ? ' [current]' : ''}${hit ? ` (${hit.count} msg)` : ''} (${s.messageCount ?? '?'})${pinned}`,
                    value: s.id,
                    detail: hit ? hit.snippet : (s.summary || s.workspace || '')
                };
            }),
            0,
            ctx.state.consoleOptions.selectHint
        );
        if (sessionId) {
            await ctx.openSession(sessionId);
        }
    }
    return true;
}

// ── /projects ────────────────────────────────────────────────────────────────

async function handleProjects(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (!ctx.state.projects.length) {
        await ctx.refreshSessions();
    }
    if (!ctx.state.projects.length) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'projectsAvailable'));
        return true;
    }
    ctx.state.closeReview();
    ctx.state.closeGitSnapshotDetail();
    {
        const project = await ctx.select(
            AGENT_CONSOLE_OVERLAY_TITLES.projects,
            ctx.state.projects.map(p => ({
                label: `${p.label} (${p.sessionCount})`,
                value: p.key,
                detail: p.lastActive ? `last active ${new Date(p.lastActive).toLocaleDateString()}` : undefined
            })),
            0,
            AGENT_CONSOLE_OVERLAY_HINTS.select
        );
        if (!project) return true;
        const projectSessions = ctx.state.sessions.filter(
            s => ctx.resolveSessionProjectKey(s) === project
        );
        if (!projectSessions.length) {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'sessionsProject'));
            return true;
        }
        const sessionId = await ctx.select(
            `Sessions in ${project}`,
            projectSessions.map(s => ({
                label: `${String(s.title || '').trim() || s.id}${s.current ? ' [current]' : ''} (${s.messageCount ?? '?'})${s.pinned ? ' 📌' : ''}`,
                value: s.id,
                detail: s.summary
            })),
            0,
            ctx.state.consoleOptions.selectHint
        );
        if (!sessionId) return true;
        // P236: share selection/filter store with /sessions for restore on switch.
        const canonicalProjectId = String(projectSessions.find(s => String(s.projectId || '').trim())?.projectId || '').trim();
        const projectIndex = Math.max(0, projectSessions.findIndex(s => s.id === sessionId));
        ctx.state.setNavFilter({ projectId: canonicalProjectId || project });
        ctx.state.setNavViewScroll('sessions', projectIndex);
        ctx.state.setNavSelection({ type: 'session', id: sessionId, index: projectIndex });
        await ctx.openSession(sessionId);
    }
    return true;
}

// ── /threads ─────────────────────────────────────────────────────────────────

async function handleThreads(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (!ctx.state.threads.length) {
        await ctx.refreshSessions();
    }
    ctx.state.closeReview();
    ctx.state.closeGitSnapshotDetail();
    {
        if (!ctx.state.threads.length) {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'threadsAvailable'));
            return true;
        }
        const thread = await ctx.select(
            AGENT_CONSOLE_OVERLAY_TITLES.threads,
            ctx.state.threads.map(t => ({
                label: `${t.label} (${t.sessionCount})${t.sections?.length ? ` [${t.sections.length} sections]` : ''}`,
                value: t.key,
                detail: t.lastActive ? `last active ${new Date(t.lastActive).toLocaleDateString()}` : undefined
            })),
            0,
            AGENT_CONSOLE_OVERLAY_HINTS.select
        );
        if (!thread) return true;
        const threadSessions = ctx.state.sessions.filter(
            s => ctx.resolveSessionThreadKey(s) === thread
        );
        if (!threadSessions.length) {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'sessionsThread'));
            return true;
        }
        const sessionId = await ctx.select(
            `Sessions in ${thread}`,
            threadSessions.map(s => ({
                label: `${String(s.title || '').trim() || s.id}${s.current ? ' [current]' : ''} (${s.messageCount ?? '?'})${s.pinned ? ' 📌' : ''}`,
                value: s.id,
                detail: s.summary
            })),
            0,
            ctx.state.consoleOptions.selectHint
        );
        if (!sessionId) return true;
        await ctx.openSession(sessionId);
    }
    return true;
}

// ── /sections ────────────────────────────────────────────────────────────────

async function handleSections(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    const sectionSessionId = ctx.state.sessionId;
    if (!ctx.sessionService || !sectionSessionId) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'sessionServiceOr'));
        return true;
    }
    ctx.state.closeReview();
    ctx.state.closeGitSnapshotDetail();
    const labelArg = String(args || '').trim();
    if (labelArg) {
        await ctx.sessionService.createSection(sectionSessionId, labelArg);
        await ctx.refreshCurrentSections();
        ctx.notify(formatAgentUiNotice(ctx.translator, 'sectionLabelCreated', { label: labelArg }));
        return true;
    }
    await ctx.refreshCurrentSections();
    if (!ctx.state.sections.length) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'sectionsCreateOne'));
        return true;
    }
    const section = await ctx.select(
        'Sections',
        ctx.state.sections.map(item => {
            const count = ctx.state.messages.filter(message => message.sectionId === item.id).length;
            return {
                label: `${item.label}${count ? ` (${count} messages)` : ''}`,
                value: item.id,
                detail: `created ${new Date(item.createdAt).toLocaleString()}`
            };
        }),
        0,
        ctx.state.consoleOptions.selectHint
    );
    if (!section) {
        return true;
    }
    const action = await ctx.select(
        'Section actions',
        [
            { label: 'Rename', value: 'rename', description: 'rename this section (choose a new label below)' },
            { label: 'Delete', value: 'delete', description: 'delete this section and detach its messages' },
            { label: 'Move to start', value: 'start', description: 'move this section to the top' },
            { label: 'Move to end', value: 'end', description: 'move this section to the bottom' },
            { label: 'Create before', value: 'before', description: 'create a new section before this one' },
            { label: 'Create after', value: 'after', description: 'create a new section after this one' }
        ],
        0,
        ctx.state.consoleOptions.selectHint
    );
    if (!action) {
        return true;
    }
    if (action === 'delete') {
        await ctx.sessionService.deleteSection(sectionSessionId, section);
        await ctx.refreshCurrentSections();
        ctx.notify(formatAgentUiNotice(ctx.translator, 'sectionDeleted'));
    } else if (action === 'start' || action === 'end') {
        const index = ctx.state.sections.findIndex(item => item.id === section);
        if (action === 'start' && index <= 0) {
            ctx.notify(index < 0 ? formatAgentUiNotice(ctx.translator, 'sectionNotFound') : formatAgentUiNotice(ctx.translator, 'sectionAlreadyAtStart'));
            return true;
        }
        if (action === 'end' && (index < 0 || index === ctx.state.sections.length - 1)) {
            ctx.notify(index < 0 ? formatAgentUiNotice(ctx.translator, 'sectionNotFound') : formatAgentUiNotice(ctx.translator, 'sectionAlreadyAtEnd'));
            return true;
        }
        await ctx.sessionService.moveSection(
            sectionSessionId,
            section,
            undefined,
            { beforeId: action === 'start' ? ctx.state.sections[0].id : undefined }
        );
        await ctx.refreshCurrentSections();
        ctx.notify(action === 'start' ? formatAgentUiNotice(ctx.translator, 'sectionMovedToStart') : formatAgentUiNotice(ctx.translator, 'sectionMovedToEnd'));
    } else if (action === 'before' || action === 'after') {
        const targetIndex = ctx.state.sections.findIndex(item => item.id === section);
        const beforeId = action === 'before'
            ? section
            : ctx.state.sections[targetIndex + 1]?.id;
        const label = await ctx.select('New section label', [
            { label: 'Continue from previous section', value: '' },
            { label: 'Next step', value: 'Next step' },
            { label: 'Implementation', value: 'Implementation' },
            { label: 'Analysis', value: 'Analysis' }
        ], 0, ctx.state.consoleOptions.selectHint);
        if (label === undefined) {
            return true;
        }
        const created = await ctx.sessionService.createSection(sectionSessionId, label || 'Section', undefined, { beforeId });
        await ctx.refreshCurrentSections();
        ctx.notify(formatAgentUiNotice(ctx.translator, 'sectionLabelCreated', { label: created.label }));
    } else if (action === 'rename') {
        const label = await ctx.select('Rename section to', [
            { label: 'Next step', value: 'Next step' },
            { label: 'Implementation', value: 'Implementation' },
            { label: 'Analysis', value: 'Analysis' },
            { label: 'Refactor', value: 'Refactor' },
            { label: 'Review', value: 'Review' }
        ], 0, ctx.state.consoleOptions.selectHint);
        if (!label) {
            return true;
        }
        await ctx.sessionService.renameSection(sectionSessionId, section, label);
        await ctx.refreshCurrentSections();
        ctx.notify(formatAgentUiNotice(ctx.translator, 'sectionRenamed', { label: label }));
    }
    return true;
}

// ── /threadplan ──────────────────────────────────────────────────────────────

async function handleThreadplan(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    await ctx.refreshThreadTodoPlan();
    await ctx.loadThreadCodingTasks();
    if (!ctx.state.planTodos.length) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'planTodosThread'));
    }
    ctx.state.setSessionsFocused(false);
    ctx.state.setToolsFocused(false);
    ctx.state.setApprovalsFocused(false);
    ctx.state.setJobsFocused(false);
    ctx.transcriptNavigationController.setFocused(false);
    ctx.state.setTasksFocused(true);
    return true;
}

// ── /approvals ───────────────────────────────────────────────────────────────

async function handleApprovals(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    const pending = await ctx.getPendingApprovals(ctx.state.sessionId);
    if (!pending.length) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'pendingApprovals'));
        return true;
    }
    ctx.state.setPendingApprovals(pending);
    ctx.state.setSessionsFocused(false);
    ctx.state.setToolsFocused(false);
    ctx.transcriptNavigationController.setFocused(false);
    ctx.state.closeMessageDetail();
    ctx.state.closeReview();
    ctx.state.closeGitSnapshotDetail();
    ctx.state.setApprovalsFocused(true);
    ctx.updateTerminalTitle();
    return true;
}

// ── /review ──────────────────────────────────────────────────────────────────

async function handleReview(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    if (args) {
        const arg = args.trim();
        if (arg === 'summary') {
            const lines = ctx.state.getReviewAnnotationSummary();
            for (const line of lines) {
                ctx.notify(line);
            }
            return true;
        }
        if (arg === 'approve-all') {
            ctx.state.approveAllReviewFiles();
            ctx.notify(formatAgentUiNotice(ctx.translator, 'allFilesApproved'));
            return true;
        }
        if (arg === 'clear-all') {
            ctx.state.clearAllReviewAnnotations();
            ctx.notify(formatAgentUiNotice(ctx.translator, 'allAnnotationsCleared'));
            return true;
        }
        if (arg === 'clear') {
            ctx.state.clearReviewFileAnnotation();
            ctx.notify(formatAgentUiNotice(ctx.translator, 'annotationCleared'));
            return true;
        }
        if (arg === 'export') {
            const report = ctx.state.getReviewExportReport();
            if (!report.length) {
                ctx.notify(formatAgentUiNotice(ctx.translator, 'reviewDataExport'));
                return true;
            }
            for (const line of report) {
                ctx.notify(line);
            }
            return true;
        }
        if (arg === 'risk') {
            const sections = ctx.state.reviewFileSections;
            if (!sections.length) {
                ctx.notify(formatAgentUiNotice(ctx.translator, 'reviewFilesAnalyze'));
                return true;
            }
            for (const section of sections) {
                const risk = ctx.state.computeFileRiskScore(section);
                const annot = ctx.state.reviewFileAnnotations[section.path];
                const marker = annot ? (annot.status === 'approved' ? ' ✓' : ' ✗') : '';
                ctx.notify(formatAgentUiNotice(ctx.translator, 'riskTableRow', { score: String(risk.score).padStart(2, ' '), riskLevel: risk.level.padEnd(8, ' '), path: section.path, additions: section.additions, deletions: section.deletions, marker, comment: annot?.comment ? ` - ${annot.comment}` : '' }));
            }
            return true;
        }
        if (arg.startsWith('approve')) {
            const comment = arg.slice(7).trim() || undefined;
            ctx.state.setReviewFileAnnotation('approved', comment);
            ctx.notify(comment ? formatAgentUiNotice(ctx.translator, 'fileApprovedWithComment', { comment: comment }) : formatAgentUiNotice(ctx.translator, 'fileApproved'));
            return true;
        }
        if (arg.startsWith('reject')) {
            const comment = arg.slice(6).trim() || undefined;
            ctx.state.setReviewFileAnnotation('rejected', comment);
            ctx.notify(comment ? formatAgentUiNotice(ctx.translator, 'fileRejectedWithComment', { comment: comment }) : formatAgentUiNotice(ctx.translator, 'fileRejected'));
            return true;
        }
        if (arg === 'diff' || arg.startsWith('diff ')) {
            const base = arg.length > 5 ? arg.slice(5).trim() : undefined;
            return ctx.openGitDiffReview(base);
        }
        if (arg === 'run' || arg.startsWith('run ')) {
            const base = arg.length > 4 ? arg.slice(4).trim() : undefined;
            return ctx.runGitDiffReviewAnalysis(base);
        }
        if (arg === 'findings' || arg.startsWith('findings ')) {
            const commit = arg.length > 9 ? arg.slice(9).trim() : undefined;
            return ctx.listReviewFindings(commit);
        }
        if (arg === 'show' || arg.startsWith('show ')) {
            const id = arg.length > 5 ? arg.slice(5).trim() : undefined;
            return ctx.showReviewRun(id);
        }
        await ctx.openCodingTaskReview(arg);
        return true;
    }
    return ctx.openCodingTaskReviewSelector();
}

// ── /quality ─────────────────────────────────────────────────────────────────

async function handleQuality(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    const arg = args?.trim() || '';
    if (arg === 'list' || arg.startsWith('list ')) {
        const provider = arg.slice(4).trim() || undefined;
        return ctx.openSummaryQualityRecords(provider);
    }
    if (arg === 'trend' || arg.startsWith('trend ')) {
        const { provider, bucketSize, maxBuckets } = ctx.parseSummaryQualityTrendArgs(arg.slice(5));
        return ctx.openSummaryQualityTrend(provider, bucketSize, maxBuckets);
    }
    const provider = arg || undefined;
    const aggregates = ctx.sessionService
        ? await ctx.sessionService.getSummaryQualityStats(provider)
        : [];
    if (!aggregates.length) {
        ctx.notify(
            provider
                ? formatAgentUiNotice(ctx.translator, 'noSummaryQualityStatsForProvider', { provider: provider })
                : formatAgentUiNotice(ctx.translator, 'noSummaryQualityStats')
        );
        return true;
    }
    ctx.notify(
        aggregates
            .map(item => ctx.formatSummaryQualityAggregate(item))
            .join(' | ')
    );
    return true;
}

// ── /compactions ─────────────────────────────────────────────────────────────

async function handleCompactions(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    {
        const arg = args?.trim() || '';
        if (arg === 'trend' || arg.startsWith('trend ')) {
            const { sessionId, bucketSize, maxBuckets } = ctx.parseCompactionHistoryTrendArgs(arg.slice(5));
            return ctx.openCompactionHistoryTrend(sessionId, bucketSize, maxBuckets);
        }
    }
    return ctx.openCompactionHistory(args);
}

// ── /compact ─────────────────────────────────────────────────────────────────

async function handleCompact(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    const reason = args?.trim() || undefined;
    const result = await ctx.sessionService?.compactSession(ctx.state.sessionId, reason) ?? { compacted: false };
    if (result.error) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'compactionFailed', { error: result.error }));
        return true;
    }
    if (!result.compacted) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'nothingCompactHistory'));
        return true;
    }
    const summary = typeof result.summary === 'string' && result.summary.trim()
        ? ` · ${result.summary.trim()}`
        : '';
    const before = typeof result.beforeMessageCount === 'number' ? result.beforeMessageCount : 0;
    const after = typeof result.afterMessageCount === 'number' ? result.afterMessageCount : 0;
    const ratio = typeof result.compressionRatio === 'number' ? `${result.compressionRatio}%` : 'n/a';
    ctx.notify(formatAgentUiNotice(ctx.translator, 'compactedMessagesTokens', { before: before, after: after, ratio: ratio, summary: summary }));
    return true;
}

// ── /diagnostics ─────────────────────────────────────────────────────────────

async function handleDiagnostics(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    {
        const arg = args?.trim() || '';
        if (arg === 'trend' || arg.startsWith('trend ')) {
            const { sessionId, bucketSize, maxBuckets } = ctx.parseTurnDiagnosticsTrendArgs(arg.slice(5));
            return ctx.openTurnDiagnosticsTrend(sessionId, bucketSize, maxBuckets);
        }
        if (arg === 'list' || arg.startsWith('list ')) {
            const sessionId = arg.slice(4).trim() || undefined;
            return ctx.openTurnDiagnosticsList(sessionId);
        }
        const sessionId = arg || undefined;
        return ctx.openTurnDiagnostics(sessionId);
    }
}

// ── /delegation ──────────────────────────────────────────────────────────────

async function handleDelegation(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    {
        const arg = args?.trim() || '';
        if (arg === 'tree' || arg.startsWith('tree ')) {
            const rest = arg.slice(4).trim();
            const tokens = rest.split(/\s+/).filter(Boolean);
            const sessionId = tokens[0];
            const status = tokens[1];
            const depthRaw = tokens[2] !== undefined && /^\d+$/.test(tokens[2]) ? parseInt(tokens[2], 10) : undefined;
            return ctx.openDelegationTree(sessionId, status, depthRaw);
        }
        if (arg === 'lineage' || arg.startsWith('lineage ')) {
            return ctx.openDelegationLineage(arg.slice(7).trim() || undefined);
        }
        if (arg === 'mode' || arg.startsWith('mode ')) {
            await ctx.runDelegationModeCommand(arg.slice(4).trim());
            return true;
        }
        return ctx.openDelegationList(arg || undefined);
    }
}

// ── /harness ─────────────────────────────────────────────────────────────────

async function handleHarness(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    {
        const arg = args?.trim() || '';
        if (arg === 'audit' || arg.startsWith('audit ')) {
            const sessionId = arg.slice(5).trim() || undefined;
            return ctx.openHarnessAudit(sessionId);
        }
        if (arg === 'profile' || arg.startsWith('profile ')) {
            return ctx.openHarnessProfile(arg.slice(7).trim() || undefined);
        }
        if (arg === 'tree' || arg.startsWith('tree ')) {
            return ctx.openHarnessTree(arg.slice(4).trim() || undefined);
        }
        if (arg === 'list' || arg.startsWith('list ')) {
            return ctx.openHarnessList(arg.slice(4).trim() || undefined);
        }
        if (arg === 'stop' || arg.startsWith('stop ')) {
            const taskId = arg.slice(4).trim();
            if (!taskId) {
                ctx.notify(formatAgentUiNotice(ctx.translator, 'harnessStopUsage'));
                return true;
            }
            return ctx.runHarnessStopCommand(taskId);
        }
        ctx.notify(formatAgentUiNotice(ctx.translator, 'harnessUsage'));
        return true;
    }
}

// ── /git-snapshots (alias for /snapshots with guard) ─────────────────────────

async function handleGitSnapshots(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    await ctx.runGitSnapshotsCommand(String(args || '').trim());
    return true;
}

// ── /outputs ─────────────────────────────────────────────────────────────────

async function handleOutputs(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    ctx.state.toggleCommandOutputs();
    return true;
}

// ── Dispatch table ───────────────────────────────────────────────────────────

export const COMMAND_HANDLERS: Record<string, CommandHandler> = {
    '/help': handleHelp,
    '/model': handleModel,
    '/provider': handleProvider,
    '/init': (ctx, args, meta) => guardDelegate(ctx, canonicalArgsOf(meta, args), meta, a => ctx.runInitCommand(a).then(() => true)),
    '/plan': (ctx, args, meta) => guardDelegate(ctx, canonicalArgsOf(meta, args), meta, a => ctx.runPlanCommand(a).then(() => true)),
    '/archetype': (ctx, args, meta) => guardDelegate(ctx, canonicalArgsOf(meta, args), meta, a => ctx.runArchetypeCommand(a).then(() => true)),
    '/vim': (ctx, args, meta) => ctx.runVimCommand(canonicalArgsOf(meta, args)).then(() => true),
    '/keymap': (ctx, args, meta) => ctx.runKeymapCommand(canonicalArgsOf(meta, args)).then(() => true),
    '/permissions': (ctx, args, meta) => guardDelegate(ctx, canonicalArgsOf(meta, args), meta, a => ctx.runPermissionsCommand(a).then(() => true)),
    '/status': (ctx) => ctx.runStatusCommand().then(() => true),
    '/cd': async (ctx, args, meta) => { await ctx.runCdCommand(canonicalArgsOf(meta, args)); return true; },
    '/pwd': handlePwd,
    '/goal': (ctx, args, meta) => ctx.runGoalCommand(canonicalArgsOf(meta, args)).then(() => true),
    '/undo': (ctx, args) => guardDelegateNoArgs(ctx, args, { command: '/undo', matches: [] }, () => ctx.runUndoCommand().then(() => true)),
    '/redo': (ctx, args) => guardDelegateNoArgs(ctx, args, { command: '/redo', matches: [] }, () => ctx.runRedoCommand().then(() => true)),
    '/export': (ctx, args, meta) => guardDelegate(ctx, canonicalArgsOf(meta, args), meta, a => ctx.runExportCommand(a)),
    '/attach': (ctx, args, meta) => guardDelegate(ctx, canonicalArgsOf(meta, args), meta, a => ctx.runAttachCommand(a)),
    '/tools': (ctx, args, meta) => handleTools(ctx, canonicalArgsOf(meta, args), meta),
    '/skills': (ctx, args, meta) => ctx.runSkillsCommand(canonicalArgsOf(meta, args)),
    '/mcp': (ctx, args, meta) => ctx.runMcpCommand(canonicalArgsOf(meta, args)),
    '/plugins': (ctx, args, meta) => ctx.runPluginsCommand(canonicalArgsOf(meta, args)),
    '/apps': (ctx, args, meta) => ctx.runAppsCommand(canonicalArgsOf(meta, args)),
    '/ssh': (ctx, args, meta) => ctx.runSshCommand(canonicalArgsOf(meta, args)).then(() => true),
    '/jobs': (ctx, args, meta) => guardDelegate(ctx, canonicalArgsOf(meta, args), meta, a => ctx.openScheduledJobsDashboard(a)),
    '/tasks': (ctx, args, meta) => guardDelegate(ctx, canonicalArgsOf(meta, args), meta, a => ctx.openCodingTaskInspector(a)),
    '/threadplan': handleThreadplan,
    '/threadreview': (ctx, _args) => guardDelegateNoArgs(ctx, '', { command: '/threadreview', matches: [] }, () => ctx.openThreadCodingTaskReviewSelector()),
    '/review': handleReview,
    '/diff': (ctx, args) => guardDelegate(ctx, args, { command: '/diff', matches: [] }, a => ctx.openWorktreeDiff(a)),
    '/theme': (ctx, args, meta) => ctx.runThemeCommand(canonicalArgsOf(meta, args)),
    '/thinking': (ctx, args, meta) => ctx.runThinkingCommand(canonicalArgsOf(meta, args)),
    '/display': (ctx, args, meta) => ctx.runDisplayCommand(canonicalArgsOf(meta, args)),
    '/layout': (ctx, args, meta) => ctx.runLayoutCommand(canonicalArgsOf(meta, args)),
    '/outputs': handleOutputs,
    '/pager': (ctx, args) => Promise.resolve(ctx.openPager(args)),
    '/timeline': (ctx, args, meta) => ctx.runTimelineModeCommand(canonicalArgsOf(meta, args)),
    '/raw': (ctx, args, meta) => ctx.runRawModeCommand(canonicalArgsOf(meta, args)),
    '/stash': (ctx, args, meta) => ctx.runStashCommand(canonicalArgsOf(meta, args)),
    '/queue': (ctx, args, meta) => ctx.runQueueCommand(canonicalArgsOf(meta, args)),
    '/statusline': (ctx, args, meta) => ctx.runStatuslineCommand(canonicalArgsOf(meta, args)),
    '/hooks': (ctx) => ctx.runHooksCommand(),
    '/memories': (ctx, args, meta) => ctx.runMemoriesCommand(canonicalArgsOf(meta, args)),
    '/fast': (ctx, args, meta) => ctx.runFastCommand(canonicalArgsOf(meta, args)),
    '/personality': (ctx, args, meta) => ctx.runPersonalityCommand(canonicalArgsOf(meta, args)),
    '/debug-config': (ctx) => ctx.runDebugConfigCommand(),
    '/settings': (ctx) => ctx.runSettingsCommand(),
    '/yolo': (ctx, args, meta) => ctx.runYoloCommand(canonicalArgsOf(meta, args)),
    '/experimental': (ctx, args, meta) => ctx.runExperimentalCommand(canonicalArgsOf(meta, args)),
    '/feedback': (ctx) => ctx.runFeedbackCommand(),
    '/ps': (ctx, args, meta) => ctx.runBackgroundTasksCommand(canonicalArgsOf(meta, args)),
    '/ide': (ctx, args, meta) => ctx.runIdeCommand(canonicalArgsOf(meta, args)),
    '/editor': (ctx, args, meta) => ctx.runEditorCommand(canonicalArgsOf(meta, args)),
    '/retry': (ctx, args, meta) => guardDelegate(ctx, canonicalArgsOf(meta, args), meta, a => ctx.retryFailedCodingTask(a)),
    '/rollback': (ctx, args, meta) => guardDelegate(ctx, canonicalArgsOf(meta, args), meta, a => ctx.rollbackCodingTask(a)),
    '/clear': handleClear,
    '/approvals': handleApprovals,
    '/usage': (ctx, args, meta) => guardDelegate(ctx, canonicalArgsOf(meta, args), meta, a => ctx.openUsage(a?.trim() || undefined)),
    '/quality': (ctx, args, meta) => handleQuality(ctx, canonicalArgsOf(meta, args), meta),
    '/compactions': (ctx, args, meta) => handleCompactions(ctx, canonicalArgsOf(meta, args), meta),
    '/compact': (ctx, args, meta) => handleCompact(ctx, canonicalArgsOf(meta, args), meta),
    '/diagnostics': (ctx, args, meta) => handleDiagnostics(ctx, canonicalArgsOf(meta, args), meta),
    '/delegation': (ctx, args, meta) => handleDelegation(ctx, canonicalArgsOf(meta, args), meta),
    '/harness': (ctx, args, meta) => handleHarness(ctx, canonicalArgsOf(meta, args), meta),
    '/voice': (ctx, args, meta) => ctx.handleVoiceCommand(canonicalArgsOf(meta, args)),
    '/copy': (ctx, args, meta) => handleCopy(ctx, canonicalArgsOf(meta, args), meta),
    '/share': (ctx, args, meta) => ctx.runShareCommand(canonicalArgsOf(meta, args)),
    '/unshare': (ctx, args, meta) => ctx.runUnshareCommand(canonicalArgsOf(meta, args)),
    '/session': (ctx, args, meta) => handleSession(ctx, canonicalArgsOf(meta, args), meta),
    '/new': (ctx, args, meta) => handleNew(ctx, canonicalArgsOf(meta, args), meta),
    '/sessions': handleSessions,
    '/resume': handleResume,
    '/archive': handleArchive,
    '/fork': (ctx, args, meta) => handleForkSide(ctx, canonicalArgsOf(meta, args), meta),
    '/side': (ctx, args, meta) => handleForkSide(ctx, canonicalArgsOf(meta, args), meta),
    '/pin': handlePinUnpin,
    '/unpin': handlePinUnpin,
    '/title': (ctx, args, meta) => handleTitle(ctx, canonicalArgsOf(meta, args), meta),
    '/snapshot': handleSnapshot,
    '/snapshots': handleSnapshots,
    '/git-snapshots': (ctx, args, meta) => handleGitSnapshots(ctx, canonicalArgsOf(meta, args), meta),
    '/toolruns': handleToolruns,
    '/search': handleSearch,
    '/projects': handleProjects,
    '/threads': handleThreads,
    '/sections': (ctx, args, meta) => handleSections(ctx, canonicalArgsOf(meta, args), meta),
    '/messages': handleMessages,
    '/approve': (ctx, args, meta) => handleApproveDeny(ctx, canonicalArgsOf(meta, args), meta),
    '/deny': (ctx, args, meta) => handleApproveDeny(ctx, canonicalArgsOf(meta, args), meta),
    '/exit': handleQuitExit,
    '/multiline': handleMultiline,
    '/cancel': handleCancel,
    '/send': handleSend
};
