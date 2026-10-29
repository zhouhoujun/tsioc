import type { CommandHandlerContext } from './AgentConsoleCommandHandlerContext';
import { formatAgentPanelLabel, formatAgentUiNotice } from './agent-ui.i18n';

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

/** `/pair` prints the one-time browser links (and QR when the host rendered one). */
export async function handlePair(ctx: CommandHandlerContext, _args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    let pairing: { url?: string; urls?: string[]; qr?: string; code?: string; expiresAt?: number } | null = null;
    try {
        pairing = await ctx.state.pairAction?.() ?? null;
    } catch {
        pairing = null;
    }
    const urls = (pairing?.urls?.length ? pairing.urls : pairing?.url ? [pairing.url] : []).filter(Boolean);
    if (!urls.length) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'pairUnavailable'));
        return true;
    }
    const minutes = pairing?.expiresAt ? Math.max(1, Math.round((pairing.expiresAt - Date.now()) / 60000)) : 5;
    const notice = formatAgentUiNotice(ctx.translator, 'pairReady', { urls: urls.join('\n'), minutes });
    const qr = String(pairing?.qr || '').trim();
    const title = formatAgentPanelLabel(ctx.translator, 'overlay', 'pairTitle', 'pairing');
    // Keep the QR scannable on a 24-row terminal: the primary link plus the
    // full QR, with the expiry in the title, fits inside one modal viewport.
    const compact = `${title} \u00b7 ${minutes} min`;
    // QR first so a very short terminal clips link/hint rows, never the code.
    const links = Array.from(new Set(urls));
    const lines = qr ? [...qr.split('\n'), ...links] : notice.split('\n');
    ctx.state.openTextOverlay(qr ? compact : title, lines, lines.length);
    return true;
}
