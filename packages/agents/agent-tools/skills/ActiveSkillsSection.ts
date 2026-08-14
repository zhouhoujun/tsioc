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
        const compacted = context.extra?.contextPreparation?.compactionTriggered === true;
        active.forEach(skill => {
            lines.push(`### ${skill.title}`);
            const remote = skill.metadata?.source === 'remote' || skill.metadata?.source?.startsWith('plugin:');
            lines.push(compacted && remote
                ? `${skill.summary}\nFull instructions remain available through read_skill('${skill.id}').`
                : skill.promptFull);
        });
        return lines.join('\n');
    }
}
