import type {
    AgentConsolePendingQuestion,
    AgentConsoleSessionState
} from './AgentConsoleSessionState';

/** Pending-question queue, selection and answer/dismiss lifecycle. */
export function setPendingQuestion(state: AgentConsoleSessionState, question: AgentConsolePendingQuestion | null): void {
    if (question && question.sessionId && question.sessionId !== state.sessionId) return;
    if (!question) {
        state.pendingQuestionQueue = [];
        state.pendingQuestion = null;
        state.pendingQuestionSelectedIndex = 0;
        state.syncDerivedInputFocus();
        return;
    }
    const existingIndex = state.pendingQuestionQueue.findIndex(item => item.questionId === question.questionId);
    if (existingIndex >= 0) {
        const existing = state.pendingQuestionQueue[existingIndex];
        if ((existing.updatedAt || 0) > (question.updatedAt || 0)) return;
        if (existing.status === 'answered' || existing.status === 'dismissed') return;
        state.pendingQuestionQueue[existingIndex] = { ...existing, ...question };
    } else {
        state.pendingQuestionQueue.push(question);
    }
    state.pendingQuestion = state.pendingQuestionQueue[0] ?? null;
    state.pendingQuestionSelectedIndex = 0;
    state.syncDerivedInputFocus();
}

export function finishPendingQuestion(state: AgentConsoleSessionState): AgentConsolePendingQuestion | null {
    const finished = state.pendingQuestionQueue.shift() ?? null;
    state.pendingQuestion = state.pendingQuestionQueue[0] ?? null;
    state.pendingQuestionSelectedIndex = 0;
    state.syncDerivedInputFocus();
    return finished;
}

export function resolvePendingQuestionTotal(state: AgentConsoleSessionState): number {
    return state.pendingQuestionQueue.length;
}

export function markPendingQuestionExpired(state: AgentConsoleSessionState, questionId?: string): void {
    const target = questionId
        ? state.pendingQuestionQueue.find(item => item.questionId === questionId)
        : state.pendingQuestionQueue[0];
    if (!target) return;
    target.status = 'expired';
}

export function movePendingQuestionSelection(state: AgentConsoleSessionState, delta: number): void {
    const count = state.pendingQuestion?.options.length || 0;
    if (!count) return;
    state.pendingQuestionSelectedIndex = (state.pendingQuestionSelectedIndex + delta + count) % count;
}

export function movePendingQuestionSelectionToEdge(state: AgentConsoleSessionState, edge: 'start' | 'end'): void {
    const count = state.pendingQuestion?.options.length || 0;
    if (!count) return;
    state.pendingQuestionSelectedIndex = edge === 'start'
        ? state.overlayController.homeIndex(count)
        : state.overlayController.endIndex(count);
}

export function movePendingQuestionSelectionPage(state: AgentConsoleSessionState, direction: 1 | -1): void {
    const count = state.pendingQuestion?.options.length || 0;
    if (!count) return;
    state.pendingQuestionSelectedIndex = state.overlayController.pageIndex(
        state.pendingQuestionSelectedIndex,
        direction,
        count
    );
}

export async function choosePendingQuestion(state: AgentConsoleSessionState, index = state.pendingQuestionSelectedIndex): Promise<boolean> {
    const option = state.pendingQuestion?.options[index];
    if (!option) return false;
    state.pendingQuestionSelectedIndex = index;
    state.setInput(option, option.length);
    const question = state.pendingQuestion;
    if (!question) return false;
    // Standalone/legacy hosts retain the previous compose-only behavior.
    if (!state.questionAction) {
        return true;
    }
    if (question.expiresAt && Date.now() > question.expiresAt) {
        question.status = 'expired';
        question.error = undefined;
        finishPendingQuestion(state);
        return true;
    }
    question.status = 'submitting';
    question.error = undefined;
    try {
        await state.questionAction({
            questionId: question.questionId || buildLegacyQuestionId(question),
            sessionId: question.sessionId || state.sessionId,
            action: 'answer',
            answer: option
        });
        question.status = 'answered';
        question.answer = option;
        finishPendingQuestion(state);
        resumeAfterQuestionAnswer(state);
    } catch (error: any) {
        handleQuestionFailure(state, question, error);
    }
    return true;
}

export function buildLegacyQuestionId(question: AgentConsolePendingQuestion): string {
    return `legacy-question-${question.question}`;
}

export function resumeAfterQuestionAnswer(state: AgentConsoleSessionState): void {
    if (!state.submitAction || state.pendingQuestion) {
        return;
    }
    // Start the resumed turn without awaiting it: this runs on the terminal
    // input dispatch chain, and awaiting the turn made later approval keys queue.
    void Promise.resolve(state.submitAction()).catch(() => undefined);
}

export async function dismissPendingQuestion(state: AgentConsoleSessionState): Promise<boolean> {
    const question = state.pendingQuestion;
    if (!question) {
        return false;
    }
    const questionId = question.questionId || buildLegacyQuestionId(question);
    const sessionId = question.sessionId || state.sessionId;
    if (state.questionAction) {
        try {
            await state.questionAction({ questionId, sessionId, action: 'dismiss' });
        } catch {
            // Preserve the local dismissal when the server is unreachable.
        }
    }
    question.status = 'dismissed';
    finishPendingQuestion(state);
    return true;
}

export async function submitPendingQuestionInput(state: AgentConsoleSessionState): Promise<boolean> {
    const question = state.pendingQuestion;
    const answer = String(state.input || '').trim();
    if (!question || !answer || !state.questionAction) {
        return false;
    }
    if (question.expiresAt && Date.now() > question.expiresAt) {
        question.status = 'expired';
        question.error = undefined;
        finishPendingQuestion(state);
        return true;
    }
    question.status = 'submitting';
    question.error = undefined;
    try {
        await state.questionAction({
            questionId: question.questionId || buildLegacyQuestionId(question),
            sessionId: question.sessionId || state.sessionId,
            action: 'answer',
            answer
        });
        question.status = 'answered';
        question.answer = answer;
        finishPendingQuestion(state);
        resumeAfterQuestionAnswer(state);
    } catch (error: any) {
        handleQuestionFailure(state, question, error);
    }
    return true;
}

function handleQuestionFailure(state: AgentConsoleSessionState, question: AgentConsolePendingQuestion, error: any): void {
    const message = error?.message
        || String(error || state.translateLabel('agent.notice.questionResponseFailed', undefined, 'Question response failed'));
    if (/expired/i.test(message)) {
        question.status = 'expired';
        question.error = undefined;
        finishPendingQuestion(state);
    } else {
        question.status = 'pending';
        question.error = message;
    }
}
