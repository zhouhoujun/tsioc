import { PromptSection, PromptSectionContext } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';
import { LocalSkillRegistry } from './LocalSkillRegistry';
import { SkillSessionStore } from './SkillSessionStore';

@Injectable()
export class ActiveSkillsSection extends PromptSection {
    priority = 56;

    constructor(
        private skills: LocalSkillRegistry,
        private sessions: SkillSessionStore
    ) {
        super();
    }

    name(): string {
        return 'active-skills';
    }

    render(context: PromptSectionContext): string {
        const active = this.sessions.list(context.sessionId)
            .map(id => this.skills.get(id))
            .filter((skill): skill is NonNullable<typeof skill> => !!skill);
        if (!active.length) {
            return '';
        }
        const lines = ['## Active Skills'];
        active.forEach(skill => {
            lines.push(`### ${skill.title}`);
            lines.push(skill.promptFull);
        });
        return lines.join('\n');
    }
}
