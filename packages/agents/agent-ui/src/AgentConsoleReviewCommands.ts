import type { CommandHandlerContext } from './AgentConsoleCommandHandlerContext';
import { formatAgentUiNotice } from './agent-ui.i18n';

export async function handleReview(ctx: CommandHandlerContext, args: string, _resolved: { command: string; matches: string[] }): Promise<boolean> {
    if (ctx.isTurnInProgress()) {
        ctx.notifyBusyState();
        return true;
    }
    if (args) {
        const arg = args.trim();
        const canAnnotate = !!ctx.state.reviewOpen && ctx.state.reviewFileSections.length > 0;
        const notifyReviewClosed = () => ctx.notify(formatAgentUiNotice(ctx.translator, 'reviewOpenFirst'));
        if (arg === 'summary') {
            const lines = ctx.state.getReviewAnnotationSummary();
            ctx.notify(lines.join('\n'));
            return true;
        }
        if (arg === 'approve-all') {
            if (!canAnnotate) { notifyReviewClosed(); return true; }
            ctx.state.approveAllReviewFiles();
            ctx.notify(formatAgentUiNotice(ctx.translator, 'allFilesApproved'));
            return true;
        }
        if (arg === 'clear-all') {
            if (!canAnnotate) { notifyReviewClosed(); return true; }
            ctx.state.clearAllReviewAnnotations();
            ctx.notify(formatAgentUiNotice(ctx.translator, 'allAnnotationsCleared'));
            return true;
        }
        if (arg === 'clear') {
            if (!canAnnotate) { notifyReviewClosed(); return true; }
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
            ctx.notify(report.join('\n'));
            return true;
        }
        if (arg === 'risk') {
            const sections = ctx.state.reviewFileSections;
            if (!sections.length) {
                ctx.notify(formatAgentUiNotice(ctx.translator, 'reviewFilesAnalyze'));
                return true;
            }
            const riskLines = sections.map(section => {
                const risk = ctx.state.computeFileRiskScore(section);
                const annot = ctx.state.reviewFileAnnotations[section.path];
                const marker = annot ? (annot.status === 'approved' ? ' ✓' : ' ✗') : '';
                return formatAgentUiNotice(ctx.translator, 'riskTableRow', { score: String(risk.score).padStart(2, ' '), riskLevel: risk.level.padEnd(8, ' '), path: section.path, additions: section.additions, deletions: section.deletions, marker, comment: annot?.comment ? ` - ${annot.comment}` : '' });
            });
            ctx.notify(riskLines.join('\n'));
            return true;
        }
        if (arg.startsWith('approve')) {
            if (!canAnnotate) { notifyReviewClosed(); return true; }
            const comment = arg.slice(7).trim() || undefined;
            ctx.state.setReviewFileAnnotation('approved', comment);
            ctx.notify(comment ? formatAgentUiNotice(ctx.translator, 'fileApprovedWithComment', { comment: comment }) : formatAgentUiNotice(ctx.translator, 'fileApproved'));
            return true;
        }
        if (arg.startsWith('reject')) {
            if (!canAnnotate) { notifyReviewClosed(); return true; }
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

