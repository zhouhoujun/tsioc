import { Inject, Injectable } from '@tsdi/ioc';
import { AGENT_SKILLS } from './tokens';
import { AgentSkillDefinition } from './types';

@Injectable()
export class LocalSkillRegistry {
    constructor(
        @Inject(AGENT_SKILLS, { defaultValue: [] })
        private skills: AgentSkillDefinition[]
    ) {
    }

    list(): AgentSkillDefinition[] {
        return this.skills.map(skill => this.clone(skill));
    }

    get(idOrAlias: string): AgentSkillDefinition | undefined {
        const lookup = idOrAlias.trim().toLowerCase();
        const skill = this.skills.find(item => item.id.toLowerCase() === lookup || (item.aliases ?? []).some(alias => alias.toLowerCase() === lookup));
        return skill ? this.clone(skill) : undefined;
    }

    private clone(skill: AgentSkillDefinition): AgentSkillDefinition {
        return {
            ...skill,
            aliases: skill.aliases ? skill.aliases.slice() : undefined,
            tools: skill.tools ? skill.tools.map(tool => ({ ...tool })) : undefined,
            metadata: skill.metadata ? { ...skill.metadata } : undefined
        };
    }
}
