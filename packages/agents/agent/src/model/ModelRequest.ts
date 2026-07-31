import { AgentMessage } from '../runtime/AgentMessage';
import { AgentToolDefinition } from '../tools/AgentTool';
import { AgentMemoryRecord } from '../memory/MemoryStore';

export interface ModelRequest {
    sessionId: string;
    messages: AgentMessage[];
    tools: AgentToolDefinition[];
    memory: AgentMemoryRecord[];
    summary?: string;
    /**
     * Optional external abort signal used to cancel an in-flight model request
     * (e.g. turn cancellation). Adapters that support it merge this signal with
     * their own timeout controller; other adapters simply ignore it.
     */
    signal?: AbortSignal;
}
