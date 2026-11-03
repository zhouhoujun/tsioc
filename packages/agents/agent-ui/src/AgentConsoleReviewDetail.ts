import type { AgentConsoleSessionState } from './AgentConsoleSessionState';

/** Review detail projection and its scroll/hunk navigation. */
export function resolveReviewDetailLines(state: AgentConsoleSessionState): string[] {
    const lines: string[] = [];
    const summary = state.reviewDiff?.summary ?? state.reviewTask?.result?.diff?.summary;
    if (summary) {
        lines.push(`Summary: ${summary}`);
    }
    lines.push(...state.buildReviewAssessmentLines());

    const rollback = state.reviewTask?.result?.rollback;
    if (rollback) {
        const rollbackParts = [
            rollback.available === true ? 'available' : 'unavailable',
            rollback.mode ? `mode ${rollback.mode}` : '',
            rollback.checkpointId ? `checkpoint ${rollback.checkpointId}` : '',
            rollback.rolledBackAt ? `applied ${new Date(rollback.rolledBackAt).toISOString()}` : '',
            rollback.reason ? rollback.reason : ''
        ].filter(Boolean);
        if (rollbackParts.length) {
            lines.push(`Rollback: ${rollbackParts.join(' · ')}`);
        }
    }

    const retryWorkerIds = Array.isArray(state.reviewTask?.metadata?.retryOfWorkerIds)
        ? state.reviewTask.metadata.retryOfWorkerIds.filter((item: any) => typeof item === 'string' && item)
        : [];
    if (retryWorkerIds.length) {
        lines.push(`Retry Workers: ${retryWorkerIds.join(', ')}`);
    }
    const carryForwardWorkerIds = Array.isArray(state.reviewTask?.metadata?.carryForwardWorkerIds)
        ? state.reviewTask.metadata.carryForwardWorkerIds.filter((item: any) => typeof item === 'string' && item)
        : [];
    if (carryForwardWorkerIds.length) {
        lines.push(state.translateLabel(
            'agent.menu.panel.review.carryForward',
            { ids: carryForwardWorkerIds.join(', ') },
            `Carry Forward: ${carryForwardWorkerIds.join(', ')}`
        ));
    }
    const checkpoints = Array.isArray(state.reviewTask?.metadata?.checkpoints)
        ? state.reviewTask?.metadata?.checkpoints
        : [];
    if (checkpoints.length) {
        const available = checkpoints.filter((entry: any) => entry?.status === 'available').length;
        const applied = checkpoints.filter((entry: any) => entry?.status === 'applied').length;
        const invalidated = checkpoints.filter((entry: any) => entry?.status === 'invalidated').length;
        lines.push(state.translateLabel(
            'agent.menu.panel.review.checkpoints',
            { total: checkpoints.length, available, applied, invalidated },
            `Checkpoints: ${checkpoints.length} total · ${available} available · ${applied} applied · ${invalidated} invalidated`
        ));
    }

    const groups = state.reviewGroups;
    if (groups.length) {
        const selectedGroup = state.selectedReviewGroup || groups[0];
        lines.push(state.translateLabel('agent.menu.panel.review.groups', { count: groups.length }, `Groups: ${groups.length}`));
        for (let index = 0; index < groups.length; index++) {
            const group = groups[index];
            const marker = index === state.selectedReviewGroupIndex ? '›' : ' ';
            lines.push(`${marker} [${index + 1}/${groups.length}] ${state.describeReviewGroup(group)}`);
        }
        if (selectedGroup) {
            lines.push(state.translateLabel(
                'agent.menu.panel.review.currentGroup',
                { group: state.describeReviewGroup(selectedGroup) },
                `Current Group: ${state.describeReviewGroup(selectedGroup)}`
            ));
            const groupMetaLines = state.buildSelectedReviewGroupMetaLines(selectedGroup);
            if (groupMetaLines.length) {
                lines.push(...groupMetaLines);
            }
            const sections = selectedGroup.sections;
            if (sections.length) {
                const selectedSection = state.selectedReviewFileSection || sections[0];
                lines.push(state.translateLabel('agent.menu.panel.review.files', { count: sections.length }, `Files: ${sections.length}`));
                for (let index = 0; index < sections.length; index++) {
                    const section = sections[index];
                    const marker = index === state.selectedReviewFileIndex ? '›' : ' ';
                    const annotation = state.reviewFileAnnotations[section.path];
                    const annotationMark = annotation ? (annotation.status === 'approved' ? ' ✓' : ' ✗') : '';
                    lines.push(`${marker} [${index + 1}/${sections.length}] ${section.path} (+${section.additions} -${section.deletions})${annotationMark}`);
                }
                if (selectedSection) {
                    const annotation = state.reviewFileAnnotations[selectedSection.path];
                    const annotationLine = annotation
                        ? `${state.translateLabel(
                            annotation.status === 'approved'
                                ? 'agent.menu.panel.review.annotationApproved'
                                : 'agent.menu.panel.review.annotationRejected',
                            undefined,
                            `  Annotation: ${annotation.status === 'approved' ? 'approved' : 'rejected'}`
                        )}${annotation.comment ? ` · ${annotation.comment}` : ''}`
                        : state.translateLabel('agent.menu.panel.review.annotationHint', undefined, '  [a]pprove  [r]eject  [c]lear annotation');
                    lines.push(state.translateLabel(
                        'agent.menu.panel.review.currentFile',
                        { path: selectedSection.path, additions: selectedSection.additions, deletions: selectedSection.deletions },
                        `Current File: ${selectedSection.path} (+${selectedSection.additions} -${selectedSection.deletions})`
                    ));
                    lines.push(annotationLine);
                    lines.push(...state.renderReviewPatchLines(selectedSection, selectedGroup.key));
                }
            } else if (selectedGroup.diffText) {
                lines.push(state.translateLabel('agent.menu.panel.review.currentPatch', undefined, 'Current Patch'));
                lines.push(...state.filterReviewPatchLines(selectedGroup.diffText.split('\n')));
            } else if (selectedGroup.error) {
                lines.push(state.translateLabel('agent.menu.panel.review.currentError', { error: selectedGroup.error }, `Current Error: ${selectedGroup.error}`));
            }
        }
    }

    if (!groups.length && !lines.length) {
        lines.push(state.translateLabel('agent.menu.panel.review.noDiffCaptured', undefined, 'No diff captured.'));
    }

    return lines.map(line => state.expandTabs(line));
}

