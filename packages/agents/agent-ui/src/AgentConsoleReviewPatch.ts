import type {
    AgentConsoleReviewDiffSection,
    AgentConsoleReviewHunk,
    AgentConsoleSessionState
} from './AgentConsoleSessionState';

/** Review patch rendering, folding and export report. */
export function getReviewExportReport(state: AgentConsoleSessionState): string[] {
        const lines: string[] = [];
        const task = state.filteredReviewTaskChoices.find(t => t.id === state.selectedReviewTaskId);
        lines.push(`# Review Report`);
        lines.push(`Task: ${(task?.title ?? state.selectedReviewTaskId) || '(none)'}`);
        lines.push(`Date: ${new Date().toISOString()}`);
        lines.push(`Status: ${task?.status ?? 'unknown'}`);
        lines.push('');
        const fileEntries = Object.entries(state.reviewFileAnnotations);
        const hunkEntries = Object.entries(state.reviewHunkAnnotations);
        if (!fileEntries.length && !hunkEntries.length) {
            lines.push(state.translateLabel('agent.menu.panel.review.annotationsNone', undefined, 'No annotations.'));
            return lines;
        }
        if (fileEntries.length) {
            const approved = fileEntries.filter(([, a]) => a.status === 'approved');
            const rejected = fileEntries.filter(([, a]) => a.status === 'rejected');
            lines.push(`## File Annotations`);
            lines.push(`- Approved: ${approved.length}`);
            lines.push(`- Rejected: ${rejected.length}`);
            lines.push('');
            for (const [path, annot] of fileEntries) {
                lines.push(`- ${annot.status === 'approved' ? '✓' : '✗'} ${path}${annot.comment ? `: ${annot.comment}` : ''}`);
            }
            lines.push('');
        }
        if (hunkEntries.length) {
            const hApproved = hunkEntries.filter(([, a]) => a.status === 'approved');
            const hRejected = hunkEntries.filter(([, a]) => a.status === 'rejected');
            lines.push(`## Hunk Annotations`);
            lines.push(`- Approved: ${hApproved.length}`);
            lines.push(`- Rejected: ${hRejected.length}`);
            lines.push('');
            for (const [key, annot] of hunkEntries) {
                lines.push(`- ${annot.status === 'approved' ? '✓' : '✗'} ${key}${annot.comment ? `: ${annot.comment}` : ''}`);
            }
            lines.push('');
        }
        return lines;
    }
