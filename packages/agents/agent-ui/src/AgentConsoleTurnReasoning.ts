import type { AgentConsoleTurnStreamHost, AgentConsoleTurnStreamState } from './AgentConsoleTurnStreamController';

/** Upper bound on the thought text kept on a timeline row; the main line only
 * renders its first line, the remainder stays available to the inspector. */
export const REASONING_ROW_MAX_LENGTH = 4000;

export function appendReasoningText(current: unknown, delta: string): string {
    const base = typeof current === 'string' ? current : '';
    if (base.length >= REASONING_ROW_MAX_LENGTH) {
        return base;
    }
    const next = base + delta;
    return next.length > REASONING_ROW_MAX_LENGTH ? `${next.slice(0, REASONING_ROW_MAX_LENGTH)}\u2026` : next;
}

/** Localized placeholder for a reasoning phase that streamed no text. */
export function resolveReasoningFallbackLabel(host: AgentConsoleTurnStreamHost): string {
    const translator = host.translator as { translate?: (key: string) => unknown } | undefined;
    const translated = translator?.translate?.('agent.turn.reasoning');
    return typeof translated === 'string' && translated.trim() ? translated : 'Reasoning';
}

/**
 * Settle the turn's thought row once the answer is in. A row left `running`
 * renders as an active step forever, so the accumulated thought is re-upserted
 * as a completed supporting summary (the main line then bounds it and the full
 * text stays reachable through the row detail).
 */
export function settleReasoningRow(host: AgentConsoleTurnStreamHost, state: AgentConsoleTurnStreamState): void {
    const thought = typeof state.reasoningText === 'string' ? state.reasoningText.trim() : '';
    if (!thought) {
        return;
    }
    host.state.upsertUiEventMessage(host.state.qualifyUiEventKey('reasoning'), thought, {
        eventType: 'reasoning',
        label: 'think',
        status: 'success'
    });
}
