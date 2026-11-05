import type { AgentMessage } from '@tsdi/agent';
import type {
    AgentConsoleReviewAnnotation,
    AgentConsoleReviewDiffSection,
    AgentConsoleReviewGroup,
    AgentConsoleReviewHunk,
    AgentConsoleReviewPatchFilter,
    AgentConsoleReviewTaskItem,
    AgentConsoleReviewWorker
} from './AgentConsoleStateTypes';
import {
    buildFileChangeMessage as buildFileChangeMessageInState,
    clearReview as clearReviewInState,
    closeReview as closeReviewInState,
    openReview as openReviewInState,
    syncReviewFileSelection,
    syncReviewGroupSelection
} from './AgentConsoleReviewLifecycle';
import {
    jumpReviewHunk as jumpReviewHunkInState,
    resolveReviewDetailLines,
    resolveReviewDetailMaxColumn,
    scrollReviewDetail as scrollReviewDetailInState,
    scrollReviewDetailColumns as scrollReviewDetailColumnsInState,
    scrollReviewDetailColumnsToEdge as scrollReviewDetailColumnsToEdgeInState,
    scrollReviewDetailPage as scrollReviewDetailPageInState,
    scrollReviewDetailToEdge as scrollReviewDetailToEdgeInState
} from './AgentConsoleReviewDetail';
import {
    moveReviewFileSelection as moveReviewFileSelectionInState,
    moveReviewGroupSelection as moveReviewGroupSelectionInState,
    resolveAggregateReviewFileSections,
    resolveReviewExecutionMode,
    resolveReviewFileSections,
    resolveReviewGroups,
    resolveSelectedReviewFileSection,
    resolveSelectedReviewGroup,
    setReviewPatchFilter as setReviewPatchFilterInState,
    setSelectedReviewFileIndex as setSelectedReviewFileIndexInState
} from './AgentConsoleReviewNavigation';
import {
    buildReviewAssessmentLines as buildReviewAssessmentLinesInState,
    buildReviewFoldedHunkSummary as buildReviewFoldedHunkSummaryInState,
    buildSideBySidePatchRows as buildSideBySidePatchRowsInState,
    clampReviewDetailScroll as clampReviewDetailScrollInState,
    filterReviewPatchLines as filterReviewPatchLinesInState,
    getReviewExportReport as getReviewExportReportInState,
    isReviewHunkFolded as isReviewHunkFoldedInState,
    parseReviewHunks as parseReviewHunksInState,
    renderReviewPatchLines as renderReviewPatchLinesInState,
    renderReviewPatchSideBySide as renderReviewPatchSideBySideInState,
    toggleReviewHunkFold as toggleReviewHunkFoldInState,
    toggleReviewSideBySide as toggleReviewSideBySideInState
} from './AgentConsoleReviewPatch';
import {
    clearAllReviewAnnotations as clearAllReviewAnnotationsInState,
    clearReviewFileAnnotation as clearReviewFileAnnotationInState,
    clearReviewHunkAnnotation as clearReviewHunkAnnotationInState,
    collectReviewConclusions as collectReviewConclusionsInState,
    approveAllReviewFiles as approveAllReviewFilesInState,
    approveAllReviewHunksForFile as approveAllReviewHunksForFileInState,
    computeFileRiskScore as computeFileRiskScoreInState,
    getReviewAnnotationSummary as getReviewAnnotationSummaryInState,
    getReviewHunkAnnotation as getReviewHunkAnnotationInState,
    rejectAllReviewFiles as rejectAllReviewFilesInState,
    rejectAllReviewHunksForFile as rejectAllReviewHunksForFileInState,
    setReviewFileAnnotation as setReviewFileAnnotationInState,
    setReviewHunkAnnotation as setReviewHunkAnnotationInState,
    writeReviewConclusions as writeReviewConclusionsInState
} from './AgentConsoleReviewAnnotations';
import { syncFilteredTaskSelection as syncFilteredTaskSelectionInState } from './AgentConsoleReviewTaskState';
import { AgentConsoleSessionData } from './AgentConsoleSessionData';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';

/** Review and git-snapshot projection facade split from the session state. */
export abstract class AgentConsoleSessionReviewHost extends AgentConsoleSessionData {
    protected abstract self(): AgentConsoleSessionState;
    protected abstract syncDerivedInputFocus(): void;

    setReviewTasks(tasks: AgentConsoleReviewTaskItem[]): void {
        this.reviewTaskChoices = tasks.slice();
        syncFilteredTaskSelectionInState(this.self());
    }

