import { Abstract } from '@tsdi/ioc';
import { RunContext } from '@tsdi/core';
import { AgentMemoryRecord } from '../memory/MemoryStore';
import { AgentMessage } from './AgentMessage';
import { AgentTurnResult } from './AgentTurnResult';
import { AgentTurnInput } from './AgentTurnInput';
import { StreamChunk } from '../model/StreamChunk';

@Abstract()
export abstract class AgentRuntime {
    abstract runTurn(sessionId: string, input: string, principalId?: string): Promise<AgentTurnResult>;

    abstract start(): Promise<void>;
    abstract stop(): Promise<void>;

    abstract executeTurn(input: AgentTurnInput, context: RunContext): Promise<AgentTurnResult>;

    abstract processTurn(input: AgentTurnInput): Promise<AgentTurnResult>;

    abstract runStreamingTurn(sessionId: string, input: string): AsyncGenerator<StreamChunk>;

    abstract putMemory(sessionId: string, key: string, value: string, scope?: AgentMemoryRecord['scope']): Promise<AgentMemoryRecord>;

    abstract searchMemory(sessionId: string, query: string): Promise<AgentMemoryRecord[]>;

    abstract getMessages(sessionId: string): Promise<AgentMessage[]>;
}