export function resolveReviewDetailMaxColumn(state: AgentConsoleSessionState): number {
    return state.reviewDetailLines.reduce((max, line) => Math.max(max, line.length), 0);
}

export function scrollReviewDetail(state: AgentConsoleSessionState, delta: number): void {
    if (!state.reviewOpen) {
        return;
    }
    const maxScroll = Math.max(0, state.reviewDetailLines.length - state.consoleOptions.reviewDetailVisibleLines);
    state.reviewDetailScroll = Math.max(0, Math.min(maxScroll, state.reviewDetailScroll + delta));
}

export function scrollReviewDetailPage(state: AgentConsoleSessionState, delta: number, pageSize?: number): void {
    if (!state.reviewOpen) {
        return;
    }
    const resolvedPageSize = pageSize ?? state.consoleOptions.reviewDetailPageSize;
    scrollReviewDetail(state, delta * Math.max(1, resolvedPageSize));
}

export function scrollReviewDetailToEdge(state: AgentConsoleSessionState, position: 'start' | 'end'): void {
    if (!state.reviewOpen) {
        return;
    }
    state.reviewDetailScroll = position === 'start'
        ? 0
        : Math.max(0, state.reviewDetailLines.length - state.consoleOptions.reviewDetailVisibleLines);
}

export function jumpReviewHunk(state: AgentConsoleSessionState, direction: -1 | 1): void {
    if (!state.reviewOpen) return;
    const group = state.selectedReviewGroup;
    const section = state.selectedReviewFileSection;
    if (!group || !section) return;
    const hunks = state.parseReviewHunks(section);
    if (!hunks.length) return;
    const count = hunks.length;
    const current = Math.max(0, Math.min(count - 1, state.selectedReviewHunkIndex));
    state.selectedReviewHunkIndex = (current + direction + count) % count;
    const detailLines = state.reviewDetailLines;
    const patchStart = detailLines.findIndex(line => line.startsWith('diff --git '));
    const base = patchStart >= 0 ? patchStart : 0;
    const rendered = state.renderReviewPatchLines(section, group.key);
    let renderedOffset = -1;
    let seen = 0;
    for (let index = 0; index < rendered.length; index++) {
        if (rendered[index].startsWith('@@')) {
            if (seen === state.selectedReviewHunkIndex) {
                renderedOffset = index;
                break;
            }
            seen++;
        }
    }
    state.reviewDetailScroll = renderedOffset >= 0 ? Math.max(0, base + renderedOffset - 2) : 0;
}

export function scrollReviewDetailColumns(state: AgentConsoleSessionState, delta: number): void {
    if (!state.reviewOpen) {
        return;
    }
    const maxScroll = Math.max(0, state.reviewDetailMaxColumn - 1);
    state.reviewDetailColumnScroll = Math.max(0, Math.min(maxScroll, state.reviewDetailColumnScroll + delta));
}

export function scrollReviewDetailColumnsToEdge(state: AgentConsoleSessionState, position: 'start' | 'end'): void {
    if (!state.reviewOpen) {
        return;
    }
    state.reviewDetailColumnScroll = position === 'start'
        ? 0
        : Math.max(0, state.reviewDetailMaxColumn - 1);
}