    openReview(
        task?: Record<string, any> | null,
        payload?: {
            diff?: any;
            workers?: AgentConsoleReviewWorker[];
            executionMode?: 'sequential' | 'parallel' | null;
        }
    ): void {
        openReviewInState(this.self(), task, payload);
    }

    buildFileChangeMessage(): AgentMessage | null {
        return buildFileChangeMessageInState(this.self());
    }

    closeReview(): void {
        closeReviewInState(this.self());
    }

    openGitSnapshotDetail(header: string, lines: string[], stats?: string, ref?: string): void {
        this.gitSnapshotOpen = true;
        this.gitSnapshotCurrentRef = ref || '';
        this.gitSnapshotHeaderLabel = header;
        this.gitSnapshotStatsLabel = stats || '';
        this.gitSnapshotDetailLines = lines.slice();
        this.gitSnapshotDetailScroll = 0;
        this.gitSnapshotDetailColumnScroll = 0;
        this.syncDerivedInputFocus();
    }

    closeGitSnapshotDetail(): void {
        if (!this.gitSnapshotOpen && this.gitSnapshotDetailScroll === 0 && this.gitSnapshotDetailColumnScroll === 0) {
            return;
        }
        this.gitSnapshotOpen = false;
        this.gitSnapshotCurrentRef = '';
        this.gitSnapshotDetailLines = [];
        this.gitSnapshotDetailScroll = 0;
        this.gitSnapshotDetailColumnScroll = 0;
        this.syncDerivedInputFocus();
    }

    scrollGitSnapshotDetail(delta: number): void {
        if (!this.gitSnapshotOpen) {
            return;
        }
        const visible = this.consoleOptions.reviewDetailVisibleLines;
        const maxScroll = Math.max(0, this.gitSnapshotDetailLines.length - visible);
        this.gitSnapshotDetailScroll = Math.max(0, Math.min(maxScroll, this.gitSnapshotDetailScroll + delta));
    }

    scrollGitSnapshotDetailPage(delta: number, pageSize?: number): void {
        if (!this.gitSnapshotOpen) {
            return;
        }
        const resolvedPageSize = pageSize ?? this.consoleOptions.reviewDetailPageSize;
        this.scrollGitSnapshotDetail(delta * Math.max(1, resolvedPageSize));
    }

    scrollGitSnapshotDetailToEdge(position: 'start' | 'end'): void {
        if (!this.gitSnapshotOpen) {
            return;
        }
        const visible = this.consoleOptions.reviewDetailVisibleLines;
        this.gitSnapshotDetailScroll = position === 'start' ? 0 : Math.max(0, this.gitSnapshotDetailLines.length - visible);
    }

    scrollGitSnapshotDetailColumns(delta: number): void {
        if (!this.gitSnapshotOpen) {
            return;
        }
        this.gitSnapshotDetailColumnScroll = Math.max(0, this.gitSnapshotDetailColumnScroll + delta);
    }

    clearReview(): void {
        clearReviewInState(this.self());
    }

    get reviewExecutionMode(): 'sequential' | 'parallel' | null {
        return resolveReviewExecutionMode(this.self());
    }

    get reviewGroups(): AgentConsoleReviewGroup[] {
        return resolveReviewGroups(this.self());
    }

    get selectedReviewGroup(): AgentConsoleReviewGroup | undefined {
        return resolveSelectedReviewGroup(this.self());
    }

    get aggregateReviewFileSections(): AgentConsoleReviewDiffSection[] {
        return resolveAggregateReviewFileSections(this.self());
    }

    get reviewFileSections(): AgentConsoleReviewDiffSection[] {
        return resolveReviewFileSections(this.self());
    }

    moveReviewGroupSelection(delta: number): void {
        moveReviewGroupSelectionInState(this.self(), delta);
    }

    setReviewPatchFilter(filter: AgentConsoleReviewPatchFilter): void {
        setReviewPatchFilterInState(this.self(), filter);
    }

    setReviewFileAnnotation(status: 'approved' | 'rejected', comment?: string, filePath?: string): void {
        setReviewFileAnnotationInState(this.self(), status, comment, filePath);
    }

    clearReviewFileAnnotation(filePath?: string): void {
        clearReviewFileAnnotationInState(this.self(), filePath);
    }

    approveAllReviewFiles(comment?: string): void {
        approveAllReviewFilesInState(this.self(), comment);
    }

    rejectAllReviewFiles(comment?: string): void {
        rejectAllReviewFilesInState(this.self(), comment);
    }

