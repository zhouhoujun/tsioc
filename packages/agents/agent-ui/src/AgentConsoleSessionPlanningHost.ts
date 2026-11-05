import type { AgentMessage } from '@tsdi/agent';
import type {
    AgentConsoleGoalSummary,
    AgentConsolePendingQuestion,
    AgentConsolePlanActionKind,
    AgentConsolePlanTodoItem
} from './AgentConsoleStateTypes';
import { AgentConsoleSessionReviewHost } from './AgentConsoleSessionReviewHost';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';
import {
    buildPlanMessage as buildPlanMessageInState,
    cancelRemainingPlanSteps as cancelRemainingPlanStepsInState,
    clearPlanTodos as clearPlanTodosInState,
    formatElapsed as formatElapsedInState,
    hasActivePlanTodos as hasActivePlanTodosInState,
    jumpToNextBlockedPlanTodo as jumpToNextBlockedPlanTodoInState,
    jumpToNextFailedPlanTodo as jumpToNextFailedPlanTodoInState,
    mergePlanCreated as mergePlanCreatedInState,
    mergePlanStepStatus as mergePlanStepStatusInState,
    movePlanTodoSelection as movePlanTodoSelectionInState,
    planTodoGlyph as planTodoGlyphInState,
    resolveFilteredPlanTodos,
    resolveGoalCriteriaProgress,
    resolvePlanTodoFilterLabel,
    resolveSelectedPlanTodo,
    resolveSelectedPlanTodoDetailLabel,
    setGoalSummary as setGoalSummaryInState,
    setPlanTodoFilter as setPlanTodoFilterInState,
    setPlanTodos as setPlanTodosInState,
    togglePlanTodoExpanded as togglePlanTodoExpandedInState
} from './AgentConsolePlanState';
import {
    applyPlanActionOptimistically as applyPlanActionOptimisticallyInState,
    confirmPlanAction as confirmPlanActionInState,
    dismissPlanAction as dismissPlanActionInState,
    isPlanActionApplicable as isPlanActionApplicableInState,
    planActionPromptLabel as planActionPromptLabelInState,
    requestPlanAction as requestPlanActionInState,
    retrySelectedPlanTodo as retrySelectedPlanTodoInState,
    rollbackPlanAction as rollbackPlanActionInState
} from './AgentConsolePlanActionState';
import {
    buildLegacyQuestionId as buildLegacyQuestionIdInState,
    choosePendingQuestion as choosePendingQuestionInState,
    dismissPendingQuestion as dismissPendingQuestionInState,
    finishPendingQuestion as finishPendingQuestionInState,
    markPendingQuestionExpired as markPendingQuestionExpiredInState,
    movePendingQuestionSelection as movePendingQuestionSelectionInState,
    movePendingQuestionSelectionPage as movePendingQuestionSelectionPageInState,
    movePendingQuestionSelectionToEdge as movePendingQuestionSelectionToEdgeInState,
    resolvePendingQuestionTotal,
    resumeAfterQuestionAnswer as resumeAfterQuestionAnswerInState,
    setPendingQuestion as setPendingQuestionInState,
    submitPendingQuestionInput as submitPendingQuestionInputInState
} from './AgentConsoleQuestionState';

/** Plan, goal and pending-question projection facade split from the session state. */
export abstract class AgentConsoleSessionPlanningHost extends AgentConsoleSessionReviewHost {
    protected abstract self(): AgentConsoleSessionState;

    setPlanTodos(todos: AgentConsolePlanTodoItem[], sourceSessionId?: string, scope?: 'project' | 'thread', sequence?: number, revision?: number, planId?: string): void {
        setPlanTodosInState(this.self(), todos, sourceSessionId, scope, sequence, revision, planId);
    }

    get planThreadKey(): string {
        return this.planId ? `${this.planId}#r${this.planRevision}` : '';
    }

    mergePlanCreated(
        steps: Array<Partial<AgentConsolePlanTodoItem> & { id: string; content: string }>,
        planId?: string,
        revision?: number,
        sequence?: number,
        sourceSessionId?: string,
        scope?: 'project' | 'thread'
    ): void {
        mergePlanCreatedInState(this.self(), steps, planId, revision, sequence, sourceSessionId, scope);
    }

    mergePlanStepStatus(
        planId: string,
        stepId: string,
        status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed',
        opts: { sequence?: number; owner?: string; reason?: string; error?: string; elapsedMs?: number } = {}
    ): boolean {
        return mergePlanStepStatusInState(this.self(), planId, stepId, status, opts);
    }

    cancelRemainingPlanSteps(planId?: string, sequence?: number): void {
        cancelRemainingPlanStepsInState(this.self(), planId, sequence);
    }

    setGoalSummary(goal: AgentConsoleGoalSummary | null | undefined): void {
        setGoalSummaryInState(this.self(), goal);
    }

