import { ApplicationEvent } from '@tsdi/core';
import { ModelResponse } from '../model/ModelResponse';
import { AgentMessage } from './AgentMessage';
import { ScheduledAgentTask } from '../scheduler/ScheduledAgentTask';
import { AgentMemoryRecord } from '../memory/MemoryStore';

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
    constructor(source: Object, readonly sessionId: string, readonly toolName: string, readonly input: any) {
        super(source);
    }
}

export class AgentToolCompletedEvent extends ApplicationEvent {
    constructor(source: Object, readonly sessionId: string, readonly toolName: string, readonly output: any) {
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

export class AgentErrorEvent extends ApplicationEvent {
    constructor(source: Object, readonly sessionId: string, readonly error: Error) {
        super(source);
    }
}
