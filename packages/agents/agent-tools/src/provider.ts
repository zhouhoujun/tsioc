import { Provider, ProvdierOf, toProviders, Injector } from '@tsdi/ioc';
import { AgentCapabilityBundle, AgentTool, withAgentTools } from '@tsdi/agent';
import { AGENT_TOOL_BUNDLES, AGENT_TOOLS } from '@tsdi/agent';
import { ApplicationArguments } from '@tsdi/core';
import { AgentToolGroup, AgentToolItem, AgentToolsOptions, mergeAgentToolsOptions } from './options';
import { AGENT_TOOLS_OPTIONS } from './tokens';
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
import { LocationAdapter, LocationTool } from '../utility/location.tool';
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
import { SpawnAgentTool, ParallelSpawnTool, OrchestrateTool } from '../agent';
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

function provideCodingTaskTool(): Provider {
    return {
        provider(injector: Injector) {
            return [{
                provide: CodingTaskTool,
                useFactory: () => new CodingTaskTool(
                    injector.get(CodingTaskStore, null),
                    injector.get(WorkspaceActionRunner, null),
                    injector.get(LlmTaskTool, null),
                    injector.get(AGENT_TOOLS_OPTIONS, null),
                    injector
                )
            }];
        }
    };
}
import { provideMcpTools } from '../mcp/provider';
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
import { DelegatingLlmTaskAdapter, DelegatingSpawnAgentAdapter, NestedAgentRunner } from './nested-agent-runner';
import { LightweightAgentRunner } from './lightweight-agent-runner';
import { IpWhoIsLocationAdapter } from './location-adapter';
import { OpenMeteoWeatherAdapter } from './weather-adapter';
import { WeatherAdapter } from '../utility/weather.tool';

const toolItems = {
    read_file: ReadFileTool,
    write_file: WriteFileTool,
    edit_file: EditFileTool,
    mkdir: MkdirTool,
    copy_file: CopyFileTool,
    move_file: MoveFileTool,
    delete_file: DeleteFileTool,
    list_dir: ListDirTool,
    stat: StatTool,
    glob_search: GlobSearchTool,
    content_search: ContentSearchTool,
    watch_files: WatchFilesTool,
    calculator: CalculatorTool,
    location: LocationTool,
    web_search: WebSearchTool,
    web_extract: WebExtractTool,
    browser_open: BrowserOpenTool,
    text_browser: TextBrowserTool,
    sessions_current: SessionsCurrentTool,
    sessions_list: SessionsListTool,
    sessions_history: SessionsHistoryTool,
    todo: TodoTool,
    ask_user: AskUserTool,
    escalate: EscalateTool,
    'process.start': ProcessStartTool,
    'process.poll': ProcessPollTool,
    'process.kill': ProcessKillTool,
    schedule: ScheduleTool,
    'memory.list': MemoryListTool,
    'memory.put': MemoryPutTool,
    'memory.search': MemorySearchTool,
    'memory.recall': MemoryRecallTool,
    'memory.export': MemoryExportTool,
    'memory.forget': MemoryForgetTool,
    'memory.purge': MemoryPurgeTool,
    'memory.delete': MemoryDeleteTool,
    project_intel: ProjectIntelTool,
    coding_task: CodingTaskTool,
    image_info: ImageInfoTool,
    pdf_read: PdfReadTool,
    tool_search: ToolSearchTool,
    tool_inspect: ToolInspectTool,
    http_fetch: HttpFetchTool,
    http_request: HttpRequestTool,
    terminal: TerminalTool,
    vision_analyze: VisionAnalyzeTool,
    image_generate: ImageGenerateTool,
    spawn_agent: SpawnAgentTool,
    parallel_spawn: ParallelSpawnTool,
    orchestrate: OrchestrateTool,
    execute_code: ExecuteCodeTool,
    knowledge_search: KnowledgeSearchTool,
    knowledge_store: KnowledgeStoreTool,
    git_operations: GitOperationsTool,
    weather: WeatherTool,
    session_search: SessionSearchTool,
    send_message: SendMessageTool,
    audio_transcribe: AudioTranscribeTool,
    text_to_speech: TextToSpeechTool,
    verifiable_intent: VerifiableIntentTool,
    security_scan: SecurityScanTool,
    cron_manage: CronManageTool,
    data_manage: DataManageTool,
    llm_task: LlmTaskTool,
    screenshot: ScreenshotTool,
    gui_control: GuiControlTool,
    canvas: CanvasTool,
    approval: ApprovalTool,
    checkpoint: CheckpointTool,
    pipeline: PipelineTool,
    kanban: KanbanTool,
    backup: BackupTool,
    model_routing: ModelRoutingTool,
    poll: PollTool,
    ai_cli: AiCliTool
} as const satisfies Record<AgentToolItem, ProvdierOf<AgentTool>>;

