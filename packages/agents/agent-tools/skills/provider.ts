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
import { getBuiltinSkills, resolveBuiltinSkillLocale } from './builtin-skills';
import { loadAgentSkillsFromRoots, loadAgentSkillsFromRootsSync } from './local-skill-loader';
import { RemoteSkillManager } from './remote-skill-manager';
import { RemoteSkillTool } from './remote-skill.tool';
import { resolveAgentRootSettings } from '../src/settings';
import { AGENT_PLUGIN_CONTRIBUTIONS, AgentPluginContributions, AgentPluginManager, provideAgentPluginContributions } from './plugin-manager';
import { AgentPluginTool } from './plugin.tool';

export interface AgentSkillsOptions {
    root?: string;
    skills?: AgentSkillDefinition[];
    roots?: string[];
    defaults?: boolean;
    /** Locale used for builtin skill prompts. Defaults to zh-CN. */
    locale?: string;
    /** Local cache directory for remote skills (defaults to ~/.tsdi-agent/skills). */
    remoteCacheDir?: string;
    pluginRoots?: Partial<Record<'local' | 'personal' | 'workspace' | 'remote', string>>;
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
    const remoteCacheDir = options.remoteCacheDir || new RemoteSkillManager().defaultCacheDir();
    const remoteLoaded = remoteCacheDir ? loadAgentSkillsFromRootsSync([remoteCacheDir], { source: 'remote' }) : [];
    const pluginManager = new AgentPluginManager();
    const pluginRoots = { ...pluginManager.defaultRoots(options.root), ...(options.pluginRoots ?? {}) };
    const activePlugins = pluginManager.discover(pluginRoots).map(plugin => pluginManager.activate(plugin));
    const pluginLoaded = pluginManager.contributions(activePlugins).skills;
    const skills = mergeSkills(
        mergeSkills(mergeSkills(options.defaults === false ? [] : getBuiltinSkills(undefined, resolveBuiltinSkillLocale(options.locale)), loaded), pluginLoaded),
        mergeSkills(remoteLoaded, options.skills ?? [])
    );
    return buildSkillProviders(skills, pluginRoots);
}

export async function provideSkillsAsync(options: AgentSkillsOptions = {}): Promise<Provider[]> {
    const resolvedRoots = new Set<string>();
    if (options.root) {
        resolveAgentRootSettings(options.root).skillRoots.forEach(root => resolvedRoots.add(root));
    }
    options.roots?.forEach(root => resolvedRoots.add(root));
    const remoteCacheDir = options.remoteCacheDir || new RemoteSkillManager().defaultCacheDir();
    const pluginManager = new AgentPluginManager();
    const pluginRoots = { ...pluginManager.defaultRoots(options.root), ...(options.pluginRoots ?? {}) };
    const [loaded, remoteLoaded, discoveredPlugins] = await Promise.all([
        loadAgentSkillsFromRoots(Array.from(resolvedRoots.values()), { source: 'workspace' }),
        remoteCacheDir ? loadAgentSkillsFromRoots([remoteCacheDir], { source: 'remote' }) : Promise.resolve([]),
        pluginManager.discoverAsync(pluginRoots)
    ]);
    const activePlugins = discoveredPlugins.map(plugin => pluginManager.activate(plugin));
    const contributions = await pluginManager.contributionsAsync(activePlugins);
    const skills = mergeSkills(
        mergeSkills(mergeSkills(options.defaults === false ? [] : getBuiltinSkills(undefined, resolveBuiltinSkillLocale(options.locale)), loaded), contributions.skills),
        mergeSkills(remoteLoaded, options.skills ?? [])
    );
    return buildSkillProviders(skills, pluginRoots, contributions);
}

function buildSkillProviders(
    skills: AgentSkillDefinition[],
    pluginRoots: AgentSkillsOptions['pluginRoots'],
    contributions?: AgentPluginContributions
): Provider[] {
    return [
        ...withAgentSkills(...skills),
        LocalSkillRegistry,
        SkillSessionStore,
        ReadSkillTool,
        ListSkillTool,
        RemoteSkillManager,
        RemoteSkillTool,
        AgentPluginManager,
        AgentPluginTool,
        contributions
            ? { provide: AGENT_PLUGIN_CONTRIBUTIONS, useValue: contributions }
            : provideAgentPluginContributions(pluginRoots),
        SkillsCatalogSection,
        ActiveSkillsSection,
        SkillTurnInterceptor,
        { provide: AGENT_PROMPT_SECTIONS, useExisting: SkillsCatalogSection, multi: true },
        { provide: AGENT_PROMPT_SECTIONS, useExisting: ActiveSkillsSection, multi: true },
        { provide: AGENT_TOOLS, useExisting: ReadSkillTool, multi: true },
        { provide: AGENT_TOOLS, useExisting: ListSkillTool, multi: true },
        { provide: AGENT_TOOLS, useExisting: RemoteSkillTool, multi: true },
        { provide: AGENT_TOOLS, useExisting: AgentPluginTool, multi: true },
        { provide: AGENT_TURN_INTERCEPTORS, useExisting: SkillTurnInterceptor, multi: true }
    ];
}
