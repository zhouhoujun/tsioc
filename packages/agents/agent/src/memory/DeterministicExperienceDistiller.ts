import { Injectable } from '@tsdi/ioc';
import { ExperienceDistillationInput, ExperienceDistiller } from './ExperienceDistiller';
import { AgentMemoryRecord } from './MemoryStore';

@Injectable()
export class DeterministicExperienceDistiller extends ExperienceDistiller {
    async distill(input: ExperienceDistillationInput): Promise<AgentMemoryRecord[]> {
        const preference = this.extractPreference(input.userMessage.content);
        if (!preference) {
            return [];
        }
        const normalizedKey = this.normalizeKey(preference);
        if (!normalizedKey) {
            return [];
        }
        const record: AgentMemoryRecord = {
            id: input.userMessage.id,
            sessionId: input.sessionId,
            key: `preference:${normalizedKey}`,
            value: preference,
            scope: 'session',
            namespace: 'experience',
            category: 'experience',
            metadata: {
                source: 'deterministic-turn-distillation',
                userMessageId: input.userMessage.id,
                assistantMessageId: input.assistantMessage.id,
                kind: 'preference'
            },
            createdAt: input.createdAt,
            updatedAt: input.createdAt
        };
        return [record];
    }

    private extractPreference(content: string): string | undefined {
        const normalized = content.trim().replace(/\s+/g, ' ');
        if (!normalized) {
            return undefined;
        }
        const match = normalized.match(/^i\s+prefer\s+(.+)$/i);
        if (!match) {
            return undefined;
        }
        return this.sanitizePreference(match[1]);
    }

    private sanitizePreference(value: string): string | undefined {
        const normalized = value.trim().replace(/[.。!！?？]+$/u, '').replace(/\s+/g, ' ');
        if (!normalized || normalized.length > 120) {
            return undefined;
        }
        return normalized;
    }

    private normalizeKey(value: string): string {
        return value
            .toLowerCase()
            .normalize('NFKC')
            .replace(/\s+/g, ' ')
            .replace(/[^\p{L}\p{N} ]/gu, '')
            .trim()
            .slice(0, 64);
    }
}
