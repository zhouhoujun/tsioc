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
import type { AgentConsoleParsedCommandArguments } from './AgentConsoleCommandRegistry';
import type { AgentConsoleSessionService } from './AgentConsoleSessionService';
import type { NavFilter, NavSelection, SessionSearchMatch } from '@tsdi/agent';
import type { CommandHandlerContext } from './AgentConsoleCommandHandlerContext';
import { runHelpCommand } from './AgentConsoleHelpCommand';
import { runSnapshotsCommand, type SnapshotCommandHost } from './AgentConsoleSnapshotCommands';
import { handlePair, handleRename, handleRestart, handleTitle } from './AgentConsoleSessionRenameCommands';
import { mapTuiLayoutArg } from './AgentConsoleSettingsCommands';
export type { CommandHandlerContext } from './AgentConsoleCommandHandlerContext';
import { formatAgentUiDate, formatAgentUiDateTime, formatAgentUiNotice, formatAgentPanelLabel as panelLabel, type AgentUiTranslator } from './agent-ui.i18n';
import { runMultilineCommand, runSendCommand } from './AgentConsoleMultilineCommands';
import { handleProjects, handleSearch, handleSections, handleThreads, handleThreadplan } from './AgentConsoleSessionCommands';
import { handleReview } from './AgentConsoleReviewCommands';
import { handleCompact, handleCompactions, handleDelegation, handleDiagnostics, handleHarness, handleQuality } from './AgentConsoleDiagnosticsCommands';

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
        const sel = await ctx.select(panelLabel(ctx.translator, 'select', isApprove ? 'approve' : 'deny', isApprove ? 'Approve' : 'Deny'),
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

// ── /copy ────────────────────────────────────────────────────────────────────

async function handleCopy(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (args) {
        switch (args) {
            case 'input':
                await ctx.copyFocusedTextActionHandler(ctx.state.input, formatAgentUiNotice(ctx.translator, 'copyLabelInput'));
                return true;
            case 'workspace':
                await ctx.copyFocusedTextActionHandler(ctx.state.workspace, formatAgentUiNotice(ctx.translator, 'copyLabelWorkspace'));
                return true;
            case 'session':
                await ctx.copyFocusedTextActionHandler(ctx.state.sessionId, formatAgentUiNotice(ctx.translator, 'copyLabelSession'));
                return true;
            case 'model':
                await ctx.copyFocusedTextActionHandler(
                    [ctx.state.provider, ctx.state.model].filter(Boolean).join(' / '),
                    formatAgentUiNotice(ctx.translator, 'copyLabelModel')
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
            await ctx.copyFocusedTextActionHandler(msgs[i].content, formatAgentUiNotice(ctx.translator, 'copyLabelAssistantMessage'));
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
    await ctx.openSession(args || undefined, { scoped: true });
    return true;
}

// ── /sessions ────────────────────────────────────────────────────────────────

async function handleSessions(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
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

async function handleResume(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
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
        ctx.pushCommandOutput('/snapshot', formatAgentUiNotice(ctx.translator, 'snapshotCreatedOutput', { id: snapshotId }));
    } else {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'snapshotCreationFailed'));
    }
    return true;
}

// ── /snapshots ───────────────────────────────────────────────────────────────

async function handleSnapshots(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    return runSnapshotsCommand(ctx as unknown as SnapshotCommandHost, args);
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

// ── /search ──────────────────────────────────────────────────────────────────

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
    '/help': runHelpCommand,
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
    '/export': (ctx, args, meta) => ctx.runExportCommand(canonicalArgsOf(meta, args)),
    '/attach': (ctx, args, meta) => ctx.runAttachCommand(canonicalArgsOf(meta, args)),
    '/tools': (ctx, args, meta) => handleTools(ctx, canonicalArgsOf(meta, args), meta),
    '/skills': (ctx, args, meta) => ctx.runSkillsCommand(canonicalArgsOf(meta, args)),
    '/mcp': (ctx, args, meta) => ctx.runMcpCommand(canonicalArgsOf(meta, args)),
    '/plugins': (ctx, args, meta) => ctx.runPluginsCommand(canonicalArgsOf(meta, args)),
    '/apps': (ctx, args, meta) => ctx.runAppsCommand(canonicalArgsOf(meta, args)),
    '/ssh': (ctx, args, meta) => ctx.runSshCommand(canonicalArgsOf(meta, args)).then(() => true),
    '/jobs': (ctx, args, meta) => ctx.openScheduledJobsDashboard(canonicalArgsOf(meta, args)),
    '/tasks': (ctx, args, meta) => ctx.openCodingTaskInspector(canonicalArgsOf(meta, args)),
    '/threadplan': handleThreadplan,
    '/threadreview': (ctx, _args) => guardDelegateNoArgs(ctx, '', { command: '/threadreview', matches: [] }, () => ctx.openThreadCodingTaskReviewSelector()),
    '/review': handleReview,
    '/diff': (ctx, args) => ctx.openWorktreeDiff(args),
    '/theme': (ctx, args, meta) => ctx.runThemeCommand(canonicalArgsOf(meta, args)),
    '/thinking': (ctx, args, meta) => ctx.runThinkingCommand(canonicalArgsOf(meta, args)),
    '/display': (ctx, args, meta) => ctx.runDisplayCommand(canonicalArgsOf(meta, args)),
    '/layout': (ctx, args, meta) => ctx.runLayoutCommand(canonicalArgsOf(meta, args)),
    '/tui': (ctx, args, meta) => ctx.runLayoutCommand(mapTuiLayoutArg(canonicalArgsOf(meta, args))),
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
    '/feedback': (ctx) => ctx.runFeedbackCommand(),
    '/ps': (ctx, args, meta) => ctx.runBackgroundTasksCommand(canonicalArgsOf(meta, args)),
    '/ide': (ctx, args, meta) => ctx.runIdeCommand(canonicalArgsOf(meta, args)),
    '/editor': (ctx, args, meta) => ctx.runEditorCommand(canonicalArgsOf(meta, args)),
    '/retry': (ctx, args, meta) => guardDelegate(ctx, canonicalArgsOf(meta, args), meta, a => ctx.retryFailedCodingTask(a)),
    '/rollback': (ctx, args, meta) => guardDelegate(ctx, canonicalArgsOf(meta, args), meta, a => ctx.rollbackCodingTask(a)),
    '/clear': handleClear,
    '/approvals': handleApprovals,
    '/usage': (ctx, args, meta) => ctx.openUsage(canonicalArgsOf(meta, args)?.trim() || undefined),
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
    '/rename': (ctx, args, meta) => handleRename(ctx, canonicalArgsOf(meta, args), meta),
    '/title': (ctx, args, meta) => handleTitle(ctx, canonicalArgsOf(meta, args), meta),
    '/reload': (ctx) => ctx.runReloadCommand(),
    '/pair': handlePair,
    '/restart': (ctx) => handleRestart(ctx),
    '/snapshot': handleSnapshot,
    '/snapshots': handleSnapshots,
    '/git-snapshots': (ctx, args, meta) => handleGitSnapshots(ctx, canonicalArgsOf(meta, args), meta),
    '/toolruns': handleToolruns,
    '/search': handleSearch,
    '/projects': handleProjects,
    '/threads': handleThreads,
    '/sections': (ctx, args, meta) => handleSections(ctx, canonicalArgsOf(meta, args), meta),
    '/approve': (ctx, args, meta) => handleApproveDeny(ctx, canonicalArgsOf(meta, args), meta),
    '/deny': (ctx, args, meta) => handleApproveDeny(ctx, canonicalArgsOf(meta, args), meta),
    '/exit': handleQuitExit,
    '/multiline': runMultilineCommand,
    '/cancel': handleCancel,
    '/send': runSendCommand
};
