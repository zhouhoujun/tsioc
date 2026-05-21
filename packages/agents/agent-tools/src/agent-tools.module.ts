import { Module, ModuleWithProviders } from '@tsdi/ioc';
import { AgentModule } from '@tsdi/agent';
import { AGENT_TOOLS_OPTIONS } from './tokens';
import { AgentToolsOptions, defaultAgentToolsOptions, mergeAgentToolsOptions } from './options';
import { ReadFileTool } from '../files/read-file.tool';
import { WriteFileTool } from '../files/write-file.tool';
import { EditFileTool } from '../files/edit-file.tool';
import { ListDirTool } from '../files/list-dir.tool';
import { StatTool } from '../files/stat.tool';
import { GlobSearchTool } from '../files/glob-search.tool';
import { ContentSearchTool } from '../files/content-search.tool';
import { CalculatorTool } from '../utility/calculator.tool';
import { WebSearchTool } from '../web/web-search.tool';
import { WebExtractTool } from '../web/web-extract.tool';
import { BrowserOpenTool } from '../browser/browser-open.tool';
import { TextBrowserTool } from '../browser/text-browser.tool';
import { SessionsCurrentTool } from '../sessions/sessions-current.tool';
import { SessionsListTool } from '../sessions/sessions-list.tool';
import { SessionsHistoryTool } from '../sessions/sessions-history.tool';
import { TodoTool } from '../planning/todo.tool';
import { AskUserTool } from '../planning/ask-user.tool';
import { EscalateTool } from '../planning/escalate.tool';
import { ScheduleTool } from '../scheduling/schedule.tool';
import { TerminalTool } from '../terminal/terminal.tool';
import { ProcessRegistry } from '../process/ProcessRegistry';
import { ProcessStartTool } from '../process/process-start.tool';
import { ProcessPollTool } from '../process/process-poll.tool';
import { ProcessKillTool } from '../process/process-kill.tool';
import { MemoryListTool } from '../memory/memory-list.tool';
import { MemoryPutTool } from '../memory/memory-put.tool';
import { MemorySearchTool } from '../memory/memory-search.tool';
import { MemoryRecallTool } from '../memory/memory-recall.tool';
import { MemoryExportTool } from '../memory/memory-export.tool';
import { MemoryForgetTool } from '../memory/memory-forget.tool';
import { MemoryPurgeTool } from '../memory/memory-purge.tool';
import { MemoryDeleteTool } from '../memory/memory-delete.tool';
import { HttpFetchTool } from '../http/http-fetch.tool';
import { HttpRequestTool } from '../http/http-request.tool';
import { ToolSearchTool } from '../registry/tool-search.tool';
import { ToolInspectTool } from '../registry/tool-inspect.tool';
import { ProjectIntelTool } from '../project/project-intel.tool';
import { ImageInfoTool } from '../media/image-info.tool';
import { PdfReadTool } from '../media/pdf-read.tool';
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
        ListDirTool,
        StatTool,
        GlobSearchTool,
        ContentSearchTool,
        CalculatorTool,
        WebSearchTool,
        WebExtractTool,
        BrowserOpenTool,
        TextBrowserTool,
        SessionsCurrentTool,
        SessionsListTool,
        SessionsHistoryTool,
        TodoTool,
        AskUserTool,
        EscalateTool,
        ProcessRegistry,
        ProcessStartTool,
        ProcessPollTool,
        ProcessKillTool,
        ScheduleTool,
        TerminalTool,
        MemoryListTool,
        MemoryPutTool,
        MemorySearchTool,
        MemoryRecallTool,
        MemoryExportTool,
        MemoryForgetTool,
        MemoryPurgeTool,
        MemoryDeleteTool,
        HttpFetchTool,
        HttpRequestTool,
        ToolSearchTool,
        ToolInspectTool,
        ProjectIntelTool,
        ImageInfoTool,
        PdfReadTool,
        {
            provider(injector) {
                const options = injector.get(AGENT_TOOLS_OPTIONS, defaultAgentToolsOptions as any);
                return [{ provide: 'AGENT_TOOLS_PDF_READ_ADAPTER', useValue: options?.pdf?.adapter ?? null }];
            }
        },
        provideResolvedAgentTools(),
        provideResolvedAgentToolBundles()
    ],
    exports: [
        ReadFileTool,
        WriteFileTool,
        EditFileTool,
        ListDirTool,
        StatTool,
        GlobSearchTool,
        ContentSearchTool,
        CalculatorTool,
        WebSearchTool,
        WebExtractTool,
        BrowserOpenTool,
        TextBrowserTool,
        SessionsCurrentTool,
        SessionsListTool,
        SessionsHistoryTool,
        TodoTool,
        AskUserTool,
        EscalateTool,
        ProcessStartTool,
        ProcessPollTool,
        ProcessKillTool,
        ScheduleTool,
        TerminalTool,
        MemoryListTool,
        MemoryPutTool,
        MemorySearchTool,
        MemoryRecallTool,
        MemoryExportTool,
        MemoryForgetTool,
        MemoryPurgeTool,
        MemoryDeleteTool,
        HttpFetchTool,
        HttpRequestTool,
        ToolSearchTool,
        ToolInspectTool,
        ProjectIntelTool,
        ImageInfoTool,
        PdfReadTool
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
