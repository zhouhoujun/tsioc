import type { ReactiveEffect } from '@tsdi/components';
import { formatAgentUiNotice } from '@tsdi/agent-ui';
import type { AgentConsoleSessionState } from '@tsdi/agent-ui';

export interface AgentWebAttentionOptions {
    document: Document;
    state: AgentConsoleSessionState;
    effect: ReactiveEffect;
    /** Test/host override; defaults to the document's Notification constructor. */
    notification?: {
        permission?: string;
        requestPermission?(): Promise<string>;
        new (title: string, options?: { body?: string; tag?: string }): { close?(): void };
    } | null;
}

/**
 * Browser/PWA attention notifications.
 *
 * Only fires while the page is hidden: approvals, pending questions and turn
 * completion are the events a paired phone/background tab must not miss. The
 * notifier reads the reactive state inside an effect, so it needs no manual
 * subscription and no polling.
 */
export function installAgentWebAttention(options: AgentWebAttentionOptions): () => void {
    const doc = options.document;
    const state = options.state;
    const NotificationCtor = options.notification
        ?? (doc.defaultView as any)?.Notification
        ?? (globalThis as any)?.Notification;
    if (!NotificationCtor) {
        return () => undefined;
    }
    let disposed = false;
    const requestPermission = (): void => {
        try {
            if (NotificationCtor.permission === 'default' && typeof NotificationCtor.requestPermission === 'function') {
                void NotificationCtor.requestPermission().catch(() => undefined);
            }
        } catch {
            // Browsers without permission prompts simply never notify.
        }
    };
    const onGesture = (): void => {
        requestPermission();
        doc.removeEventListener?.('pointerdown', onGesture);
        doc.removeEventListener?.('keydown', onGesture);
    };
    if (NotificationCtor.permission !== 'granted') {
        doc.addEventListener?.('pointerdown', onGesture, { once: true });
        doc.addEventListener?.('keydown', onGesture, { once: true });
    }

    const visible = (): boolean => {
        try {
            return String(doc.visibilityState || 'visible') === 'visible';
        } catch {
            return true;
        }
    };
    const show = (title: string, body: string, tag: string): void => {
        if (disposed || visible() || NotificationCtor.permission !== 'granted') {
            return;
        }
        try {
            new NotificationCtor(title, { body, tag });
        } catch {
            // Notification construction can throw on insecure origins.
        }
    };
    const sessionLabel = (): string => String(state.title || state.sessionId || '').trim();
    const translate = (key: string, fallback: string, params?: Record<string, any>): string =>
        formatAgentUiNotice(state.translator, key, params) || fallback;

    let approvals = Number(state.pendingApprovals?.length || 0);
    let questions = Number(state.pendingQuestionQueue?.length || 0);
    let status = String(state.status || '');

    options.effect.run(() => {
        if (disposed) {
            return;
        }
        const nextApprovals = Number(state.pendingApprovals?.length || 0);
        const nextQuestions = Number(state.pendingQuestionQueue?.length || 0);
        const nextStatus = String(state.status || '');
        if (nextApprovals > approvals) {
            const request: any = state.pendingApprovals?.[nextApprovals - 1];
            const tool = String(request?.toolName || request?.name || request?.command || '').trim();
            show(
                translate('attentionTitle', 'TSDI Agent'),
                translate('attentionApproval', 'Approval needed: {tool}', { tool: tool || 'tool' }),
                'tsdi-approval'
            );
        }
        if (nextQuestions > questions) {
            const question: any = state.pendingQuestionQueue?.[nextQuestions - 1];
            const text = String(question?.question || question?.title || '').trim().slice(0, 160);
            show(
                translate('attentionTitle', 'TSDI Agent'),
                translate('attentionQuestion', 'Question: {question}', { question: text || 'input needed' }),
                'tsdi-question'
            );
        }
        if (status === 'running' && nextStatus !== 'running' && nextStatus) {
            const failed = nextStatus === 'error' || nextStatus === 'failed';
            show(
                translate('attentionTitle', 'TSDI Agent'),
                failed
                    ? translate('attentionTurnFailed', 'Turn failed: {session}', { session: sessionLabel() })
                    : translate('attentionTurnDone', 'Turn finished: {session}', { session: sessionLabel() }),
                'tsdi-turn'
            );
        }
        approvals = nextApprovals;
        questions = nextQuestions;
        status = nextStatus;
    });

    return () => {
        disposed = true;
        doc.removeEventListener?.('pointerdown', onGesture);
        doc.removeEventListener?.('keydown', onGesture);
    };
}
