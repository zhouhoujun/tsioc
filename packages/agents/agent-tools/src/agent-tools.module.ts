import { Module, ModuleWithProviders } from '@tsdi/ioc';
import { ApplicationArguments } from '@tsdi/core';
import { AgentModule } from '@tsdi/agent';
import { AGENT_TOOLS_OPTIONS } from './tokens';
import { AgentToolsOptions, defaultAgentToolsOptions, mergeAgentToolsOptions } from './options';
import {
    DefaultBackupAdapter,
    DefaultKnowledgeAdapter,
    DefaultModelRoutingAdapter,
    DefaultPollAdapter,
    DefaultCanvasAdapter,
    DefaultKanbanAdapter,
    DefaultIntentVerifierAdapter,
    DefaultDataExportAdapter,
    DefaultApprovalAdapter
} from './default-adapters';
import { DelegatingLlmTaskAdapter, DelegatingSpawnAgentAdapter } from './nested-agent-runner';
import { IpWhoIsLocationAdapter } from './location-adapter';
import { OpenMeteoWeatherAdapter } from './weather-adapter';
import { LocationAdapter, LocationTool } from '../utility/location.tool';
import { WeatherAdapter } from '../utility/weather.tool';
import { ReadFileTool } from '../files/read-file.tool';
import { WriteFileTool } from '../files/write-file.tool';
import { EditFileTool } from '../files/edit-file.tool';
import { MkdirTool } from '../files/mkdir.tool';
import { CopyFileTool } from '../files/copy-file.tool';
import { MoveFileTool } from '../files/move-file.tool';
import { DeleteFileTool } from '../files/delete-file.tool';
import { ListDirTool } from '../files/list-dir.tool';
import { StatTool } from '../files/stat.tool';
import { GlobSearchTool } from '../files/glob-search.tool';
import { ContentSearchTool } from '../files/content-search.tool';
import { WatchFilesTool } from '../files/watch-files.tool';
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
import { CodingTaskStore, CodingTaskTool, ToolRegistryWorkspaceActionRunner, WorkspaceActionRunner } from '../coding';
import { ImageInfoTool } from '../media/image-info.tool';
import { PdfReadTool } from '../media/pdf-read.tool';
import { VisionAnalyzeTool } from '../media/vision-analyze.tool';
import { ImageGenerateTool } from '../media/image-generate.tool';
import { SpawnAgentTool } from '../agent/spawn-agent.tool';
import { CodeExecutionAdapter, ExecuteCodeTool, LocalCodeExecutionAdapter } from '../code-execution';
import { KnowledgeSearchTool } from '../knowledge/knowledge-search.tool';
import { KnowledgeStoreTool } from '../knowledge/knowledge-store.tool';
import { GitOperationsTool } from '../git/git-operations.tool';
import { WeatherTool } from '../utility/weather.tool';
import { SessionSearchTool } from '../sessions/session-search.tool';
import { SendMessageTool } from '../communication/send-message.tool';
import { AudioTranscribeTool } from '../audio/audio-transcribe.tool';
import { TextToSpeechTool } from '../audio/text-to-speech.tool';
import { VerifiableIntentTool } from '../security/verifiable-intent.tool';
import { SecurityScanTool } from '../security/security-scan.tool';
import { CronManageTool } from '../cron/cron-manage.tool';
import { DataManageTool } from '../data/data-manage.tool';
import { LlmTaskTool } from '../llm/llm-task.tool';
import { ScreenshotTool } from '../capture/screenshot.tool';
import { GuiControlAdapter, GuiControlTool, ScreenshotAdapter } from '../capture';
import { CanvasTool } from '../canvas/canvas.tool';
import { ApprovalTool } from '../approval/approval.tool';
import { CheckpointTool } from '../approval/checkpoint.tool';
import { PipelineTool } from '../pipeline/pipeline.tool';
import { KanbanTool } from '../kanban/kanban.tool';
import { BackupTool } from '../backup/backup.tool';
import { ModelRoutingTool } from '../model-routing/model-routing.tool';
import { PollTool } from '../poll/poll.tool';
import { AiCliTool } from '../ai-cli/ai-cli.tool';
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
        MkdirTool,
        CopyFileTool,
        MoveFileTool,
        DeleteFileTool,
        ListDirTool,
        StatTool,
        GlobSearchTool,
        ContentSearchTool,
        WatchFilesTool,
        CalculatorTool,
        LocationTool,
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
        CodingTaskStore,
        ToolRegistryWorkspaceActionRunner,
        { provide: WorkspaceActionRunner, useExisting: ToolRegistryWorkspaceActionRunner },
        CodingTaskTool,
        ImageInfoTool,
        PdfReadTool,
        VisionAnalyzeTool,
        ImageGenerateTool,
        SpawnAgentTool,
        ExecuteCodeTool,
        KnowledgeSearchTool,
        KnowledgeStoreTool,
        GitOperationsTool,
        WeatherTool,
        SessionSearchTool,
        SendMessageTool,
        AudioTranscribeTool,
        TextToSpeechTool,
        VerifiableIntentTool,
        SecurityScanTool,
        CronManageTool,
        DataManageTool,
        LlmTaskTool,
        ScreenshotTool,
        GuiControlTool,
        CanvasTool,
        ApprovalTool,
        CheckpointTool,
        PipelineTool,
        KanbanTool,
        BackupTool,
        ModelRoutingTool,
        PollTool,
        AiCliTool,
        {
            provider(injector) {
                const options = injector.get(AGENT_TOOLS_OPTIONS, defaultAgentToolsOptions as any);
                return [{ provide: CodeExecutionAdapter, useValue: options?.codeExecution?.adapter ?? new LocalCodeExecutionAdapter(options) }];
            }
        },
        {
            provider(injector) {
                const options = injector.get(AGENT_TOOLS_OPTIONS, defaultAgentToolsOptions as any);
                return [{ provide: 'AGENT_TOOLS_PDF_READ_ADAPTER', useValue: options?.pdf?.adapter ?? null }];
            }
        },
        {
            provider(injector) {
                const options = injector.get(AGENT_TOOLS_OPTIONS, defaultAgentToolsOptions as any);
                return [{ provide: ScreenshotAdapter, useValue: options?.capture?.screenshotAdapter ?? null }];
            }
        },
        {
            provider(injector) {
                const options = injector.get(AGENT_TOOLS_OPTIONS, defaultAgentToolsOptions as any);
                return [{ provide: GuiControlAdapter, useValue: options?.capture?.guiAdapter ?? null }];
            }
        },
        {
            provider(injector) {
                const options = injector.get(AGENT_TOOLS_OPTIONS, defaultAgentToolsOptions as any);
                return [{ provide: LocationAdapter, useValue: options?.location?.adapter ?? new IpWhoIsLocationAdapter(options?.location, injector.get(ApplicationArguments, null)) }];
            }
        },
        {
            provider(injector) {
                const options = injector.get(AGENT_TOOLS_OPTIONS, defaultAgentToolsOptions as any);
                return [{ provide: WeatherAdapter, useValue: options?.weather?.adapter ?? new OpenMeteoWeatherAdapter(options?.weather) }];
            }
        },
        DefaultBackupAdapter,
        DefaultKnowledgeAdapter,
        DefaultModelRoutingAdapter,
        DefaultPollAdapter,
        DefaultCanvasAdapter,
        DefaultKanbanAdapter,
        DefaultIntentVerifierAdapter,
        DefaultDataExportAdapter,
        DefaultApprovalAdapter,
        DelegatingSpawnAgentAdapter,
        DelegatingLlmTaskAdapter,
        provideResolvedAgentTools(),
        provideResolvedAgentToolBundles()
    ],
    exports: [
        ReadFileTool,
        WriteFileTool,
        EditFileTool,
        MkdirTool,
        CopyFileTool,
        MoveFileTool,
        DeleteFileTool,
        ListDirTool,
        StatTool,
        GlobSearchTool,
        ContentSearchTool,
        WatchFilesTool,
        CalculatorTool,
        LocationTool,
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
        CodingTaskTool,
        ImageInfoTool,
        PdfReadTool,
        VisionAnalyzeTool,
        ImageGenerateTool,
        SpawnAgentTool,
        ExecuteCodeTool,
        KnowledgeSearchTool,
        KnowledgeStoreTool,
        GitOperationsTool,
        WeatherTool,
        SessionSearchTool,
        SendMessageTool,
        AudioTranscribeTool,
        TextToSpeechTool,
        VerifiableIntentTool,
        SecurityScanTool,
        CronManageTool,
        DataManageTool,
        LlmTaskTool,
        ScreenshotTool,
        GuiControlTool,
        CanvasTool,
        ApprovalTool,
        CheckpointTool,
        PipelineTool,
        KanbanTool,
        BackupTool,
        ModelRoutingTool,
        PollTool,
        AiCliTool
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
