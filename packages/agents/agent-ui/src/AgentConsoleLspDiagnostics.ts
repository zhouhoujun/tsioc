import type { CommandHandlerContext } from './AgentConsoleCommandHandlerContext';
import { formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';

/**
 * `/check` — read-only LSP diagnostics panel.
 *
 * The LSP client lives in `@tsdi/agent-tools` (it spawns local servers), so the
 * console never imports it directly. Instead the existing `tools.invoke` port
 * runs `lsp_diagnostics` in-process (TUI) or through the gateway (web/attach),
 * and this module only formats the returned diagnostics into a text overlay.
 */

interface LspDiagnosticRow {
    message?: string;
    severity?: number;
    source?: string;
    code?: string | number;
    startLine?: number;
    startCharacter?: number;
}

const SEVERITY_LABELS: Record<number, { key: string; fallback: string }> = {
    1: { key: 'lspSeverityError', fallback: 'error' },
    2: { key: 'lspSeverityWarning', fallback: 'warning' },
    3: { key: 'lspSeverityInformation', fallback: 'info' },
    4: { key: 'lspSeverityHint', fallback: 'hint' }
};

function label(translator: AgentUiTranslator | null | undefined, key: string, fallback: string): string {
    const value = translator?.translate(key);
    return value && value !== key ? value : fallback;
}

/** Join a workspace-relative path onto the workspace; leave absolute paths alone. */
export function resolveLspDiagnosticPath(filePath: string, workspace?: string): string {
    const trimmed = String(filePath || '').trim();
    if (!trimmed || trimmed.startsWith('/') || /^[A-Za-z]:[\\/]/.test(trimmed)) {
        return trimmed;
    }
    const root = String(workspace || '').trim().replace(/[\\/]+$/, '');
    return root ? `${root}/${trimmed.replace(/^\.?[\\/]+/, '')}` : trimmed;
}

function severityLabel(translator: AgentUiTranslator | null | undefined, severity?: number): string {
    const entry = severity ? SEVERITY_LABELS[severity] : undefined;
    return entry ? label(translator, entry.key, entry.fallback) : label(translator, 'lspSeverityInformation', 'info');
}

function position(row: LspDiagnosticRow): string {
    const line = Number(row.startLine) >= 0 ? Number(row.startLine) + 1 : 1;
    const character = Number(row.startCharacter) >= 0 ? Number(row.startCharacter) + 1 : 1;
    return `${line}:${character}`;
}

function describeSource(row: LspDiagnosticRow): string {
    const parts = [row.source, row.code]
        .filter(value => value !== undefined && value !== null && String(value).trim())
        .map(value => String(value).trim());
    return parts.length ? ` (${parts.join('/')})` : '';
}

/**
 * Run diagnostics for one or more files and open a result panel.
 * `/check` with no arguments only prints usage: silently checking the whole
 * workspace would spawn a server per file and can take minutes.
 */
export async function runLspDiagnosticsCommand(ctx: CommandHandlerContext, args: string): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    const requested = String(args || '').trim().split(/\s+/).filter(Boolean);
    if (!requested.length) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'lspDiagnosticsUsage'));
        return true;
    }
    if (!ctx.invokeTool) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'lspDiagnosticsUnsupported'));
        return true;
    }
    const files = requested.map(filePath => resolveLspDiagnosticPath(filePath, ctx.workspace));
    const lines: string[] = [];
    let errors = 0;
    let warnings = 0;
    let diagnosticsCount = 0;
    let reportedFiles = 0;
    for (const filePath of files) {
        try {
            await ctx.activateTool?.('lsp_diagnostics');
            const result = await ctx.invokeTool('lsp_diagnostics', { filePath });
            if (!result || result.available === false || !Array.isArray(result.diagnostics)) {
                lines.push(formatAgentUiNotice(ctx.translator, 'lspDiagnosticsUnavailable', {
                    file: filePath,
                    message: String(result?.message || '')
                }));
                continue;
            }
            reportedFiles++;
            const diagnostics = result.diagnostics as LspDiagnosticRow[];
            if (!diagnostics.length) {
                lines.push(formatAgentUiNotice(ctx.translator, 'lspDiagnosticsNone', { file: filePath }));
                continue;
            }
            diagnosticsCount += diagnostics.length;
            lines.push(`${filePath} · ${diagnostics.length}`);
            for (const row of diagnostics) {
                if (row.severity === 1) {
                    errors++;
                } else if (row.severity === 2) {
                    warnings++;
                }
                lines.push(`  ${severityLabel(ctx.translator, row.severity)} ${position(row)} ${String(row.message || '')}${describeSource(row)}`);
            }
        } catch (error: any) {
            lines.push(formatAgentUiNotice(ctx.translator, 'lspDiagnosticsFailed', {
                file: filePath,
                error: error?.message || String(error)
            }));
        }
    }
    if (reportedFiles > 0) {
        lines.unshift(formatAgentUiNotice(ctx.translator, 'lspDiagnosticsSummary', {
            errors,
            warnings,
            total: diagnosticsCount
        }));
    }
    ctx.state.openTextOverlay(
        formatAgentUiNotice(ctx.translator, 'lspDiagnosticsTitle'),
        lines.length ? lines : [formatAgentUiNotice(ctx.translator, 'lspDiagnosticsNone', { file: files.join(', ') })],
        Math.min(24, Math.max(4, lines.length || 1))
    );
    return true;
}
