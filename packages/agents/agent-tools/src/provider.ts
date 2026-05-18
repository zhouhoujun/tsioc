import { ModuleWithProviders, Provider, ProvdierOf, toProviders, Injector } from '@tsdi/ioc';
import { AgentCapabilityBundle, AgentTool, withAgentTools } from '@tsdi/agent';
import { AGENT_TOOL_BUNDLES, AGENT_TOOLS } from '@tsdi/agent';
import { AgentToolsModule } from './agent-tools.module';
import { AgentToolGroup, AgentToolItem, AgentToolsOptions, mergeAgentToolsOptions } from './options';
import { AGENT_TOOLS_OPTIONS } from './tokens';
import { ReadFileTool } from '../files/read-file.tool';
import { GlobSearchTool } from '../files/glob-search.tool';
import { ContentSearchTool } from '../files/content-search.tool';
import { CalculatorTool } from '../utility/calculator.tool';
import { WebSearchTool } from '../web/web-search.tool';
import { WebExtractTool } from '../web/web-extract.tool';
import { TodoTool } from '../planning/todo.tool';
import { ScheduleTool } from '../scheduling/schedule.tool';
import { TerminalTool } from '../terminal/terminal.tool';
import { MemoryListTool } from '../memory/memory-list.tool';
import { MemoryDeleteTool } from '../memory/memory-delete.tool';
import { HttpFetchTool } from '../http/http-fetch.tool';
import { HttpRequestTool } from '../http/http-request.tool';
import { ToolSearchTool } from '../registry/tool-search.tool';
import { ToolInspectTool } from '../registry/tool-inspect.tool';

const toolItems = {
    read_file: ReadFileTool,
    glob_search: GlobSearchTool,
    content_search: ContentSearchTool,
    calculator: CalculatorTool,
    web_search: WebSearchTool,
    web_extract: WebExtractTool,
    todo: TodoTool,
    schedule: ScheduleTool,
    'memory.list': MemoryListTool,
    'memory.delete': MemoryDeleteTool,
    tool_search: ToolSearchTool,
    tool_inspect: ToolInspectTool,
    http_fetch: HttpFetchTool,
    http_request: HttpRequestTool,
    terminal: TerminalTool
} as const satisfies Record<AgentToolItem, ProvdierOf<AgentTool>>;

const toolGroups = {
    filesystem: ['read_file', 'glob_search', 'content_search'],
    utility: ['calculator'],
    web: ['web_search', 'web_extract'],
    planning: ['todo'],
    scheduling: ['schedule'],
    memory: ['memory.list', 'memory.delete'],
    registry: ['tool_search', 'tool_inspect'],
    http: ['http_fetch', 'http_request'],
    terminal: ['terminal']
} as const satisfies Record<AgentToolGroup, AgentToolItem[]>;

const defaultToolGroups: AgentToolGroup[] = ['filesystem', 'utility', 'web', 'planning', 'scheduling', 'memory', 'registry'];
const allToolGroups = Object.keys(toolGroups) as AgentToolGroup[];
const allToolProviders = Array.from(new Set(Object.values(toolItems)));
const bundleDescriptions: Record<AgentToolGroup, string> = {
    filesystem: 'Workspace file reading and search tools.',
    utility: 'General-purpose calculation and utility helpers.',
    web: 'Web search and extraction tools.',
    planning: 'Planning and task tracking tools.',
    scheduling: 'Prompt scheduling and recurring task tools.',
    memory: 'Session and global memory management tools.',
    registry: 'Tool discovery and activation tools.',
    http: 'HTTP fetch and request tools.',
    terminal: 'Terminal command execution tools.'
};
const deferredActivationBundles = new Set<AgentToolGroup>(['filesystem', 'web', 'http', 'terminal']);

export function withAgentToolsOptions(options?: AgentToolsOptions): Provider[] {
    return [{
        provide: AGENT_TOOLS_OPTIONS,
        useValue: mergeAgentToolsOptions(options)
    }];
}

