import { AgentMessage } from './AgentMessage';
import { AgentMemoryRecord } from '../memory/MemoryStore';

export interface AgentContext {
    sessionId: string;
    messages: AgentMessage[];
    summary?: string;
    memory: AgentMemoryRecord[];
}
