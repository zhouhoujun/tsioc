import { AgentMessage } from '../runtime/AgentMessage';
import { AgentToolDefinition } from '../tools/AgentTool';
import { AgentMemoryRecord } from '../memory/MemoryStore';

export interface ModelRequest {
    sessionId: string;
    messages: AgentMessage[];
    tools: AgentToolDefinition[];
    memory: AgentMemoryRecord[];
    summary?: string;
}
