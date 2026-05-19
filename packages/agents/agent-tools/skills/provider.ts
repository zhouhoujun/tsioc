import { Provider, toProviders } from '@tsdi/ioc';
import { AGENT_PROMPT_SECTIONS, AGENT_TOOLS, AGENT_TURN_INTERCEPTORS } from '@tsdi/agent';
import { AGENT_SKILLS } from './tokens';
import { AgentSkillDefinition } from './types';
import { LocalSkillRegistry } from './LocalSkillRegistry';
import { SkillSessionStore } from './SkillSessionStore';
import { ReadSkillTool } from './read-skill.tool';
import { SkillsCatalogSection } from './SkillsCatalogSection';
import { ActiveSkillsSection } from './ActiveSkillsSection';
import { SkillTurnInterceptor } from './SkillTurnInterceptor';

export interface AgentSkillsOptions {
    skills?: AgentSkillDefinition[];
}

export function withAgentSkills(...skills: AgentSkillDefinition[]): Provider[] {
    return toProviders(AGENT_SKILLS, skills, true);
}

export function provideSkills(options: AgentSkillsOptions = {}): Provider[] {
    return [
        ...withAgentSkills(...(options.skills ?? [])),
        LocalSkillRegistry,
        SkillSessionStore,
        ReadSkillTool,
        SkillsCatalogSection,
        ActiveSkillsSection,
        SkillTurnInterceptor,
        { provide: AGENT_PROMPT_SECTIONS, useExisting: SkillsCatalogSection, multi: true },
        { provide: AGENT_PROMPT_SECTIONS, useExisting: ActiveSkillsSection, multi: true },
        { provide: AGENT_TOOLS, useExisting: ReadSkillTool, multi: true },
        { provide: AGENT_TURN_INTERCEPTORS, useExisting: SkillTurnInterceptor, multi: true }
    ];
}
