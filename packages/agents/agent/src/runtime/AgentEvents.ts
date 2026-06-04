import { ApplicationEvent } from '@tsdi/core';
import { ModelResponse } from '../model/ModelResponse';
import { AgentMessage } from './AgentMessage';
import { ScheduledAgentTask } from '../scheduler/ScheduledAgentTask';
import { AgentMemoryRecord } from '../memory/MemoryStore';

const MAX_EVENT_INPUT_SUMMARY_CHARS = 200;

export interface AgentToolExecutionReceipt {
    receiptId: string;
    toolCallId: string;
    toolName: string;
    executionMode: 'sequential' | 'parallel';
    status: 'running' | 'success' | 'error' | 'skipped';
    inputSummary?: string;
    outputSummary?: string;
    durationMs?: number;
    error?: string;
    attemptCount?: number;
}

function summarizeEventInput(input: any): string | undefined {
    if (input === undefined) {
        return undefined;
    }
    const seen = new WeakSet<object>();
    let text: string | undefined;
    try {
        text = typeof input === 'string' ? input : JSON.stringify(input, (_key, current) => {
            if (typeof current === 'bigint') {
                return current.toString();
            }
            if (current && typeof current === 'object') {
                if (seen.has(current)) {
                    return '[circular]';
                }
                seen.add(current);
            }
            return current;
        });
    } catch {
        text = '[unserializable]';
    }
    if (!text) {
        return undefined;
    }
    return text.length > MAX_EVENT_INPUT_SUMMARY_CHARS
        ? `${text.slice(0, MAX_EVENT_INPUT_SUMMARY_CHARS)}...[truncated]`
        : text;
}

export class AgentStartedEvent extends ApplicationEvent {
    constructor(source: Object, readonly name: string) {
        super(source);
    }
}

export class AgentTurnStartedEvent extends ApplicationEvent {
    constructor(source: Object, readonly sessionId: string, readonly input: string) {
        super(source);
    }
}

export class AgentToolInvokedEvent extends ApplicationEvent {
    readonly hasInput: boolean;
    readonly inputSummary?: string;

    constructor(source: Object, readonly sessionId: string, readonly toolName: string, input: any, readonly receipt?: AgentToolExecutionReceipt) {
        super(source);
        this.hasInput = input !== undefined;
        this.inputSummary = summarizeEventInput(input);
    }
}

export class AgentToolCompletedEvent extends ApplicationEvent {
    constructor(
        source: Object,
        readonly sessionId: string,
        readonly toolName: string,
        readonly output: any,
        readonly receipt?: AgentToolExecutionReceipt
    ) {
        super(source);
    }
}

export class AgentToolFailedEvent extends ApplicationEvent {
    constructor(
        source: Object,
        readonly sessionId: string,
        readonly toolName: string,
        readonly error: Error,
        readonly receipt?: AgentToolExecutionReceipt
    ) {
        super(source);
    }
}

export class AgentToolSkippedEvent extends ApplicationEvent {
    constructor(
        source: Object,
        readonly sessionId: string,
        readonly toolName: string,
        readonly reason: string,
        readonly receipt?: AgentToolExecutionReceipt
    ) {
        super(source);
    }
}

export class AgentMemoryRetrievalStartedEvent extends ApplicationEvent {
    constructor(source: Object, readonly sessionId: string, readonly query: string) {
        super(source);
    }
}

export class AgentMemoryRetrievedEvent extends ApplicationEvent {
    constructor(source: Object, readonly sessionId: string, readonly query: string, readonly records: AgentMemoryRecord[]) {
        super(source);
    }
}

export class AgentMemoryRetrievalFailedEvent extends ApplicationEvent {
    constructor(source: Object, readonly sessionId: string, readonly query: string, readonly error: Error) {
        super(source);
    }
}

export class AgentMemoryUpdatedEvent extends ApplicationEvent {
    constructor(source: Object, readonly sessionId: string, readonly record: AgentMemoryRecord) {
        super(source);
    }
}

export class AgentTaskScheduledEvent extends ApplicationEvent {
    constructor(source: Object, readonly task: ScheduledAgentTask) {
        super(source);
    }
}

export class AgentModelCompletedEvent extends ApplicationEvent {
    constructor(source: Object, readonly sessionId: string, readonly response: ModelResponse) {
        super(source);
    }
}

export class AgentTurnCompletedEvent extends ApplicationEvent {
    constructor(source: Object, readonly sessionId: string, readonly message: AgentMessage) {
        super(source);
    }
}

export class AgentStreamChunkEvent extends ApplicationEvent {
    constructor(
        source: Object,
        readonly sessionId: string,
        readonly type: 'text' | 'reasoning' | 'tool_call' | 'done',
        readonly content?: string,
        readonly toolCalls?: any[],
        readonly usage?: any
    ) {
        super(source);
    }
}

export class AgentErrorEvent extends ApplicationEvent {
    constructor(source: Object, readonly sessionId: string, readonly error: Error) {
        super(source);
    }
}

export class AgentApprovalRequestedEvent extends ApplicationEvent {
    constructor(source: Object, readonly request: { id: string; toolName: string; sessionId: string; reason: string; summary: string; hasInput: boolean; inputSummary?: string; timeoutMs: number }) {
        super(source);
    }
}

export class AgentApprovalCompletedEvent extends ApplicationEvent {
    constructor(source: Object, readonly request: { id: string; toolName: string; sessionId: string }, readonly approved: boolean) {
        super(source);
    }
}

export class AgentApprovalFailedEvent extends ApplicationEvent {
    constructor(source: Object, readonly request: { id: string; toolName: string; sessionId: string }, readonly error: Error) {
        super(source);
    }
}
