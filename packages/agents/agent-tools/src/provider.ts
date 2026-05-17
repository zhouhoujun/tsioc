import { ModuleWithProviders, Provider } from '@tsdi/ioc';
import { AgentTool, withAgentTools } from '@tsdi/agent';
import { AgentToolsModule } from './agent-tools.module';
import { AgentToolsOptions, mergeAgentToolsOptions } from './options';
import { AGENT_TOOLS_OPTIONS } from './tokens';
import { ReadFileTool } from './files/read-file.tool';
import { GlobSearchTool } from './files/glob-search.tool';
import { ContentSearchTool } from './files/content-search.tool';
import { CalculatorTool } from './utility/calculator.tool';
import { WebSearchTool } from './web/web-search.tool';
import { WebExtractTool } from './web/web-extract.tool';
import { TodoTool } from '../planning/todo.tool';
import { ScheduleTool } from '../scheduling/schedule.tool';
import { TerminalTool } from '../terminal/terminal.tool';
import { MemoryListTool } from '../memory/memory-list.tool';
import { MemoryDeleteTool } from '../memory/memory-delete.tool';
import { HttpFetchTool } from '../http/http-fetch.tool';
import { HttpRequestTool } from '../http/http-request.tool';
import { ToolSearchTool } from '../registry/tool-search.tool';
import { ToolInspectTool } from '../registry/tool-inspect.tool';

export function withAgentToolsOptions(options?: AgentToolsOptions): Provider[] {
    return [{
        provide: AGENT_TOOLS_OPTIONS,
        useValue: mergeAgentToolsOptions(options)
    }];
}

export function withFilesystemAgentTools(): Provider[] {
    return withAgentTools(ReadFileTool, GlobSearchTool, ContentSearchTool);
}

export function withWebAgentTools(): Provider[] {
    return withAgentTools(WebSearchTool, WebExtractTool);
}

export function withHttpAgentTools(): Provider[] {
    return withAgentTools(HttpFetchTool, HttpRequestTool);
}

export function withUtilityAgentTools(): Provider[] {
    return withAgentTools(CalculatorTool);
}

export function withPlanningAgentTools(): Provider[] {
    return withAgentTools(TodoTool);
}

export function withMemoryAgentTools(): Provider[] {
    return withAgentTools(MemoryListTool, MemoryDeleteTool);
}

export function withRegistryAgentTools(): Provider[] {
    return withAgentTools(ToolSearchTool, ToolInspectTool);
}

export function withSchedulingAgentTools(): Provider[] {
    return withAgentTools(ScheduleTool);
}

export function withTerminalAgentTools(): Provider[] {
    return withAgentTools(TerminalTool);
}

export function withDefaultAgentTools(): Provider[] {
    return [
        ...withFilesystemAgentTools(),
        ...withUtilityAgentTools(),
        ...withWebAgentTools(),
        ...withPlanningAgentTools(),
        ...withSchedulingAgentTools(),
        ...withMemoryAgentTools(),
        ...withRegistryAgentTools()
    ];
}

export function provideAgentTools(options?: AgentToolsOptions, ...extraTools: (new (...args: any[]) => AgentTool)[]): ModuleWithProviders<AgentToolsModule> {
    return {
        module: AgentToolsModule,
        providers: [
            ...withAgentToolsOptions(options),
            ...withAgentTools(...extraTools)
        ]
    };
}
