import { Abstract } from '@tsdi/ioc';
import { AgentMessage } from '../runtime/AgentMessage';
import { AgentMemoryRecord } from './MemoryStore';

export interface ExperienceDistillationInput {
    sessionId: string;
    userMessage: AgentMessage;
    assistantMessage: AgentMessage;
    createdAt: number;
}

@Abstract()
export abstract class ExperienceDistiller {
    abstract distill(input: ExperienceDistillationInput): Promise<AgentMemoryRecord[]>;
}