export function buildReviewAssessmentLines(state: AgentConsoleSessionState): string[] {
        const lines: string[] = [];
        const status = String(state.reviewTask?.status || '').trim().toLowerCase();
        const aggregate = state.reviewTask?.result?.aggregate;
        const checkpoints = Array.isArray(state.reviewTask?.metadata?.checkpoints)
            ? state.reviewTask?.metadata?.checkpoints
            : [];
        const availableCheckpoints = checkpoints.filter((entry: any) => entry?.status === 'available').length;
        const invalidatedCheckpoints = checkpoints.filter((entry: any) => entry?.status === 'invalidated').length;
        const workerFailures = state.reviewWorkers.filter(worker => worker.error || String(worker.status || '').trim().toLowerCase() === 'failed').length;
        const sections = state.aggregateReviewFileSections;
        const rollback = state.reviewTask?.result?.rollback;
        const lineageTasks = state.currentReviewLineageTasks;
        const selectedTaskId = String(state.reviewTask?.id || state.selectedReviewTaskId || '').trim();
        const lineageIndex = lineageTasks.length
            ? Math.max(0, lineageTasks.findIndex(item => item.id === selectedTaskId))
            : -1;

        const reviewState = rollback?.rolledBackAt
            ? state.translateLabel('agent.menu.panel.review.stateRollbackApplied', undefined, 'rollback applied')
            : status === 'failed' || status === 'error' || workerFailures > 0
                ? state.translateLabel('agent.menu.panel.review.stateNeedsAttention', undefined, 'needs attention')
                : status === 'running' || status === 'planned'
                    ? state.translateLabel('agent.menu.panel.review.stateInProgress', undefined, 'in progress')
                    : rollback?.available === true || availableCheckpoints > 0
                        ? state.translateLabel('agent.menu.panel.review.stateReadyRollback', undefined, 'ready · rollback available')
                        : status === 'completed'
                            ? state.translateLabel('agent.menu.panel.review.stateReady', undefined, 'ready')
                            : state.translateLabel('agent.menu.panel.review.statePending', undefined, 'pending');
        const reviewSummary = lineageTasks.length > 1 && lineageIndex >= 0 ? state.translateLabel('agent.menu.panel.review.summaryLineage', { state: reviewState, index: lineageIndex + 1, total: lineageTasks.length }, `${reviewState} · lineage ${lineageIndex + 1}/${lineageTasks.length}`) : reviewState;
        lines.push(state.translateLabel('agent.menu.panel.review.summary', { state: reviewSummary }, `Review: ${reviewSummary}`));

        const scopeParts = [
            sections.length ? state.translateLabel(sections.length === 1 ? 'agent.menu.panel.review.scopeFilesOne' : 'agent.menu.panel.review.scopeFiles', { count: sections.length }, sections.length === 1 ? '{count} file changed' : '{count} files changed') : '',
            state.reviewWorkers.length ? state.translateLabel(state.reviewWorkers.length === 1 ? 'agent.menu.panel.review.scopeWorkersOne' : 'agent.menu.panel.review.scopeWorkers', { count: state.reviewWorkers.length }, state.reviewWorkers.length === 1 ? '{count} worker' : '{count} workers') : '',
            lineageTasks.length > 1 ? state.translateLabel('agent.menu.panel.review.scopeLineage', { count: lineageTasks.length }, `lineage ${lineageTasks.length} tasks`) : ''
        ].filter(Boolean);
        if (scopeParts.length) {
            lines.push(state.translateLabel('agent.menu.panel.review.scope', { parts: scopeParts.join(' · ') }, `Scope: ${scopeParts.join(' · ')}`));
        }
        if (aggregate) {
            const failedSuffix = aggregate.failedWorkers ? state.translateLabel('agent.menu.panel.review.workersFailed', { count: aggregate.failedWorkers }, ` · ${aggregate.failedWorkers} failed`) : '';
            lines.push(state.translateLabel('agent.menu.panel.review.workersLine', { status: aggregate.status, completed: aggregate.completedWorkers, total: aggregate.totalWorkers }, `Workers: ${aggregate.status} · ${aggregate.completedWorkers}/${aggregate.totalWorkers} completed`) + failedSuffix);
        }

        const riskParts = [
            workerFailures > 0 ? state.translateLabel(workerFailures === 1 ? 'agent.menu.panel.review.riskWorkersOne' : 'agent.menu.panel.review.riskWorkers', { count: workerFailures }, workerFailures === 1 ? '{count} worker failure' : '{count} worker failures') : '',
            !rollback?.available && availableCheckpoints === 0 && (status === 'completed' || status === 'failed' || status === 'error')
                ? state.translateLabel('agent.menu.panel.review.rollbackUnavailable', undefined, 'rollback unavailable')
                : '',
            invalidatedCheckpoints > 0 ? state.translateLabel(invalidatedCheckpoints === 1 ? 'agent.menu.panel.review.riskInvalidatedOne' : 'agent.menu.panel.review.riskInvalidated', { count: invalidatedCheckpoints }, invalidatedCheckpoints === 1 ? '{count} invalidated checkpoint' : '{count} invalidated checkpoints') : '',
            !sections.length && !String(state.reviewDiff?.summary || state.reviewTask?.result?.diff?.summary || '').trim()
                ? state.translateLabel('agent.menu.panel.review.riskNoDiff', undefined, 'no diff captured')
                : ''
        ].filter(Boolean);
        if (riskParts.length) {
            lines.push(state.translateLabel('agent.menu.panel.review.risks', { parts: riskParts.join(' · ') }, `Risks: ${riskParts.join(' · ')}`));
        }
        const isolatedFailures = Array.isArray(aggregate?.isolatedFailures) ? aggregate.isolatedFailures : [];
        if (isolatedFailures.length) {
            lines.push(state.translateLabel('agent.menu.panel.review.workerFailures', { list: isolatedFailures.slice(0, 2).map((failure: any) => `${failure.workerId}: ${failure.error}`).join(' · ') }, `Worker Failures: ${isolatedFailures.slice(0, 2).map((failure: any) => `${failure.workerId}: ${failure.error}`).join(' · ')}`));
        }

        return lines;
    }
