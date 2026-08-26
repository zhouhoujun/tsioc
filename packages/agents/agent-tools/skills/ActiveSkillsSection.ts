import { PromptSection, PromptSectionContext } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';
import { AgentSkillTokenBudgetOptions } from '@tsdi/agent';
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
        const budget = context.extra?.skillTokenBudget as AgentSkillTokenBudgetOptions | undefined;
        const maxChars = budget?.maxChars;
        const compactActive = budget?.compactActive !== false;
        let totalChars = 0;
        const sections: string[] = [];
        for (const skill of active) {
            const remote = skill.metadata?.source === 'remote' || skill.metadata?.source?.startsWith('plugin:');
            const compactedRemote = compacted && remote;
            const exceedsBudget = maxChars != null && totalChars + (skill.promptFull?.length ?? 0) > maxChars;
            const useCompact = compactedRemote || (compactActive && exceedsBudget);
            const body = useCompact
                ? `${skill.summary}\nFull instructions remain available through read_skill('${skill.id}').`
                : skill.promptFull ?? skill.summary;
            totalChars += body.length;
            sections.push(`### ${skill.title}\n${body}`);
        }
        return [...lines, ...sections].join('\n');
    }
}
