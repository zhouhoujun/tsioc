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
import { handleArchive, handleForkSide, handleNew, handlePinUnpin, handleResume, handleSession, handleSessions, handleSnapshot, handleSnapshots } from './AgentConsoleSessionCommandHandlers';
import { handleApprovals, handleApproveDeny, handleCancel, handleClear, handleCopy, handleGitSnapshots, handleOutputs, handlePwd, handleQuitExit, handleToolruns, handleTools } from './AgentConsoleRuntimeCommandHandlers';
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
