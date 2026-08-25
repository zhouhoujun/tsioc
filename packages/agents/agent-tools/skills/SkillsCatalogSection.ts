import { PromptSection, PromptSectionContext, AgentSkillTokenBudgetOptions } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';
import { LocalSkillRegistry } from './LocalSkillRegistry';

@Injectable()
export class SkillsCatalogSection extends PromptSection {
    priority = 55;

    constructor(private skills: LocalSkillRegistry) {
        super();
    }

    name(): string {
        return 'skills-catalog';
    }

    render(context: PromptSectionContext): string {
        const skills = this.skills.list();
        if (!skills.length) {
            return '';
        }
        const budget = context.extra?.skillTokenBudget as AgentSkillTokenBudgetOptions | undefined;
        const truncateCatalog = budget?.truncateCatalog !== false;
        const maxChars = budget?.maxChars;
        const lines = ['## Available Skills'];
        let totalChars = lines[0].length;
        let truncated = false;
        for (const skill of skills) {
            const aliases = skill.aliases?.length ? ` (/${skill.aliases.join(', /')})` : '';
            const line = `- ${skill.id}${aliases}${this.formatMetadata(skill.metadata)}: ${skill.summary}`;
            if (truncateCatalog && maxChars != null && totalChars + line.length > maxChars) {
                truncated = true;
                break;
            }
            totalChars += line.length;
            lines.push(line);
        }
        if (truncated) {
            lines.push(`- ... (${skills.length - (lines.length - 1)} more; use /skills to browse)`);
        }
        lines.push('Use /skills to browse skills, /skill <id> to activate one, or call read_skill for full details.');
        return lines.join('\n');
    }

    private formatMetadata(metadata?: { source?: string; category?: string; }): string {
        const parts = [metadata?.source, metadata?.category].filter((value): value is string => !!value?.trim());
        return parts.length ? ` [${parts.join(' | ')}]` : '';
    }
}
