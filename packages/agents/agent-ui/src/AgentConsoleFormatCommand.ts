import type { CommandHandlerContext } from './AgentConsoleCommandHandlerContext';
import { formatAgentUiNotice } from './agent-ui.i18n';
import { resolveLspDiagnosticPath } from './AgentConsoleLspDiagnostics';

/**
 * `/format` — run the configured LSP formatter and write the result.
 *
 * Like `/check`, this goes through `tools.invoke` (`lsp_format`), so the LSP
 * client stays in `@tsdi/agent-tools`; TUI runs in-process, Web/attach goes
 * through the gateway (where workspace trust gates the write).
 */

interface FormatOptions {
    files: string[];
    write: boolean;
}

/** Split `--check`/`--dry-run` from file paths; the last flag wins. */
export function parseFormatCommandArgs(args: string): FormatOptions {
    const files: string[] = [];
    let write = true;
    for (const token of String(args || '').trim().split(/\s+/).filter(Boolean)) {
        if (token === '--check' || token === '--dry-run' || token === '-n') {
            write = false;
            continue;
        }
        if (token === '--write') {
            write = true;
            continue;
        }
        files.push(token);
    }
    return { files, write };
}

export async function runFormatCommand(ctx: CommandHandlerContext, args: string): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    const { files, write } = parseFormatCommandArgs(args);
    if (!files.length) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'lspFormatUsage'));
        return true;
    }
    if (!ctx.invokeTool) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'lspFormatUnsupported'));
        return true;
    }
    const lines: string[] = [];
    let changed = 0;
    let unchanged = 0;
    for (const requestedPath of files) {
        const filePath = resolveLspDiagnosticPath(requestedPath, ctx.workspace);
        try {
            await ctx.activateTool?.('lsp_format');
            const result = await ctx.invokeTool('lsp_format', { filePath, write });
            if (!result || result.available === false) {
                lines.push(formatAgentUiNotice(ctx.translator, 'lspFormatUnavailable', {
                    file: filePath,
                    message: String(result?.message || '')
                }));
                continue;
            }
            if (!result.changed) {
                unchanged++;
                lines.push(formatAgentUiNotice(ctx.translator, 'lspFormatUnchanged', { file: filePath }));
                continue;
            }
            changed++;
            lines.push(formatAgentUiNotice(ctx.translator, result.written ? 'lspFormatWritten' : 'lspFormatPreview', {
                file: filePath,
                edits: Number(result.editCount) || 0
            }));
        } catch (error: any) {
            lines.push(formatAgentUiNotice(ctx.translator, 'lspFormatFailed', {
                file: filePath,
                error: error?.message || String(error)
            }));
        }
    }
    if (changed + unchanged > 0) {
        lines.unshift(formatAgentUiNotice(ctx.translator, 'lspFormatSummary', { changed, unchanged }));
    }
    ctx.state.openTextOverlay(
        formatAgentUiNotice(ctx.translator, 'lspFormatTitle'),
        lines.length ? lines : [formatAgentUiNotice(ctx.translator, 'lspFormatUnchanged', { file: files.join(', ') })],
        Math.min(24, Math.max(4, lines.length || 1))
    );
    return true;
}
