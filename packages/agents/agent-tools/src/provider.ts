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

export function withUtilityAgentTools(): Provider[] {
    return withAgentTools(CalculatorTool);
}

export function withDefaultAgentTools(): Provider[] {
    return [
        ...withFilesystemAgentTools(),
        ...withUtilityAgentTools(),
        ...withWebAgentTools()
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