const toolGroups = {
    filesystem: ['read_file', 'list_dir', 'stat', 'glob_search', 'content_search', 'watch_files'],
    filesystem_write: ['write_file', 'edit_file', 'mkdir', 'copy_file', 'move_file', 'delete_file'],
    utility: ['calculator', 'location', 'weather'],
    web: ['web_search', 'web_extract'],
    browser: ['browser_open', 'text_browser'],
    sessions: ['sessions_current', 'sessions_list', 'sessions_history', 'session_search'],
    planning: ['todo', 'ask_user', 'escalate'],
    process: ['process.start', 'process.poll', 'process.kill'],
    scheduling: ['schedule'],
    memory: ['memory.list', 'memory.put', 'memory.search', 'memory.recall', 'memory.export', 'memory.forget', 'memory.purge', 'memory.delete'],
    project: ['project_intel', 'coding_task'],
    media: ['image_info', 'pdf_read', 'vision_analyze', 'image_generate'],
    registry: ['tool_search', 'tool_inspect'],
    http: ['http_fetch', 'http_request'],
    terminal: ['terminal'],
    agent: ['spawn_agent', 'parallel_spawn', 'orchestrate'],
    code_execution: ['execute_code'],
    knowledge: ['knowledge_search', 'knowledge_store'],
    git: ['git_operations'],
    communication: ['send_message'],
    audio: ['audio_transcribe', 'text_to_speech'],
    security: ['verifiable_intent', 'security_scan'],
    cron: ['cron_manage'],
    data: ['data_manage'],
    llm: ['llm_task'],
    capture: ['screenshot', 'gui_control'],
    canvas: ['canvas'],
    approval: ['approval', 'checkpoint'],
    pipeline: ['pipeline'],
    kanban: ['kanban'],
    backup: ['backup'],
    model_routing: ['model_routing'],
    poll: ['poll'],
    ai_cli: ['ai_cli']
} as const satisfies Record<AgentToolGroup, AgentToolItem[]>;

