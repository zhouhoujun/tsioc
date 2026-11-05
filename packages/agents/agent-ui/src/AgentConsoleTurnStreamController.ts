import type { AgentConsoleAppRpc, AgentMessage, AgentRuntime, AgentTurnMessageInput } from '@tsdi/agent';
import type { AgentConsoleActivity, AgentConsoleApprovalRequest, AgentConsoleUiEventOptions } from './AgentConsoleSessionState';
import {
    describeStreamEventContent,
    resolvePendingToolCallRows,
    resolveStreamEventLabel,
    resolveToolEventKey
} from './AgentConsoleStreamHelpers';
import { AgentConsoleMessageState, findStreamingAssistantMessageIndex, replaceStreamingAssistantMessage } from './AgentConsoleMessageState';
import { consumeStreamEventChunkView, normalizeUiEventStatus, qualifyTurnUiEventKey } from './AgentConsoleStreamEventProjection';
export { consumeStreamEventChunkView, normalizeUiEventStatus } from './AgentConsoleStreamEventProjection';

/**
 * Host surface required by the turn stream controller.
 * The component satisfies this interface structurally when delegating.
 */
export interface AgentConsoleTurnStreamHost {
    state: {
        sessionId: string;
        workspace: string;
        status: string;
        messages: AgentMessage[];
        setMessages(messages: AgentMessage[], ...rest: any[]): void;
        setTokenUsage(usage?: unknown): void;
        setStatus(status: string): void;
        setContextPreparation(report?: unknown): void;
        pushActivity(kind: AgentConsoleActivity['kind'], message: string): void;
        summarize(value: string): string;
        qualifyUiEventKey(key: string): string;
        appendUiEventMessage(content: string, options?: AgentConsoleUiEventOptions): void;
        upsertUiEventMessage(eventKey: string, content: string, options?: AgentConsoleUiEventOptions): void;
        upsertPendingApproval(request: AgentConsoleApprovalRequest): void;
        requestApprovalAttention(): void;
    };
    destroyed?: boolean;
    translator?: unknown;
    updateTerminalTitle(): void;
    refreshTodoPlan(): Promise<void>;
    refreshPendingApprovals(): Promise<void>;
    appRpc?: AgentConsoleAppRpc | null;
    runtime: AgentRuntime;
    executeTurn(input: string, message?: AgentTurnMessageInput, profile?: string): Promise<unknown>;
}

/**
 * Scratch state shared across the flush cluster of one streaming turn.
 * Owned by the host component so it survives the per-chunk host objects.
 */
export interface AgentConsoleTurnStreamState {
    streamMessageText: string;
    /**
     * Interim narrations already sealed into their own rows. Once this is > 0 the
     * streaming row is a moving placeholder: re-appended while it has text, dropped
     * when empty, so a turn ending on a tool call leaves no empty assistant bubble.
     */
    sealedNarrationCount: number;
    /**
     * Whole-turn thought text. It settles the row when the turn ends and is what
     * the inspector shows, so no part of the model's reasoning is lost.
     */
    reasoningText: string;
    /**
     * Thought text of the current reasoning phase (what the running row shows).
     * A phase starts at the turn start and again after every tool-call boundary,
     * so the row tracks the reasoning in progress instead of a stale opening line.
     */
    reasoningPhase: string;
}

/** Upper bound on the thought text kept on a timeline row; the main line only
 * renders its first line, the remainder stays available to the inspector. */
const REASONING_ROW_MAX_LENGTH = 4000;

function appendReasoningText(current: unknown, delta: string): string {
    const base = typeof current === 'string' ? current : '';
    if (base.length >= REASONING_ROW_MAX_LENGTH) {
        return base;
    }
    const next = base + delta;
    return next.length > REASONING_ROW_MAX_LENGTH ? `${next.slice(0, REASONING_ROW_MAX_LENGTH)}\u2026` : next;
}

