import type { ApplicationContext, UuidGenerator } from '@tsdi/core';
import type { AgentOptions } from '../options';
import type { SessionStore } from '../memory/SessionStore';
import type { MemoryStore, AgentMemoryRecord } from '../memory/MemoryStore';
import type { SessionSummarizer } from '../memory/SessionSummarizer';
import type { AgentSummaryAgent } from '../memory/AgentSummaryAgent';
import type { ExperienceDistiller } from '../memory/ExperienceDistiller';
import type { ToolEvidenceEntry } from '../harness/EvidenceLedger';
import { AgentErrorEvent, AgentMemoryUpdatedEvent } from './AgentEvents';
import type { AgentMessage } from './AgentMessage';

export interface SessionPostTurnHost {
    sessions: SessionStore;
    memory: MemoryStore;
    summarizer: SessionSummarizer;
    summaryAgent?: AgentSummaryAgent;
    experienceDistiller?: ExperienceDistiller;
    options: AgentOptions;
    app: ApplicationContext;
    uuid: UuidGenerator;
    signal(sessionId: string): AbortSignal | undefined;
}

/** Post-turn summary, focus summary and experience distillation. */
export class SessionPostTurnController {
    constructor(private readonly host: SessionPostTurnHost) {
    }

    async maybeSummarize(sessionId: string, evidence?: ToolEvidenceEntry[]): Promise<void> {
        const state = await this.host.sessions.get(sessionId);
        const threshold = this.host.options.session?.summaryThreshold ?? 20;
        if (state.messages.length >= threshold) {
            const summary = await this.host.summarizer.summarize(state.messages, evidence, this.host.signal(sessionId));
            await this.host.sessions.setSummary(sessionId, summary);
        }
    }

    async refreshSessionSummary(sessionId: string): Promise<string | undefined> {
        const sessionOptions = this.host.options.session ?? {};
        if (sessionOptions.autoSummary === false || !this.host.summaryAgent) {
            return sessionOptions.autoSummary === false ? (await this.host.sessions.get(sessionId)).focusSummary ?? undefined : undefined;
        }
        const state = await this.host.sessions.get(sessionId);
        if (state.focusSummary || !state.messages.length) {
            return state.focusSummary ?? undefined;
        }
        try {
            const result = await this.host.summaryAgent.generate(state.messages, this.host.signal(sessionId));
            if (result.summary) {
                await this.host.sessions.setProjectMetadata(sessionId, { focusSummary: result.summary });
            }
            return result.summary ?? state.focusSummary ?? undefined;
        } catch {
            return state.focusSummary ?? undefined;
        }
    }

    async maybeDistillExperience(sessionId: string, userMessage: AgentMessage, assistantMessage: AgentMessage): Promise<void> {
        if (!this.host.experienceDistiller) {
            return;
        }
        try {
            const records = await this.host.experienceDistiller.distill({
                sessionId,
                userMessage,
                assistantMessage,
                createdAt: Date.now()
            });
            for (const record of records) {
                const createdAt = record.createdAt ?? Date.now();
                const persisted: AgentMemoryRecord = {
                    ...record,
                    id: this.host.uuid.generate(),
                    sessionId,
                    scope: record.scope ?? 'session',
                    createdAt,
                    updatedAt: record.updatedAt ?? createdAt
                };
                await this.host.memory.put(persisted);
                try {
                    await this.host.app.publishEvent(new AgentMemoryUpdatedEvent(this.host, sessionId, persisted));
                } catch {
                    continue;
                }
            }
        } catch (error) {
            try {
                const err = error instanceof Error ? error : new Error(String(error));
                await this.host.app.publishEvent(new AgentErrorEvent(this.host, sessionId, err));
            } catch {
                return;
            }
        }
    }
}