    setReviewHunkAnnotation(status: 'approved' | 'rejected', comment?: string, filePath?: string, hunkIndex?: number): void {
        setReviewHunkAnnotationInState(this.self(), status, comment, filePath, hunkIndex);
    }

    clearReviewHunkAnnotation(filePath?: string, hunkIndex?: number): void {
        clearReviewHunkAnnotationInState(this.self(), filePath, hunkIndex);
    }

    getReviewHunkAnnotation(filePath: string, hunkIndex: number): AgentConsoleReviewAnnotation | undefined {
        return getReviewHunkAnnotationInState(this.self(), filePath, hunkIndex);
    }

    approveAllReviewHunksForFile(comment?: string, filePath?: string): void {
        approveAllReviewHunksForFileInState(this.self(), comment, filePath);
    }

    rejectAllReviewHunksForFile(comment?: string, filePath?: string): void {
        rejectAllReviewHunksForFileInState(this.self(), comment, filePath);
    }

    collectReviewConclusions(): ReturnType<typeof collectReviewConclusionsInState> {
        return collectReviewConclusionsInState(this.self());
    }

    writeReviewConclusions(): ReturnType<typeof writeReviewConclusionsInState> {
        return writeReviewConclusionsInState(this.self());
    }

    clearAllReviewAnnotations(): void {
        clearAllReviewAnnotationsInState(this.self());
    }

    getReviewAnnotationSummary(): string[] {
        return getReviewAnnotationSummaryInState(this.self());
    }

    computeFileRiskScore(section: AgentConsoleReviewDiffSection): ReturnType<typeof computeFileRiskScoreInState> {
        return computeFileRiskScoreInState(section);
    }

    getReviewExportReport(): string[] {
        return getReviewExportReportInState(this.self());
    }

    buildReviewAssessmentLines(): string[] {
        return buildReviewAssessmentLinesInState(this.self());
    }

    filterReviewPatchLines(lines: string[]): string[] {
        return filterReviewPatchLinesInState(this.self(), lines);
    }

    parseReviewHunks(section: AgentConsoleReviewDiffSection): AgentConsoleReviewHunk[] {
        return parseReviewHunksInState(this.self(), section);
    }

    isReviewHunkFolded(groupKey: string, path: string, hunkIndex: number): boolean {
        return isReviewHunkFoldedInState(this.self(), groupKey, path, hunkIndex);
    }

    toggleReviewHunkFold(): void {
        toggleReviewHunkFoldInState(this.self());
    }

    renderReviewPatchLines(section: AgentConsoleReviewDiffSection, groupKey: string): string[] {
        return renderReviewPatchLinesInState(this.self(), section, groupKey);
    }

    toggleReviewSideBySide(): void {
        toggleReviewSideBySideInState(this.self());
    }

    get selectedReviewFileSection(): AgentConsoleReviewDiffSection | undefined {
        return resolveSelectedReviewFileSection(this.self());
    }

    setSelectedReviewFileIndex(index: number): void {
        setSelectedReviewFileIndexInState(this.self(), index);
    }

    moveReviewFileSelection(delta: number): void {
        moveReviewFileSelectionInState(this.self(), delta);
    }

    get reviewDetailLines(): string[] {
        return resolveReviewDetailLines(this.self());
    }

    get reviewDetailMaxColumn(): number {
        return resolveReviewDetailMaxColumn(this.self());
    }

    scrollReviewDetail(delta: number): void {
        scrollReviewDetailInState(this.self(), delta);
    }

    scrollReviewDetailPage(delta: number, pageSize?: number): void {
        scrollReviewDetailPageInState(this.self(), delta, pageSize);
    }

    scrollReviewDetailToEdge(position: 'start' | 'end'): void {
        scrollReviewDetailToEdgeInState(this.self(), position);
    }

    jumpReviewHunk(direction: -1 | 1): void {
        jumpReviewHunkInState(this.self(), direction);
    }

    scrollReviewDetailColumns(delta: number): void {
        scrollReviewDetailColumnsInState(this.self(), delta);
    }

    scrollReviewDetailColumnsToEdge(position: 'start' | 'end'): void {
        scrollReviewDetailColumnsToEdgeInState(this.self(), position);
    }

    /**
     * Persists a command output to the durable store when one is configured.
     * Never throws: persistence is best-effort and must not break the live ring.
     */

    /**
     * Injects a durable command-output store. When provided, results are
     * persisted and can be rehydrated via `loadCommandOutputHistory`.
     */

    /**
     * Hydrates the in-memory command-output ring from the durable store
     * (newest-first, capped at the ring cap). Used on configure/session switch.
     */
}
