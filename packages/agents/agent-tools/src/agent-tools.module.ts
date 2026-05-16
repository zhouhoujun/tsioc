import { Module, ModuleWithProviders } from '@tsdi/ioc';
import { AgentModule, AGENT_TOOLS } from '@tsdi/agent';
import { AGENT_TOOLS_OPTIONS } from './tokens';
import { AgentToolsOptions, defaultAgentToolsOptions, mergeAgentToolsOptions } from './options';
import { ReadFileTool } from './files/read-file.tool';
import { GlobSearchTool } from './files/glob-search.tool';
import { ContentSearchTool } from './files/content-search.tool';
import { CalculatorTool } from './utility/calculator.tool';
import { WebSearchTool } from './web/web-search.tool';
import { WebExtractTool } from './web/web-extract.tool';

@Module({
    imports: [AgentModule],
    providers: [
        {
            provider(injector) {
                if (injector.has(AGENT_TOOLS_OPTIONS)) {
                    return;
                }
                return [{ provide: AGENT_TOOLS_OPTIONS, useValue: defaultAgentToolsOptions }];
            }
        },
        ReadFileTool,
        GlobSearchTool,
        ContentSearchTool,
        CalculatorTool,
        WebSearchTool,
        WebExtractTool,
        { provide: AGENT_TOOLS, useExisting: ReadFileTool, multi: true },
        { provide: AGENT_TOOLS, useExisting: GlobSearchTool, multi: true },
        { provide: AGENT_TOOLS, useExisting: ContentSearchTool, multi: true },
        { provide: AGENT_TOOLS, useExisting: CalculatorTool, multi: true },
        { provide: AGENT_TOOLS, useExisting: WebSearchTool, multi: true },
        { provide: AGENT_TOOLS, useExisting: WebExtractTool, multi: true }
    ]
})
export class AgentToolsModule {
    static withOptions(options: AgentToolsOptions): ModuleWithProviders<AgentToolsModule> {
        return {
            module: AgentToolsModule,
            providers: [
                { provide: AGENT_TOOLS_OPTIONS, useValue: mergeAgentToolsOptions(options) }
            ]
        };
    }
}
