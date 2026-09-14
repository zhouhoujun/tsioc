import { Injectable } from '@tsdi/ioc';

export interface GatewayQuestionState {
    questionId: string;
    sessionId: string;
    question: string;
    options: string[];
    context?: string;
    severity: 'low' | 'medium' | 'high';
    createdAt: number;
    updatedAt: number;
    expiresAt: number;
    status: 'pending' | 'answered' | 'dismissed' | 'expired';
    answer?: string;
}

export interface RegisterQuestionInput {
    questionId: string;
    sessionId: string;
    question: string;
    options: string[];
    context?: string;
    severity: 'low' | 'medium' | 'high';
    createdAt?: number;
    timeoutMs?: number;
}

const DEFAULT_QUESTION_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * Session-scoped pending-question store shared by the gateway's event handler
 * (registers outstanding questions from ask_user tool results) and the RPC
 * server (answers/dismisses/lists them). Answers are resolved once and then
 * treated as duplicates; expired questions reject late answers.
 */
@Injectable()
export class QuestionStore {
    private readonly questions = new Map<string, GatewayQuestionState>();

    register(input: RegisterQuestionInput): GatewayQuestionState {
        const now = Date.now();
        const questionId = input.questionId || `legacy-question-${input.sessionId}-${input.question}`;
        const key = `${input.sessionId}:${questionId}`;
        const existing = this.questions.get(key);
        if (existing && (existing.status === 'pending')) {
            existing.updatedAt = now;
            return existing;
        }
        if (existing && existing.status !== 'pending') {
            return existing;
        }
        const timeoutMs = input.timeoutMs && input.timeoutMs > 0 ? input.timeoutMs : DEFAULT_QUESTION_TIMEOUT_MS;
        const createdAt = input.createdAt ?? now;
        const state: GatewayQuestionState = {
            questionId,
            sessionId: input.sessionId,
            question: input.question,
            options: input.options || [],
            context: input.context,
            severity: input.severity || 'medium',
            createdAt,
            updatedAt: now,
            expiresAt: createdAt + timeoutMs,
            status: 'pending'
        };
        this.questions.set(key, state);
        return state;
    }

    answer(questionId: string, sessionId: string, answer: string): { result: GatewayQuestionState; duplicate: boolean; expired: boolean } {
        const key = `${sessionId}:${questionId}`;
        const existing = this.questions.get(key);
        if (!existing) {
            const now = Date.now();
            const unknown: GatewayQuestionState = {
                questionId, sessionId, question: '', options: [], severity: 'medium',
                createdAt: now, updatedAt: now, expiresAt: now, status: 'dismissed', answer
            };
            return { result: unknown, duplicate: false, expired: false };
        }
        if (existing.status === 'answered' || existing.status === 'dismissed') {
            return { result: existing, duplicate: true, expired: false };
        }
        if (Date.now() > existing.expiresAt) {
            existing.status = 'expired';
            existing.updatedAt = Date.now();
            return { result: existing, duplicate: false, expired: true };
        }
        existing.status = 'answered';
        existing.answer = answer;
        existing.updatedAt = Date.now();
        return { result: existing, duplicate: false, expired: false };
    }

    dismiss(questionId: string, sessionId: string): { result: GatewayQuestionState; duplicate: boolean; expired: boolean } {
        const key = `${sessionId}:${questionId}`;
        const existing = this.questions.get(key);
        if (!existing) {
            const now = Date.now();
            const unknown: GatewayQuestionState = {
                questionId, sessionId, question: '', options: [], severity: 'medium',
                createdAt: now, updatedAt: now, expiresAt: now, status: 'dismissed'
            };
            return { result: unknown, duplicate: false, expired: false };
        }
        if (existing.status === 'answered' || existing.status === 'dismissed') {
            return { result: existing, duplicate: true, expired: false };
        }
        existing.status = 'dismissed';
        existing.updatedAt = Date.now();
        return { result: existing, duplicate: false, expired: false };
    }

    /**
     * Mark any pending question past its expiresAt as expired in-place. Called
     * lazily on every read/list path so stale pending questions are never
     * surfaced to clients (same outcome as answer() rejecting late answers,
     * but without requiring an answer attempt).
     */
    private expireStalePending(): void {
        const now = Date.now();
        for (const item of this.questions.values()) {
            if (item.status === 'pending' && now > item.expiresAt) {
                item.status = 'expired';
                item.updatedAt = now;
            }
        }
    }

    list(sessionId: string): GatewayQuestionState[] {
        this.expireStalePending();
        return Array.from(this.questions.values())
            .filter(item => item.sessionId === sessionId)
            .sort((a, b) => a.createdAt - b.createdAt);
    }

    listPending(sessionId: string): GatewayQuestionState[] {
        return this.list(sessionId).filter(item => item.status === 'pending');
    }

    clearSession(sessionId: string): number {
        let removed = 0;
        for (const [key, item] of Array.from(this.questions.entries())) {
            if (item.sessionId === sessionId) {
                this.questions.delete(key);
                removed++;
            }
        }
        return removed;
    }
}
