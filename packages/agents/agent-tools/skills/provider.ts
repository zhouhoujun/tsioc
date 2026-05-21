import { Provider, toProviders } from '@tsdi/ioc';
import { AGENT_PROMPT_SECTIONS, AGENT_TOOLS, AGENT_TURN_INTERCEPTORS } from '@tsdi/agent';
import { AGENT_SKILLS } from './tokens';
import { AgentSkillDefinition } from './types';
import { LocalSkillRegistry } from './LocalSkillRegistry';
import { SkillSessionStore } from './SkillSessionStore';
import { ReadSkillTool } from './read-skill.tool';
import { ListSkillTool } from './list-skill.tool';
import { SkillsCatalogSection } from './SkillsCatalogSection';import { ActiveSkillsSection } from './ActiveSkillsSection';
import { SkillTurnInterceptor } from './SkillTurnInterceptor';
import { getBuiltinSkills } from './builtin-skills';
import { loadAgentSkillsFromRootsSync } from './local-skill-loader';
import { resolveAgentRootSettings } from '../src/settings';

export interface AgentSkillsOptions {
    root?: string;
    skills?: AgentSkillDefinition[];
    roots?: string[];
    defaults?: boolean;
}

export function withAgentSkills(...skills: AgentSkillDefinition[]): Provider[] {
    return toProviders(AGENT_SKILLS, skills, true);
}

function mergeSkills(builtin: AgentSkillDefinition[], explicit: AgentSkillDefinition[]): AgentSkillDefinition[] {
    const merged = new Map<string, AgentSkillDefinition>();
    builtin.forEach(skill => merged.set(skill.id, skill));
    explicit.forEach(skill => merged.set(skill.id, skill));
    return Array.from(merged.values());
}

export function provideSkills(options: AgentSkillsOptions = {}): Provider[] {
    const resolvedRoots = new Set<string>();
    if (options.root) {
        resolveAgentRootSettings(options.root).skillRoots.forEach(root => resolvedRoots.add(root));
    }
    options.roots?.forEach(root => resolvedRoots.add(root));
    const loaded = resolvedRoots.size ? loadAgentSkillsFromRootsSync(Array.from(resolvedRoots.values()), { source: 'workspace' }) : [];
    const skills = mergeSkills(
        mergeSkills(options.defaults === false ? [] : getBuiltinSkills(), loaded),
        options.skills ?? []
    );
    return [
        ...withAgentSkills(...skills),
        LocalSkillRegistry,
        SkillSessionStore,
        ReadSkillTool,
        ListSkillTool,
        SkillsCatalogSection,
        ActiveSkillsSection,
        SkillTurnInterceptor,
        { provide: AGENT_PROMPT_SECTIONS, useExisting: SkillsCatalogSection, multi: true },
        { provide: AGENT_PROMPT_SECTIONS, useExisting: ActiveSkillsSection, multi: true },
        { provide: AGENT_TOOLS, useExisting: ReadSkillTool, multi: true },
        { provide: AGENT_TOOLS, useExisting: ListSkillTool, multi: true },
        { provide: AGENT_TURN_INTERCEPTORS, useExisting: SkillTurnInterceptor, multi: true }
    ];
}
