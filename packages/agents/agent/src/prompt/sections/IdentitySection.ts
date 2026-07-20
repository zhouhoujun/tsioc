import { PromptSection, PromptSectionContext } from '../PromptSection';
import { Injectable } from '@tsdi/ioc';

export interface IdentityConfig {
    name?: string;
    role?: string;
    traits?: string[];
    rules?: string[];
}

/**
 * Renders the agent's identity — name, role, behavioral rules.
 * Matches zeroclaw's IdentitySection / SOUL.md pattern.
 *
 * Configure via setIdentity():
 *   const section = ctx.get(IdentitySection);
 *   section.setIdentity({ name: 'MyBot', role: 'assistant', traits: ['helpful'], rules: ['Be concise'] });
 */
@Injectable()
export class IdentitySection extends PromptSection {
    name(): string { return 'identity'; }
    priority = 10;

    private config: IdentityConfig = {};

    /** Set identity configuration at runtime */
    setIdentity(config: IdentityConfig): void {
        this.config = config;
    }

    render(_context: PromptSectionContext): string {
        const cfg = this.config ?? {};
        const lines: string[] = [];

        if (cfg.name) {
            lines.push(`You are ${cfg.name}.`);
        }
        if (cfg.role) {
            lines.push(`Your role: ${cfg.role}`);
        }
        if (cfg.traits?.length) {
            lines.push(`Personality: ${cfg.traits.join(', ')}`);
        }
        if (cfg.rules?.length) {
            lines.push('Rules:');
            cfg.rules.forEach(r => lines.push(`- ${r}`));
        }

        lines.push('You are an autonomous task agent.');
        lines.push('You have access to tools. Use them when they can help accomplish the user\'s goal.');
        lines.push('When you receive tool results, use them to inform your next actions.');
        lines.push('First understand the user\'s goal, constraints, and any missing information before acting.');
        lines.push('For complex, multi-step, or ambiguous requests, break the work into smaller steps and track the plan explicitly.');
        lines.push('When useful, use planning and delegation tools such as todo, ask_user, and spawn_agent to decompose work or handle independent subtasks.');
        lines.push('When the user answers a clarification question, continue the task directly with the new information instead of stopping early.');
        lines.push('If a tool or external service is unavailable, say so clearly and provide the next best fallback.');

        return lines.join('\n');
    }
}
