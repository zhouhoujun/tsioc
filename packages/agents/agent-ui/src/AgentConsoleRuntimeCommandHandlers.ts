import type { CommandHandlerContext } from './AgentConsoleCommandHandlerContext';
import { formatAgentUiNotice, formatAgentPanelLabel as panelLabel } from './agent-ui.i18n';

export async function handlePwd(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    ctx.notify(ctx.workspace);
    return true;
}

// ── /tools ───────────────────────────────────────────────────────────────────

export async function handleTools(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
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

export async function handleClear(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    await ctx.openSession(undefined);
    ctx.notify(formatAgentUiNotice(ctx.translator, 'startedNewSession'));
    return true;
}

// ── /approve + /deny ────────────────────────────────────────────────────────

export async function handleApproveDeny(ctx: CommandHandlerContext, args: string, resolved: { command: string; matches: string[] }): Promise<boolean> {
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

export async function handleQuitExit(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    await ctx.requestTerminalExit(ctx.closingSessionMessage());
    return true;
}

// ── /cancel ──────────────────────────────────────────────────────────────────

export async function handleCancel(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
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

export async function handleCopy(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
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

export async function handleToolruns(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
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

export async function handleApprovals(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
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

export async function handleGitSnapshots(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    await ctx.runGitSnapshotsCommand(String(args || '').trim());
    return true;
}

// ── /outputs ─────────────────────────────────────────────────────────────────

export async function handleOutputs(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    ctx.state.toggleCommandOutputs();
    return true;
}
