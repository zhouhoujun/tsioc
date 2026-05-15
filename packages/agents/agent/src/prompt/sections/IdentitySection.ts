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

        lines.push('You have access to tools. Use them when they can help accomplish the user\'s goal.');
        lines.push('When you receive tool results, use them to inform your next actions.');

        return lines.join('\n');
    }
}
