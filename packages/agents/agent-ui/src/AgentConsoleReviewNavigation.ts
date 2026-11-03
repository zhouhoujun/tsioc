import type {
    AgentConsoleReviewDiffSection,
    AgentConsoleReviewGroup,
    AgentConsoleReviewPatchFilter,
    AgentConsoleSessionState
} from './AgentConsoleSessionState';

/** Review group/file projection and selection, independent of the state class. */
export function resolveReviewExecutionMode(state: AgentConsoleSessionState): 'sequential' | 'parallel' | null {
    const mode = state.reviewTask?.result?.executionMode
        ?? state.reviewTask?.metadata?.executionMode
        ?? null;
    return mode === 'parallel' || mode === 'sequential' ? mode : null;
}

export function resolveReviewGroups(state: AgentConsoleSessionState): AgentConsoleReviewGroup[] {
    const groups: AgentConsoleReviewGroup[] = [];
    const aggregateText = state.stringifyReviewContent(state.reviewDiff);
    if (aggregateText || state.reviewDiff || state.reviewTask?.result?.diff) {
        groups.push({
            key: 'aggregate',
            kind: 'aggregate',
            label: 'aggregate',
            status: state.reviewTask?.status,
            diffText: aggregateText,
            sections: state.parseUnifiedDiffSections(aggregateText)
        });
    }
    for (let index = 0; index < state.reviewWorkers.length; index++) {
        const worker = state.reviewWorkers[index];
        const diffText = state.stringifyReviewContent(worker.diff ?? worker.output);
        groups.push({
            key: `worker:${worker.workerId || index + 1}`,
            kind: 'worker',
            label: worker.workerId || `worker-${index + 1}`,
            status: worker.status,
            workerId: worker.workerId,
            branch: worker.branch,
            worktreePath: worker.worktreePath,
            actionIds: worker.actionIds,
            error: worker.error,
            diffText,
            sections: state.parseUnifiedDiffSections(diffText)
        });
    }
    return groups;
}

export function resolveSelectedReviewGroup(state: AgentConsoleSessionState): AgentConsoleReviewGroup | undefined {
    const groups = state.reviewGroups;
    if (!groups.length) {
        return undefined;
    }
    const nextIndex = Math.max(0, Math.min(groups.length - 1, state.selectedReviewGroupIndex));
    return groups[nextIndex];
}

export function resolveAggregateReviewFileSections(state: AgentConsoleSessionState): AgentConsoleReviewDiffSection[] {
    const files = new Map<string, AgentConsoleReviewDiffSection>();
    for (const section of state.parseUnifiedDiffSections(state.stringifyReviewContent(state.reviewDiff))) {
        const current = files.get(section.path);
        if (current) {
            current.additions += section.additions;
            current.deletions += section.deletions;
            current.lines.push(...section.lines);
            current.status = section.status === 'delete' ? 'delete' : current.status === 'add' ? 'add' : section.status || current.status;
        } else {
            files.set(section.path, { ...section, lines: section.lines.slice() });
        }
    }
    return Array.from(files.values());
}

export function resolveReviewFileSections(state: AgentConsoleSessionState): AgentConsoleReviewDiffSection[] {
    return state.selectedReviewGroup?.sections || state.aggregateReviewFileSections;
}

export function setSelectedReviewGroupIndex(state: AgentConsoleSessionState, index: number): void {
    const groups = state.reviewGroups;
    if (!groups.length) {
        return;
    }
    const nextIndex = Math.max(0, Math.min(groups.length - 1, index));
    if (nextIndex === state.selectedReviewGroupIndex) {
        return;
    }
    state.selectedReviewGroupIndex = nextIndex;
    state.selectedReviewFileIndex = 0;
    state.selectedReviewHunkIndex = 0;
    state.resetReviewDetailViewport();
}

export function moveReviewGroupSelection(state: AgentConsoleSessionState, delta: number): void {
    const groups = state.reviewGroups;
    if (!groups.length) {
        return;
    }
    const nextIndex = (state.selectedReviewGroupIndex + delta + groups.length) % groups.length;
    if (nextIndex === state.selectedReviewGroupIndex) {
        return;
    }
    state.selectedReviewGroupIndex = nextIndex;
    state.selectedReviewFileIndex = 0;
    state.selectedReviewHunkIndex = 0;
    state.resetReviewDetailViewport();
}

export function setReviewPatchFilter(state: AgentConsoleSessionState, filter: AgentConsoleReviewPatchFilter): void {
    if (state.selectedReviewPatchFilter === filter) {
        return;
    }
    state.selectedReviewPatchFilter = filter;
    state.resetReviewDetailViewport();
}

export function resolveSelectedReviewFileSection(state: AgentConsoleSessionState): AgentConsoleReviewDiffSection | undefined {
    const sections = state.reviewFileSections;
    if (!sections.length) {
        return undefined;
    }
    const nextIndex = Math.max(0, Math.min(sections.length - 1, state.selectedReviewFileIndex));
    return sections[nextIndex];
}

export function setSelectedReviewFileIndex(state: AgentConsoleSessionState, index: number): void {
    const sections = state.reviewFileSections;
    if (!sections.length) {
        return;
    }
    const nextIndex = Math.max(0, Math.min(sections.length - 1, index));
    if (nextIndex === state.selectedReviewFileIndex) {
        return;
    }
    state.selectedReviewFileIndex = nextIndex;
    state.selectedReviewHunkIndex = 0;
    state.resetReviewDetailViewport();
}

export function moveReviewFileSelection(state: AgentConsoleSessionState, delta: number): void {
    const sections = state.reviewFileSections;
    if (!sections.length) {
        return;
    }
    const nextIndex = (state.selectedReviewFileIndex + delta + sections.length) % sections.length;
    if (nextIndex === state.selectedReviewFileIndex) {
        return;
    }
    state.selectedReviewFileIndex = nextIndex;
    state.selectedReviewHunkIndex = 0;
    state.resetReviewDetailViewport();
}