export function filterReviewPatchLines(state: AgentConsoleSessionState, lines: string[]): string[] {
        if (state.selectedReviewPatchFilter !== 'additions') {
            return lines.slice();
        }
        return lines.filter(line => line.startsWith('diff --git ')
            || line.startsWith('index ')
            || line.startsWith('--- ')
            || line.startsWith('+++ ')
            || line.startsWith('@@')
            || (line.startsWith('+') && !line.startsWith('+++')));
    }
export function parseReviewHunks(state: AgentConsoleSessionState, section: AgentConsoleReviewDiffSection): AgentConsoleReviewHunk[] {
        const hunks: AgentConsoleReviewHunk[] = [];
        let current: AgentConsoleReviewHunk | undefined;
        for (let index = 0; index < section.lines.length; index++) {
            const line = section.lines[index];
            if (line.startsWith('@@')) {
                if (current) {
                    current.endIndex = index;
                    hunks.push(current);
                }
                current = {
                    header: line,
                    context: resolveReviewHunkContext(line),
                    startIndex: index,
                    endIndex: section.lines.length,
                    additions: 0,
                    deletions: 0
                };
                continue;
            }
            if (current) {
                if (line.startsWith('+') && !line.startsWith('+++')) {
                    current.additions += 1;
                } else if (line.startsWith('-') && !line.startsWith('---')) {
                    current.deletions += 1;
                }
            }
        }
        if (current) {
            hunks.push(current);
        }
        return hunks;
    }
export function resolveReviewHunkContext(header: string): string {
        const match = /^@@[^@]*@@\s*(.*)$/.exec(String(header || '').trim());
        return String(match?.[1] || '').trim();
    }
export function isReviewHunkFolded(state: AgentConsoleSessionState, groupKey: string, path: string, hunkIndex: number): boolean {
        return state.foldedReviewHunks.has(`${groupKey}:${path}#${hunkIndex}`);
    }
export function toggleReviewHunkFold(state: AgentConsoleSessionState): void {
        if (!state.reviewOpen) {
            return;
        }
        const group = state.selectedReviewGroup;
        const section = state.selectedReviewFileSection;
        if (!group || !section) {
            return;
        }
        const hunks = parseReviewHunks(state, section);
        if (!hunks.length) {
            return;
        }
        const index = Math.max(0, Math.min(hunks.length - 1, state.selectedReviewHunkIndex));
        const key = `${group.key}:${section.path}#${index}`;
        if (state.foldedReviewHunks.has(key)) {
            state.foldedReviewHunks.delete(key);
        } else {
            state.foldedReviewHunks.add(key);
        }
        clampReviewDetailScroll(state);
    }
export function clampReviewDetailScroll(state: AgentConsoleSessionState): void {
        const lines = state.reviewDetailLines;
        state.reviewDetailScroll = Math.max(0, Math.min(state.reviewDetailScroll, Math.max(0, lines.length - state.consoleOptions.reviewDetailVisibleLines)));
    }