const defaultToolGroups: AgentToolGroup[] = ['filesystem', 'filesystem_write', 'utility', 'web', 'planning', 'scheduling', 'memory', 'project', 'registry', 'agent', 'knowledge', 'git', 'cron', 'llm', 'canvas', 'approval', 'pipeline', 'kanban', 'backup', 'model_routing', 'poll', 'ai_cli'];
const allToolGroups = Object.keys(toolGroups) as AgentToolGroup[];
const allToolProviders = Array.from(new Set(Object.values(toolItems)));
const bundleDescriptions: Record<AgentToolGroup, string> = {
    filesystem: 'Workspace file reading, search, and change monitoring tools.',
    filesystem_write: 'Workspace file mutation tools.',
    utility: 'General-purpose calculation and utility helpers.',
    web: 'Web search and extraction tools.',
    browser: 'Lightweight browser open and text browsing tools.',
    sessions: 'Read-only session listing and history inspection tools.',
    planning: 'Planning, task tracking, and collaboration prompt tools.',
    process: 'Background process lifecycle tools.',
    scheduling: 'Prompt scheduling and recurring task tools.',
    memory: 'Session and global memory management tools.',
    project: 'Project summarization, coding task orchestration, and handoff intelligence tools.',
    media: 'Image and document inspection tools.',
    registry: 'Tool discovery and activation tools.',
    http: 'HTTP fetch and request tools.',
    terminal: 'Terminal command execution tools.',
    agent: 'Sub-agent delegation, parallel task execution, and isolated task execution tools.',
    code_execution: 'Sandboxed code execution across multiple languages.',
    knowledge: 'Knowledge base query and store tools.',
    git: 'Git repository operations and history inspection tools.',
    communication: 'Multi-platform messaging and notification tools.',
    audio: 'Audio transcription and text-to-speech tools.',
    security: 'Intent verification and security scanning tools.',
    cron: 'Cron job management and scheduling tools.',
    data: 'Session data, memory, and knowledge export/import tools.',
    llm: 'Standalone LLM inference task execution tools.',
    capture: 'Screen capture and GUI control tools.',
    canvas: 'Structured visual canvas for planning and design.',
    approval: 'Approval requests and session checkpoint tools.',
    pipeline: 'Multi-step pipeline definition and execution tools.',
    kanban: 'Kanban board for structured task tracking.',
    backup: 'Session, memory, and configuration backup and restore.',
    model_routing: 'Model routing rule configuration and resolution.',
    poll: 'Poll creation, voting, and consensus management.',
    ai_cli: 'External AI coding CLI tool invocation (Claude Code, OpenCode, Gemini CLI, Codex CLI).'
};
const deferredActivationBundles = new Set<AgentToolGroup>(['filesystem', 'filesystem_write', 'web', 'browser', 'sessions', 'process', 'http', 'terminal', 'media', 'agent', 'code_execution', 'git', 'communication', 'audio', 'security', 'data', 'capture', 'pipeline', 'backup', 'poll', 'ai_cli']);

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
            enabled: tools.some(tool => enabledNames.has(tool)),
            source: 'builtin',
            providerId: '@tsdi/agent-tools',
            activation: {
                kind: deferredActivationBundles.has(group) ? 'deferred' : 'always',
                scope: deferredActivationBundles.has(group) ? 'session' : 'global'
            },
            sessionScoped: deferredActivationBundles.has(group)
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

export function withBrowserAgentTools(): Provider[] {
    return withAgentTools(...toolGroups.browser.map(name => toolItems[name]));
}

