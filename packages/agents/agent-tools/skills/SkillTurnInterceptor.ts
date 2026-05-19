import { AgentTurnInput, AgentTurnResult, SessionStore, ToolRegistry } from '@tsdi/agent';
import { Handler, RunContext } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { randomUUID } from 'crypto';
import { LocalSkillRegistry } from './LocalSkillRegistry';
import { SkillSessionStore } from './SkillSessionStore';

@Injectable()
export class SkillTurnInterceptor {
    constructor(
        private skills: LocalSkillRegistry,
        private sessions: SkillSessionStore,
        private sessionStore: SessionStore,
        private tools: ToolRegistry
    ) {
    }

    async intercept(input: AgentTurnInput, next: Handler<AgentTurnInput, Promise<AgentTurnResult>, RunContext>, context: RunContext): Promise<AgentTurnResult> {
        const command = input.input.trim();
        if (!command.startsWith('/')) {
            return next.handle(input, context);
        }

        if (command === '/skills') {
            const skills = this.skills.list();
            return this.respond(input, skills.length
                ? ['Available skills:', ...skills.map(skill => `- ${skill.id}${this.formatMetadata(skill.metadata)}: ${skill.summary}`)].join('\n')
                : 'No skills are registered.');
        }

        if (command.startsWith('/skill ')) {
            const name = command.slice('/skill '.length).trim();
            return this.activate(input, name);
        }

        const alias = command.slice(1).trim();
        const skill = alias ? this.skills.get(alias) : undefined;
        if (skill) {
            return this.activate(input, skill.id);
        }

        return next.handle(input, context);
    }

    private async activate(input: AgentTurnInput, idOrAlias: string): Promise<AgentTurnResult> {
        const skill = this.skills.get(idOrAlias);
        if (!skill) {
            return this.respond(input, `Skill '${idOrAlias}' not found.`);
        }
        this.sessions.activate(input.sessionId, skill.id);
        const failedTools: string[] = [];
        if (skill.tools?.length) {
            for (const tool of skill.tools) {
                try {
                    await this.tools.activateTool(input.sessionId, tool.name);
                } catch (err) {
                    const message = err instanceof Error ? err.message : 'activation failed';
                    failedTools.push(`${tool.name} (${message})`);
                }
            }
        }
        return this.respond(
            input,
            failedTools.length
                ? `Activated skill '${skill.id}' with unavailable tools: ${failedTools.join(', ')}.`
                : `Activated skill '${skill.id}'.`
        );
    }

    private async respond(input: AgentTurnInput, content: string): Promise<AgentTurnResult> {
        const createdAt = Date.now();
        await this.sessionStore.append(input.sessionId, {
            id: randomUUID(),
            role: 'user',
            content: input.input,
            createdAt,
            metadata: { slashCommand: true }
        });
        const message = {
            id: randomUUID(),
            role: 'assistant' as const,
            content,
            createdAt: createdAt + 1,
            metadata: { slashCommand: true }
        };
        await this.sessionStore.append(input.sessionId, message);
        return { sessionId: input.sessionId, message };
    }

    private formatMetadata(metadata?: { source?: string; category?: string; }): string {
        const parts = [metadata?.source, metadata?.category].filter((value): value is string => !!value?.trim());
        return parts.length ? ` [${parts.join(' | ')}]` : '';
    }
}