export function renderReviewPatchLines(state: AgentConsoleSessionState, section: AgentConsoleReviewDiffSection, groupKey: string): string[] {
        if (state.reviewSideBySide) {
            return renderReviewPatchSideBySide(state, section, groupKey);
        }
        const hunks = parseReviewHunks(state, section);
        if (!hunks.length) {
            return filterReviewPatchLines(state, section.lines);
        }
        const lines: string[] = [];
        let cursor = 0;
        for (let hunkIndex = 0; hunkIndex < hunks.length; hunkIndex++) {
            const hunk = hunks[hunkIndex];
            lines.push(...filterReviewPatchLines(state, section.lines.slice(cursor, hunk.startIndex)));
            const hunkAnnot = state.getReviewHunkAnnotation(section.path, hunkIndex);
            const hunkMark = hunkAnnot ? (hunkAnnot.status === 'approved' ? ' ✓' : ' ✗') : '';
            lines.push(`${hunk.header}${hunkMark}`);
            if (isReviewHunkFolded(state, groupKey, section.path, hunkIndex)) {
                lines.push(buildReviewFoldedHunkSummary(state, hunk));
            } else {
                lines.push(...filterReviewPatchLines(state, section.lines.slice(hunk.startIndex + 1, hunk.endIndex)));
            }
            cursor = hunk.endIndex;
        }
        lines.push(...filterReviewPatchLines(state, section.lines.slice(cursor)));
        return lines;
    }
export function renderReviewPatchSideBySide(state: AgentConsoleSessionState, section: AgentConsoleReviewDiffSection, groupKey: string): string[] {
        const hunks = parseReviewHunks(state, section);
        if (!hunks.length) {
            return buildSideBySidePatchRows(filterReviewPatchLines(state, section.lines));
        }
        const lines: string[] = [];
        let cursor = 0;
        for (let hunkIndex = 0; hunkIndex < hunks.length; hunkIndex++) {
            const hunk = hunks[hunkIndex];
            lines.push(...filterReviewPatchLines(state, section.lines.slice(cursor, hunk.startIndex)));
            const hunkAnnot = state.getReviewHunkAnnotation(section.path, hunkIndex);
            const hunkMark = hunkAnnot ? (hunkAnnot.status === 'approved' ? ' ✓' : ' ✗') : '';
            lines.push(`${hunk.header}${hunkMark}`);
            if (isReviewHunkFolded(state, groupKey, section.path, hunkIndex)) {
                lines.push(buildReviewFoldedHunkSummary(state, hunk));
            } else {
                lines.push(...buildSideBySidePatchRows(filterReviewPatchLines(state, section.lines.slice(hunk.startIndex + 1, hunk.endIndex))));
            }
            cursor = hunk.endIndex;
        }
        lines.push(...buildSideBySidePatchRows(filterReviewPatchLines(state, section.lines.slice(cursor))));
        return lines;
    }
export function buildSideBySidePatchRows(lines: string[]): string[] {
        const rows: string[] = [];
        let oldLines: string[] = [];
        let newLines: string[] = [];
        const flush = () => {
            if (!oldLines.length && !newLines.length) {
                return;
            }
            const oldWidth = Math.max(0, ...oldLines.map(line => line.length));
            const newWidth = Math.max(0, ...newLines.map(line => line.length));
            const rowCount = Math.max(oldLines.length, newLines.length);
            for (let index = 0; index < rowCount; index++) {
                const oldCell = oldLines[index] ?? '';
                const newCell = newLines[index] ?? '';
                rows.push(`${oldCell.padEnd(oldWidth)} │ ${newCell.padEnd(newWidth)}`);
            }
            oldLines = [];
            newLines = [];
        };
        for (const line of lines) {
            if (line.startsWith('-') && !line.startsWith('---')) {
                oldLines.push(line.slice(1));
            } else if (line.startsWith('+') && !line.startsWith('+++')) {
                newLines.push(line.slice(1));
            } else if (line.startsWith(' ')) {
                oldLines.push(line.slice(1));
                newLines.push(line.slice(1));
            } else {
                flush();
                rows.push(line);
            }
        }
        flush();
        return rows;
    }
