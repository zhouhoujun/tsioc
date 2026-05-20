import { Module, ModuleWithProviders } from '@tsdi/ioc';
import { AgentModule } from '@tsdi/agent';
import { AGENT_TOOLS_OPTIONS } from './tokens';
import { AgentToolsOptions, defaultAgentToolsOptions, mergeAgentToolsOptions } from './options';
import { ReadFileTool } from '../files/read-file.tool';
import { WriteFileTool } from '../files/write-file.tool';
import { EditFileTool } from '../files/edit-file.tool';
import { GlobSearchTool } from '../files/glob-search.tool';
import { ContentSearchTool } from '../files/content-search.tool';
import { CalculatorTool } from '../utility/calculator.tool';
import { WebSearchTool } from '../web/web-search.tool';
import { WebExtractTool } from '../web/web-extract.tool';
import { TodoTool } from '../planning/todo.tool';
import { ScheduleTool } from '../scheduling/schedule.tool';
import { TerminalTool } from '../terminal/terminal.tool';
import { MemoryListTool } from '../memory/memory-list.tool';
import { MemoryPutTool } from '../memory/memory-put.tool';
import { MemorySearchTool } from '../memory/memory-search.tool';
import { MemoryDeleteTool } from '../memory/memory-delete.tool';
import { HttpFetchTool } from '../http/http-fetch.tool';
import { HttpRequestTool } from '../http/http-request.tool';
import { ToolSearchTool } from '../registry/tool-search.tool';
import { ToolInspectTool } from '../registry/tool-inspect.tool';
import { provideResolvedAgentToolBundles, provideResolvedAgentTools } from './provider';

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
        WriteFileTool,
        EditFileTool,
        GlobSearchTool,
        ContentSearchTool,
        CalculatorTool,
        WebSearchTool,
        WebExtractTool,
        TodoTool,
        ScheduleTool,
        TerminalTool,
        MemoryListTool,
        MemoryPutTool,
        MemorySearchTool,
        MemoryDeleteTool,
        HttpFetchTool,
        HttpRequestTool,
        ToolSearchTool,
        ToolInspectTool,
        provideResolvedAgentTools(),
        provideResolvedAgentToolBundles()
    ],
    exports: [
        ReadFileTool,
        WriteFileTool,
        EditFileTool,
        GlobSearchTool,
        ContentSearchTool,
        CalculatorTool,
        WebSearchTool,
        WebExtractTool,
        TodoTool,
        ScheduleTool,
        TerminalTool,
        MemoryListTool,
        MemoryPutTool,
        MemorySearchTool,
        MemoryDeleteTool,
        HttpFetchTool,
        HttpRequestTool,
        ToolSearchTool,
        ToolInspectTool
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
