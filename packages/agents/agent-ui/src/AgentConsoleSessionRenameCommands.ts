import type { CommandHandlerContext } from './AgentConsoleCommandHandlerContext';
import { formatAgentUiNotice } from './agent-ui.i18n';

/** Shared session rename used by `/rename` and the legacy `/title`. */
async function renameSession(ctx: CommandHandlerContext, titleText: string, command: string): Promise<boolean> {
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
    ctx.pushCommandOutput(command, formatAgentUiNotice(ctx.translator, title ? 'sessionTitled' : 'sessionTitleCleared', title ? { title: title } : undefined));
    return true;
}

export async function handleRename(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    const titleText = String(args || '').trim();
    if (!titleText) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'renameUsage'));
        return true;
    }
    return renameSession(ctx, titleText, '/rename');
}

export async function handleTitle(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    const titleText = String(args || '').trim();
    const titleVerb = titleText.split(/\s+/)[0]?.toLowerCase();
    if (!titleText || titleVerb === 'list' || titleVerb === 'set' || titleVerb === 'unset') {
        return ctx.runTitleCommand(titleText);
    }
    return renameSession(ctx, titleText, '/title');
}

/** `/restart`: restore the terminal, then let the host relaunch a fresh TUI. */
export async function handleRestart(ctx: CommandHandlerContext): Promise<boolean> {
    const restart = ctx.state.restartAction;
    if (!restart) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'restartUnavailable'));
        return true;
    }
    const restartSessionId = ctx.state.sessionId;
    await ctx.requestTerminalExit('');
    restart(restartSessionId);
    return true;
}