export function toggleReviewSideBySide(state: AgentConsoleSessionState): void {
        if (!state.reviewOpen) {
            return;
        }
        state.reviewSideBySide = !state.reviewSideBySide;
        clampReviewDetailScroll(state);
    }
export function buildReviewFoldedHunkSummary(state: AgentConsoleSessionState, hunk: AgentConsoleReviewHunk): string {
        const context = hunk.context ? ` · ${hunk.context}` : '';
        return state.translateLabel('agent.menu.panel.review.foldedHunk', { additions: hunk.additions, deletions: hunk.deletions, context: context }, `  ⋯ folded hunk +${hunk.additions} -${hunk.deletions}${context} (f expand)`);
    }


/** Normalize a review payload (string/text/diff/output) into display text. */
export function stringifyReviewContent(value: any): string {
    if (value == null) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value?.text === 'string') return value.text.trim();
    if (typeof value?.diff === 'string') return value.diff.trim();
    if (typeof value?.output === 'string') return value.output.trim();
    if (typeof value?.output?.text === 'string') return value.output.text.trim();
    if (typeof value?.output?.diff === 'string') return value.output.diff.trim();
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

/** Split a unified diff into review sections with add/delete/rename status. */
export function parseUnifiedDiffSections(diffText: string): AgentConsoleReviewDiffSection[] {
    const text = String(diffText || '').trim();
    if (!text) return [];
    const sourceLines = text.split('\n');
    const sections: AgentConsoleReviewDiffSection[] = [];
    let current: AgentConsoleReviewDiffSection | undefined;

    const pushCurrent = () => {
        if (!current?.lines.length) return;
        const joined = current.lines.join('\n');
        const renameFrom = /^rename from (.+)$/m.exec(joined)?.[1]?.trim();
        const renameTo = /^rename to (.+)$/m.exec(joined)?.[1]?.trim();
        if (renameTo) {
            current.path = renameTo;
            current.previousPath = renameFrom;
            current.status = 'rename';
        } else if (/^new file mode /m.test(joined) || /^--- \/dev\/null$/m.test(joined)) {
            current.status = 'add';
        } else if (/^deleted file mode /m.test(joined) || /^\+\+\+ \/dev\/null$/m.test(joined)) {
            current.status = 'delete';
        } else {
            current.status = 'update';
        }
        sections.push(current);
    };

    const resolveHeaderPath = (line: string): string => {
        const match = /^diff --git a\/(.+?) b\/(.+)$/.exec(String(line || '').trim());
        return match ? (match[2] || match[1] || 'unknown') : 'unknown';
    };
    const resolveMarkerPath = (line: string, fallback: string): string => {
        const match = /^\+\+\+\s+(?:b\/)?(.+)$/.exec(String(line || '').trim());
        if (!match) return fallback;
        const path = String(match[1] || '').trim();
        return path && path !== '/dev/null' ? path : fallback;
    };

    for (const line of sourceLines) {
        if (line.startsWith('diff --git ')) {
            pushCurrent();
            current = { path: resolveHeaderPath(line), additions: 0, deletions: 0, lines: [line] };
            continue;
        }
        if (!current) {
            current = { path: 'unknown', additions: 0, deletions: 0, lines: [] };
        }
        current.lines.push(line);
        if (line.startsWith('+++ ')) {
            current.path = resolveMarkerPath(line, current.path);
        } else if (line.startsWith('+') && !line.startsWith('+++')) {
            current.additions += 1;
        } else if (line.startsWith('-') && !line.startsWith('---')) {
            current.deletions += 1;
        }
    }
    pushCurrent();
    return sections;
}