    get goalCriteriaProgress(): { met: number; total: number } | null {
        return resolveGoalCriteriaProgress(this.self());
    }

    buildPlanMessage(): AgentMessage | null {
        return buildPlanMessageInState(this.self());
    }

    formatElapsed(ms: number): string {
        return formatElapsedInState(ms);
    }

    togglePlanTodoExpanded(): boolean {
        return togglePlanTodoExpandedInState(this.self());
    }

    planTodoGlyph(status: AgentConsolePlanTodoItem['status']): string {
        return planTodoGlyphInState(status);
    }

    hasActivePlanTodos(): boolean {
        return hasActivePlanTodosInState(this.self());
    }

    clearPlanTodos(): void {
        clearPlanTodosInState(this.self());
    }

    get filteredPlanTodos(): AgentConsolePlanTodoItem[] {
        return resolveFilteredPlanTodos(this.self());
    }

    get selectedPlanTodo(): AgentConsolePlanTodoItem | null {
        return resolveSelectedPlanTodo(this.self());
    }

    get planTodoFilterLabel(): string {
        return resolvePlanTodoFilterLabel(this.self());
    }

    setPlanTodoFilter(filter: 'all' | 'active' | 'blocked' | 'failed'): void {
        setPlanTodoFilterInState(this.self(), filter);
    }

    movePlanTodoSelection(direction: -1 | 1): boolean {
        return movePlanTodoSelectionInState(this.self(), direction);
    }

    jumpToNextBlockedPlanTodo(): boolean {
        return jumpToNextBlockedPlanTodoInState(this.self());
    }

    jumpToNextFailedPlanTodo(): boolean {
        return jumpToNextFailedPlanTodoInState(this.self());
    }

    get selectedPlanTodoDetailLabel(): string {
        return resolveSelectedPlanTodoDetailLabel(this.self());
    }

    setPendingQuestion(question: AgentConsolePendingQuestion | null): void {
        setPendingQuestionInState(this.self(), question);
    }

    finishPendingQuestion(): AgentConsolePendingQuestion | null {
        return finishPendingQuestionInState(this.self());
    }

    /** Queue count exposed for `current/total` UI projection. */
    get pendingQuestionTotal(): number {
        return resolvePendingQuestionTotal(this.self());
    }

    markPendingQuestionExpired(questionId?: string): void {
        markPendingQuestionExpiredInState(this.self(), questionId);
    }

    movePendingQuestionSelection(delta: number): void {
        movePendingQuestionSelectionInState(this.self(), delta);
    }

    movePendingQuestionSelectionToEdge(edge: 'start' | 'end'): void {
        movePendingQuestionSelectionToEdgeInState(this.self(), edge);
    }

    movePendingQuestionSelectionPage(direction: 1 | -1): void {
        movePendingQuestionSelectionPageInState(this.self(), direction);
    }

    async choosePendingQuestion(index = this.pendingQuestionSelectedIndex): Promise<boolean> {
        return choosePendingQuestionInState(this.self(), index);
    }

    buildLegacyQuestionId(question: AgentConsolePendingQuestion): string {
        return buildLegacyQuestionIdInState(question);
    }

    resumeAfterQuestionAnswer(): void {
        resumeAfterQuestionAnswerInState(this.self());
    }

    async dismissPendingQuestion(): Promise<boolean> {
        return dismissPendingQuestionInState(this.self());
    }

    async submitPendingQuestionInput(): Promise<boolean> {
        return submitPendingQuestionInputInState(this.self());
    }

    async retrySelectedPlanTodo(): Promise<boolean> {
        return retrySelectedPlanTodoInState(this.self());
    }

    isPlanActionApplicable(action: AgentConsolePlanActionKind, item: AgentConsolePlanTodoItem): boolean {
        return isPlanActionApplicableInState(action, item);
    }

    requestPlanAction(action: AgentConsolePlanActionKind, stepId: string, payload?: Record<string, unknown>): boolean {
        return requestPlanActionInState(this.self(), action, stepId, payload);
    }

    planActionPromptLabel(action: AgentConsolePlanActionKind, item: AgentConsolePlanTodoItem): string {
        return planActionPromptLabelInState(action, item);
    }

    dismissPlanAction(): void {
        dismissPlanActionInState(this.self());
    }

    confirmPlanAction(): boolean {
        return confirmPlanActionInState(this.self());
    }

    applyPlanActionOptimistically(
        action: AgentConsolePlanActionKind,
        item: AgentConsolePlanTodoItem,
        payload?: Record<string, unknown>
    ): AgentConsolePlanTodoItem {
        return applyPlanActionOptimisticallyInState(this.self(), action, item, payload);
    }

    rollbackPlanAction(stepId: string, previous: AgentConsolePlanTodoItem | null): void {
        rollbackPlanActionInState(this.self(), stepId, previous);
    }
}
