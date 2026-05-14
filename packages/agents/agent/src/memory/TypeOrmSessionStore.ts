import { Inject, Injectable } from '@tsdi/ioc';
import { SessionStore } from './SessionStore';
import { AgentState } from '../runtime/AgentState';
import { AgentMessage } from '../runtime/AgentMessage';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AgentMessageEntity, AgentSessionEntity } from './entities';

@Injectable()
export class TypeOrmSessionStore extends SessionStore {
    constructor(@Inject(TypeormAdapter) private adapter: TypeormAdapter) {
        super();
    }

    async get(sessionId: string): Promise<AgentState> {
        let session = await this.adapter.getRepository(AgentSessionEntity).findOne({ where: { sessionId } as any });
        if (!session) {
            const now = Date.now();
            session = this.adapter.getRepository(AgentSessionEntity).create({ sessionId, createdAt: now, updatedAt: now });
            session = await this.adapter.getRepository(AgentSessionEntity).save(session);
        }
        const messages = await this.adapter.getRepository(AgentMessageEntity).find({ where: { sessionId } as any, order: { sequence: 'ASC' } as any });
        return {
            sessionId,
            summary: session.summary,
            messages: messages.map(message => ({
                id: message.messageId,
                role: message.role as AgentMessage['role'],
                content: message.content,
                name: message.name,
                toolCallId: message.toolCallId,
                createdAt: Number(message.createdAt),
                metadata: message.metadata ?? undefined
            }))
        };
    }

    async append(sessionId: string, message: AgentMessage): Promise<AgentState> {
        const sessionRepo = this.adapter.getRepository(AgentSessionEntity);
        const messageRepo = this.adapter.getRepository(AgentMessageEntity);
        let session = await sessionRepo.findOne({ where: { sessionId } as any });
        const now = Date.now();
        if (!session) {
            session = sessionRepo.create({ sessionId, createdAt: now, updatedAt: now });
        } else {
            session.updatedAt = now;
        }
        await sessionRepo.save(session);
        const sequence = await messageRepo.count({ where: { sessionId } as any }) + 1;
        await messageRepo.save(messageRepo.create({
            sessionId,
            messageId: message.id,
            sequence,
            role: message.role,
            content: message.content,
            name: message.name,
            toolCallId: message.toolCallId,
            createdAt: message.createdAt,
            metadata: message.metadata
        }));
        return this.get(sessionId);
    }

    async setSummary(sessionId: string, summary: string): Promise<void> {
        const repo = this.adapter.getRepository(AgentSessionEntity);
        let session = await repo.findOne({ where: { sessionId } as any });
        const now = Date.now();
        if (!session) {
            session = repo.create({ sessionId, summary, createdAt: now, updatedAt: now });
        } else {
            session.summary = summary;
            session.updatedAt = now;
        }
        await repo.save(session);
    }

    async clear(): Promise<void> {
        await this.adapter.getRepository(AgentMessageEntity).clear();
        await this.adapter.getRepository(AgentSessionEntity).clear();
    }
}
