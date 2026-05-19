import { PromptSection, PromptSectionContext } from '@tsdi/agent';
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

    render(_context: PromptSectionContext): string {
        const skills = this.skills.list();
        if (!skills.length) {
            return '';
        }
        const lines = ['## Available Skills'];
        skills.forEach(skill => {
            const aliases = skill.aliases?.length ? ` (/${skill.aliases.join(', /')})` : '';
            lines.push(`- ${skill.id}${aliases}: ${skill.summary}`);
        });
        lines.push('Use /skills to browse skills, /skill <id> to activate one, or call read_skill for full details.');
        return lines.join('\n');
    }
}