export function withSessionsAgentTools(): Provider[] {
    return withAgentTools(...toolGroups.sessions.map(name => toolItems[name]));
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

export function withProcessAgentTools(): Provider[] {
    return withAgentTools(...toolGroups.process.map(name => toolItems[name]));
}

export function withMemoryAgentTools(): Provider[] {
    return withAgentTools(...toolGroups.memory.map(name => toolItems[name]));
}

export function withProjectAgentTools(): Provider[] {
    return withAgentTools(...toolGroups.project.map(name => toolItems[name]));
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

export function withAgentDelegationTools(): Provider[] {
    return withAgentTools(...toolGroups.agent.map(name => toolItems[name]));
}

export function withCodeExecutionTools(): Provider[] {
    return withAgentTools(...toolGroups.code_execution.map(name => toolItems[name]));
}

export function withKnowledgeTools(): Provider[] {
    return withAgentTools(...toolGroups.knowledge.map(name => toolItems[name]));
}

export function withGitTools(): Provider[] {
    return withAgentTools(...toolGroups.git.map(name => toolItems[name]));
}

export function withCommunicationTools(): Provider[] {
    return withAgentTools(...toolGroups.communication.map(name => toolItems[name]));
}

export function withAudioTools(): Provider[] {
    return withAgentTools(...toolGroups.audio.map(name => toolItems[name]));
}

export function withSecurityTools(): Provider[] {
    return withAgentTools(...toolGroups.security.map(name => toolItems[name]));
}

export function withCronTools(): Provider[] {
    return withAgentTools(...toolGroups.cron.map(name => toolItems[name]));
}

export function withDataTools(): Provider[] {
    return withAgentTools(...toolGroups.data.map(name => toolItems[name]));
}

export function withLlmTools(): Provider[] {
    return withAgentTools(...toolGroups.llm.map(name => toolItems[name]));
}

export function withCaptureTools(): Provider[] {
    return withAgentTools(...toolGroups.capture.map(name => toolItems[name]));
}

export function withCanvasTools(): Provider[] {
    return withAgentTools(...toolGroups.canvas.map(name => toolItems[name]));
}

export function withApprovalTools(): Provider[] {
    return withAgentTools(...toolGroups.approval.map(name => toolItems[name]));
}

export function withPipelineTools(): Provider[] {
    return withAgentTools(...toolGroups.pipeline.map(name => toolItems[name]));
}

export function withKanbanTools(): Provider[] {
    return withAgentTools(...toolGroups.kanban.map(name => toolItems[name]));
}

export function withBackupTools(): Provider[] {
    return withAgentTools(...toolGroups.backup.map(name => toolItems[name]));
}

export function withModelRoutingTools(): Provider[] {
    return withAgentTools(...toolGroups.model_routing.map(name => toolItems[name]));
}

export function withPollTools(): Provider[] {
    return withAgentTools(...toolGroups.poll.map(name => toolItems[name]));
}

export function withAiCliTools(): Provider[] {
    return withAgentTools(...toolGroups.ai_cli.map(name => toolItems[name]));
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

export function provideTools(options?: AgentToolsOptions, ...extraTools: ProvdierOf<AgentTool>[]): Provider[] {
    const merged = mergeAgentToolsOptions(options);
    return [
        ...withAgentToolsOptions(merged),
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
        WebSearchTool,
        WebExtractTool,
        BrowserOpenTool,
        TextBrowserTool,
        SessionsCurrentTool,
        SessionsListTool,
        SessionsHistoryTool,
        SessionSearchTool,
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
        provideCodingTaskTool(),
        ImageInfoTool,
        PdfReadTool,
        VisionAnalyzeTool,
        ImageGenerateTool,
        SpawnAgentTool,
        ParallelSpawnTool,
        OrchestrateTool,
        ExecuteCodeTool,
        KnowledgeSearchTool,
        KnowledgeStoreTool,
        GitOperationsTool,
        LocationTool,
        WeatherTool,
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
            provide: CodeExecutionAdapter,
            useValue: merged.codeExecution?.adapter ?? new LocalCodeExecutionAdapter(merged)
        },
        {
            provide: 'AGENT_TOOLS_PDF_READ_ADAPTER',
            useValue: merged.pdf?.adapter ?? null
        },
        {
            provide: ScreenshotAdapter,
            useValue: merged.capture?.screenshotAdapter ?? null
        },
        {
            provide: GuiControlAdapter,
            useValue: merged.capture?.guiAdapter ?? null
        },
        {
            provider(injector) {
                return [{
                    provide: LocationAdapter,
                    useValue: merged.location?.adapter ?? new IpWhoIsLocationAdapter(merged.location, injector.get(ApplicationArguments, null))
                }];
            }
        },
        {
            provide: WeatherAdapter,
            useValue: merged.weather?.adapter ?? new OpenMeteoWeatherAdapter(merged.weather)
        },
        ...(merged.mcp?.servers?.length ? provideMcpTools(merged.mcp) : []),
        DefaultBackupAdapter,
        DefaultKnowledgeAdapter,
        DefaultModelRoutingAdapter,
        DefaultPollAdapter,
        DefaultCanvasAdapter,
        DefaultKanbanAdapter,
        DefaultIntentVerifierAdapter,
        DefaultDataExportAdapter,
        DefaultApprovalAdapter,
        LightweightAgentRunner,
        { provide: NestedAgentRunner, useExisting: LightweightAgentRunner },
        DelegatingSpawnAgentAdapter,
        DelegatingLlmTaskAdapter,
        provideResolvedAgentTools(),
        provideResolvedAgentToolBundles(),
        ...withAgentTools(...extraTools)
    ];
}

export { toolGroups as AGENT_TOOL_GROUPS, toolItems as AGENT_TOOL_ITEMS, allToolProviders as AGENT_TOOL_PROVIDERS };