export function resolveAgentToolNames(options?: AgentToolsOptions): AgentToolItem[] {
    const merged = mergeAgentToolsOptions(options);
    const enabled = new Map<AgentToolItem, boolean>();
    const preset = merged.registration?.preset ?? 'default';
    const baseGroups = preset === 'all'
        ? allToolGroups
        : preset === 'none'
            ? []
            : defaultToolGroups;

    baseGroups.forEach(group => toolGroups[group].forEach(item => enabled.set(item, true)));

    Object.entries(merged.registration?.groups ?? {}).forEach(([group, isEnabled]) => {
        if (isEnabled == null) {
            return;
        }
        const groupItems = toolGroups[group as AgentToolGroup] ?? [];
        groupItems.forEach(item => enabled.set(item, !!isEnabled));
    });

    Object.entries(merged.registration?.items ?? {}).forEach(([item, isEnabled]) => {
        if (isEnabled == null) {
            return;
        }
        enabled.set(item as AgentToolItem, !!isEnabled);
    });

    return Object.keys(toolItems).filter(item => enabled.get(item as AgentToolItem)) as AgentToolItem[];
}

export function resolveAgentToolProviders(options?: AgentToolsOptions): ProvdierOf<AgentTool>[] {
    const names = resolveAgentToolNames(options);
    return names.map(name => toolItems[name]);
}

export function resolveAgentToolBundles(options?: AgentToolsOptions): AgentCapabilityBundle[] {
    const merged = mergeAgentToolsOptions(options);
    const enabledNames = new Set(resolveAgentToolNames(merged));
    return allToolGroups.map(group => {
        const tools = toolGroups[group].slice();
        return {
            name: group,
            description: bundleDescriptions[group],
            tools,
            defaultEnabled: defaultToolGroups.includes(group),
            deferredActivation: deferredActivationBundles.has(group),
            enabled: tools.some(tool => enabledNames.has(tool))
        };
    });
}

export function withResolvedAgentTools(options?: AgentToolsOptions): Provider[] {
    return withAgentTools(...resolveAgentToolProviders(options));
}

export function withFilesystemAgentTools(): Provider[] {
    return withAgentTools(...toolGroups.filesystem.map(name => toolItems[name]));
}

export function withWebAgentTools(): Provider[] {
    return withAgentTools(...toolGroups.web.map(name => toolItems[name]));
}

export function withHttpAgentTools(): Provider[] {
    return withAgentTools(...toolGroups.http.map(name => toolItems[name]));
}

export function withUtilityAgentTools(): Provider[] {
    return withAgentTools(...toolGroups.utility.map(name => toolItems[name]));
}

export function withPlanningAgentTools(): Provider[] {
    return withAgentTools(...toolGroups.planning.map(name => toolItems[name]));
}

export function withMemoryAgentTools(): Provider[] {
    return withAgentTools(...toolGroups.memory.map(name => toolItems[name]));
}

export function withRegistryAgentTools(): Provider[] {
    return withAgentTools(...toolGroups.registry.map(name => toolItems[name]));
}

export function withSchedulingAgentTools(): Provider[] {
    return withAgentTools(...toolGroups.scheduling.map(name => toolItems[name]));
}

export function withTerminalAgentTools(): Provider[] {
    return withAgentTools(...toolGroups.terminal.map(name => toolItems[name]));
}

export function withDefaultAgentTools(): Provider[] {
    return withResolvedAgentTools();
}

export function provideResolvedAgentTools(): Provider {
    return {
        provider(injector: Injector) {
            const options = injector.get(AGENT_TOOLS_OPTIONS, undefined as any);
            const providers = resolveAgentToolProviders(options);
            return toProviders(AGENT_TOOLS, providers, true);
        }
    };
}

export function provideResolvedAgentToolBundles(): Provider {
    return {
        provider(injector: Injector) {
            const options = injector.get(AGENT_TOOLS_OPTIONS, undefined as any);
            return toProviders(AGENT_TOOL_BUNDLES, resolveAgentToolBundles(options), true);
        }
    };
}

export function providerTools(options?: AgentToolsOptions, ...extraTools: ProvdierOf<AgentTool>[]): ModuleWithProviders<AgentToolsModule> {
    return {
        module: AgentToolsModule,
        providers: [
            ...withAgentToolsOptions(options),
            ...withAgentTools(...extraTools)
        ]
    };
}

export const provideAgentTools = providerTools;

export { toolGroups as AGENT_TOOL_GROUPS, toolItems as AGENT_TOOL_ITEMS, allToolProviders as AGENT_TOOL_PROVIDERS };