/** Localized placeholder for a reasoning phase that streamed no text. */
function resolveReasoningFallbackLabel(host: AgentConsoleTurnStreamHost): string {
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
function settleReasoningRow(host: AgentConsoleTurnStreamHost, state: AgentConsoleTurnStreamState): void {
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

/**
 * Normalize a stream event status into the UI status vocabulary.
 * Unknown/empty values fall back to `running`.
 */
export function consumeStreamChunkView(
    host: AgentConsoleTurnStreamHost,
    state: AgentConsoleTurnStreamState,
    chunk: any,
    assistantMessage: AgentMessage
): void {
    host.state.setTokenUsage(chunk);
    if (chunk?.type === 'event') {
        consumeStreamEventChunkView(host, chunk);
        return;
    }
    if (chunk?.type === 'text' && chunk.content) {
        assistantMessage.content += chunk.content;
        scheduleStreamingAssistantMessageFlush(host, state, assistantMessage);
        return;
    }
    if (chunk?.type === 'reasoning' && chunk.content) {
        host.state.setStatus('reasoning');
        host.updateTerminalTitle();
        const delta = String(chunk.content);
        state.reasoningText = appendReasoningText(state.reasoningText, delta);
        state.reasoningPhase = appendReasoningText(state.reasoningPhase, delta);
        host.state.pushActivity('model', `Reasoning: ${host.state.summarize(chunk.content)}`);
        host.state.upsertUiEventMessage(
            host.state.qualifyUiEventKey('reasoning'),
            state.reasoningPhase.trim() || resolveReasoningFallbackLabel(host),
            {
                eventType: 'reasoning',
                label: 'think',
                status: 'running'
            }
        );
        return;
    }
    if (chunk?.type === 'tool_call') {
        sealStreamedNarration(host, state, assistantMessage);
        // The next reasoning phase is a new thought: never let the row freeze on
        // the previous phase's opening line.
        state.reasoningPhase = '';
        for (const row of resolvePendingToolCallRows(chunk, host.translator)) {
            const eventKey = qualifyTurnUiEventKey(host.state, row.key);
            host.state.pushActivity('tool', `Tool call: ${host.state.summarize(String(row.content || chunk.content || ''))}`);
            if (eventKey) {
                host.state.upsertUiEventMessage(eventKey, row.content, {
                    eventType: 'tool_call',
                    label: 'tool',
                    status: 'running',
                    toolCallId: row.toolCallId,
                    receiptId: String(chunk?.receiptId || chunk?.receipt?.receiptId || '').trim() || undefined,
                    attempt: Number(chunk?.attemptCount || chunk?.receipt?.attemptCount) || undefined,
                    source: 'stream',
                    sequence: Number(chunk?.sequence) || undefined
                });
            } else {
                host.state.appendUiEventMessage(row.content, {
                    eventType: 'tool_call',
                    label: 'tool',
                    status: 'running'
                });
            }
        }
        if (String(chunk.content || '').includes('todo')) {
            void host.refreshTodoPlan();
        }
        return;
    }
    if (chunk?.type === 'done' && chunk.message) {
        assistantMessage.content = chunk.message.content || assistantMessage.content;
        assistantMessage.metadata = {
            ...(chunk.message.metadata || {}),
            streaming: false
        };
        finalizeStreamingAssistantRow(host, state, assistantMessage);
        host.state.setTokenUsage(chunk.message.metadata?.usage);
    }
}

/**
 * Consumes one streamed event chunk (approval/compensation/context/turn
 * diagnostics plus generic tool/state lifecycle rows).
 */
export function scheduleStreamingAssistantMessageFlush(
    host: AgentConsoleTurnStreamHost,
    state: AgentConsoleTurnStreamState,
    message: AgentMessage
): void {
    state.streamMessageText = message.content || '';
    if (!host.destroyed) {
        flushStreamingAssistantMessage(host, state, message);
    }
}

/**
 * Projects the accumulated streaming text onto the tracked assistant message
 * row. Short-circuits when the row already carries the same text.
 */
export function flushStreamingAssistantMessage(
    host: AgentConsoleTurnStreamHost,
    state: AgentConsoleTurnStreamState,
    message?: AgentMessage
): void {
    if (host.destroyed) {
        state.streamMessageText = '';
        return;
    }
    const text = state.streamMessageText;
    const current = host.state.messages.slice();
    const targetIndex = findStreamingAssistantMessageIndex(current, message);
    if (!text.trim() && state.sealedNarrationCount > 0) {
        if (targetIndex >= 0) {
            current.splice(targetIndex, 1);
            host.state.setMessages(current, true);
        }
        return;
    }
    if (targetIndex >= 0) {
        const currentMessage = current[targetIndex];
        if (String(currentMessage.content || '') === text
            && currentMessage.metadata?.streaming === true) {
            return;
        }
        const updated: AgentMessage = {
            ...(message || currentMessage),
            content: text,
            metadata: {
                ...(message?.metadata || currentMessage.metadata || {}),
                streaming: true
            }
        };
        if (targetIndex === current.length - 1) {
            current[targetIndex] = updated;
        } else {
            current.splice(targetIndex, 1);
            current.push(updated);
        }
    } else if (message && text.trim()) {
        current.push({
            ...message,
            content: text,
            metadata: {
                ...(message.metadata || {}),
                streaming: true
            }
        });
    } else {
        return;
    }
    host.state.setMessages(current, true);
}

function removeStreamingAssistantRow(state: AgentConsoleMessageState, message: AgentMessage): void {
    const current = state.messages.slice();
    const targetIndex = findStreamingAssistantMessageIndex(current, message);
    if (targetIndex < 0) {
        return;
    }
    current.splice(targetIndex, 1);
    state.setMessages(current, true);
}

/**
 * Seals the interim narration accumulated so far into its own completed row at
 * the tail, then releases the streaming row. A tool call is a narration boundary:
 * without this the text either fuses into the final answer or is reordered after
 * the tool rows it was streamed before.
 */
function sealStreamedNarration(
    host: AgentConsoleTurnStreamHost,
    state: AgentConsoleTurnStreamState,
    message: AgentMessage
): void {
    const text = String(state.streamMessageText || message.content || '');
    if (!text.trim()) {
        return;
    }
    const current = host.state.messages.slice();
    const targetIndex = findStreamingAssistantMessageIndex(current, message);
    if (targetIndex >= 0) {
        current.splice(targetIndex, 1);
    }
    state.sealedNarrationCount += 1;
    current.push({
        id: `${message.id}-narration-${state.sealedNarrationCount}`,
        role: 'assistant',
        content: text,
        createdAt: Date.now(),
        metadata: {
            ...(message.metadata || {}),
            streaming: false
        }
    });
    host.state.setMessages(current, true);
    state.streamMessageText = '';
    message.content = '';
}

/**
 * Settles the streaming row when a turn ends: keep and close it when it still
 * carries the final answer, otherwise drop the placeholder whose text was
 * already sealed into narration rows.
 */
function finalizeStreamingAssistantRow(
    host: AgentConsoleTurnStreamHost,
    state: AgentConsoleTurnStreamState,
    message: AgentMessage
): void {
    if (host.destroyed === true) {
        return;
    }
    const text = String(message.content || '');
    state.streamMessageText = text;
    if (!text.trim() && state.sealedNarrationCount > 0) {
        removeStreamingAssistantRow(host.state, message);
        return;
    }
    replaceStreamingAssistantMessage(host.state, false, message);
}

/**
 * Resets the streaming scratch text after a turn stream ends (or on dispose).
 */
export function clearStreamingMessageState(state: AgentConsoleTurnStreamState): void {
    state.streamMessageText = '';
    state.sealedNarrationCount = 0;
    state.reasoningText = '';
    state.reasoningPhase = '';
}

/**
 * Runs one turn against the stream-capable transport, projecting every chunk
 * into the message list. Falls back to the non-streaming turn execution when
 * neither the app RPC nor the runtime exposes a streaming turn.
 */
export async function runTurnStreamView(
    host: AgentConsoleTurnStreamHost,
    state: AgentConsoleTurnStreamState,
    prompt: string,
    assistantMessage: AgentMessage,
    message?: AgentTurnMessageInput,
    profile?: string
): Promise<void> {
    const stream = host.appRpc?.stream?.('run.turn_stream', {
        sessionId: host.state.sessionId,
        input: prompt,
        ...(host.state.workspace ? { workspace: host.state.workspace } : {}),
        ...(profile ? { profile } : {}),
        ...(message ? { message } : {})
    });
    if (stream) {
        let completed = false;
        try {
            for await (const chunk of stream) {
                consumeStreamChunkView(host, state, chunk, assistantMessage);
            }
            completed = true;
        } finally {
            if (completed) {
                assistantMessage.metadata = {
                    ...(assistantMessage.metadata || {}),
                    streaming: false
                };
                finalizeStreamingAssistantRow(host, state, assistantMessage);
                settleReasoningRow(host, state);
            }
            clearStreamingMessageState(state);
        }
        return;
    }

    const runtime: any = host.runtime;
    if (typeof runtime?.runStreamingTurn === 'function') {
        for await (const chunk of runtime.runStreamingTurn(host.state.sessionId, prompt, undefined, message, profile, undefined, host.state.workspace)) {
            consumeStreamChunkView(host, state, chunk, assistantMessage);
        }
        settleReasoningRow(host, state);
        assistantMessage.metadata = {
            ...(assistantMessage.metadata || {}),
            streaming: false
        };
        finalizeStreamingAssistantRow(host, state, assistantMessage);
        return;
    }

    const result = await host.executeTurn(prompt, message, profile);
    if (result && typeof result === 'object' && 'message' in result) {
        assistantMessage.content = (result as { message: { content: string } }).message.content;
        if (host.state.status === 'running' || host.state.status === 'reasoning') {
            host.state.setStatus('idle');
            host.updateTerminalTitle();
        }
    }
}