import type { ReactiveEffect } from '@tsdi/components';
import { formatAgentUiNotice } from '@tsdi/agent-ui';
import type { AgentConsoleSessionState } from '@tsdi/agent-ui';

export interface AgentConsoleTuiAttentionOptions {
    state: AgentConsoleSessionState;
    effect: ReactiveEffect;
    /** Terminal notification sink (OSC 9); omitted when notifications are off. */
    notify?(title: string, body: string): void;
    /** Terminal bell sink; omitted when attention sounds are off. */
    bell?(): void;
    notifications?: boolean;
    sound?: boolean;
}

/**
 * TUI attention notifications.
 *
 * Mirrors the browser notifier: approvals, pending questions and turn
 * completion are the events a user who switched windows must not miss. The
 * derived values are read inside the shared `ReactiveEffect`, so there is no
 * manual subscription and no polling — the same contract as every other
 * binding in the console.
 */
export function installAgentConsoleTuiAttention(options: AgentConsoleTuiAttentionOptions): () => void {
    const state = options.state;
    const notify = options.notifications === true ? options.notify : undefined;
    const bell = options.sound === true ? options.bell : undefined;
    if (!notify && !bell) {
        return () => undefined;
    }
    let disposed = false;
    const translate = (key: string, fallback: string, params?: Record<string, any>): string =>
        formatAgentUiNotice(state.translator, key, params) || fallback;
    const sessionLabel = (): string => String(state.title || state.sessionId || '').trim();
    const fire = (body: string): void => {
        const title = translate('attentionTitle', 'TSDI Agent');
        notify?.(title, body);
        bell?.();
    };

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
            fire(translate('attentionApproval', 'Approval needed: {tool}', { tool: tool || 'tool' }));
        }
        if (nextQuestions > questions) {
            const question: any = state.pendingQuestionQueue?.[nextQuestions - 1];
            const text = String(question?.question || question?.title || '').trim().slice(0, 160);
            fire(translate('attentionQuestion', 'Question: {question}', { question: text || 'input needed' }));
        }
        if (status === 'running' && nextStatus !== 'running' && nextStatus) {
            const failed = nextStatus === 'error' || nextStatus === 'failed';
            fire(failed
                ? translate('attentionTurnFailed', 'Turn failed: {session}', { session: sessionLabel() })
                : translate('attentionTurnDone', 'Turn finished: {session}', { session: sessionLabel() }));
        }
        approvals = nextApprovals;
        questions = nextQuestions;
        status = nextStatus;
    });

    return () => {
        disposed = true;
    };
}
