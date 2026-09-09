import { Module, ModuleWithProviders } from '@tsdi/ioc';
import { DefaultModuleLoader, ModuleLoader } from '@tsdi/core';
import { ConfigModule } from '@tsdi/microservices/config';
import { AgentOptions, defaultAgentOptions } from './options';
import { AGENT_OPTIONS, AGENT_TOOLS } from './tokens';
import { ModelAdapter } from './model/ModelAdapter';
import { RoutedModelAdapter } from './model/RoutedModelAdapter';
import { ToolRegistry } from './tools/ToolRegistry';
import { LocalToolRegistry } from './tools/LocalToolRegistry';
import { ToolActivationStore } from './tools/ToolActivationStore';
import { ToolLoopDetector } from './tools/ToolLoopDetector';
import { ApprovalManager, ToolApprovalManager } from './tools/ToolApprovalManager';
import { AgentContextManager } from './context/AgentContextManager';
import { SystemPromptBuilder, IdentitySection, DateTimeSection, ToolsSection, MemorySection, ProjectContextSection, McpServerInstructionsSection } from './prompt/SystemPromptBuilder';
import { AGENT_PROMPT_SECTIONS } from './tokens';
import { EchoTool, ExperienceSynthesizeTool, MemoryPutTool, MemorySearchTool, TimeTool } from './tools/BuiltinTools';
import { SessionStore } from './memory/SessionStore';
import { TypeOrmSessionStore } from './memory/TypeOrmSessionStore';
import { TIMELINE_HISTORY_STORE, COMMAND_EXCHANGE_STORE } from './memory/timeline-projection';
import { TypeOrmTimelineHistoryStore } from './memory/TypeOrmTimelineHistoryStore';
import { TypeOrmCommandExchangeStore } from './memory/TypeOrmCommandExchangeStore';
import { BACKGROUND_TASK_HISTORY_STORE } from './memory/background-task-store';
import { TypeOrmBackgroundTaskStore } from './memory/TypeOrmBackgroundTaskStore';
import { MemoryStore } from './memory/MemoryStore';
import { TypeOrmMemoryStore } from './memory/TypeOrmMemoryStore';
import { ProjectMemoryService } from './memory/ProjectMemoryService';
import { SessionSummarizer } from './memory/SessionSummarizer';
import { SimpleSessionSummarizer } from './memory/SimpleSessionSummarizer';
import { AgentSummaryAgent } from './memory/AgentSummaryAgent';
import { DeterministicAgentSummaryAgent } from './memory/DeterministicAgentSummaryAgent';
import { ExperienceDistiller } from './memory/ExperienceDistiller';
import { AgentMemoryRetriever, DefaultAgentMemoryRetriever } from './memory/AgentMemoryRetriever';
import { DeterministicExperienceDistiller } from './memory/DeterministicExperienceDistiller';
import { SemanticMemoryRanker } from './memory/MemoryEmbedder';
import { MemorySearchService } from './memory/MemorySearchService';
import { AgentScheduler } from './scheduler/AgentScheduler';
import { IntervalAgentScheduler } from './scheduler/IntervalAgentScheduler';
import { AgentRuntime } from './runtime/AgentRuntime';
import { DefaultAgentRuntime } from './runtime/DefaultAgentRuntime';
import { TurnHandler } from './runtime/TurnHandler';
import { AgentRequestHandler } from './channels/AgentRequestHandler';
import { AgentServer } from './channels/AgentServer';
import { AgentClient } from './channels/AgentClient';
import { LocalAgentClient } from './channels/LocalAgentClient';
import { PubSubAgentChannel } from './channels/PubSubAgentChannel';
import { EvalReportStore, EvalRunner } from './eval/EvalRunner';
import { TypeOrmEvalReportStore } from './eval/TypeOrmEvalReportStore';
import { ToolExecutionCoordinator } from './harness/ToolExecutionCoordinator';
import { FileSnapshotStore } from './harness/FileSnapshotStore';
import { GitStepSnapshotStore } from './harness/GitStepSnapshotStore';
import { ReviewFindingsStore } from './harness/ReviewFindingsStore';
import { ToolSchemaValidator } from './harness/ToolSchemaValidator';
import { RateLimitManager } from './harness/RateLimitManager';
import { OutputGuard } from './harness/OutputGuard';
import { AuditSink } from './harness/AuditSink';
import { TypeOrmAuditSink } from './harness/TypeOrmAuditSink';
import { CompactionHistoryStore } from './harness/CompactionHistoryStore';
import { TypeOrmCompactionHistoryStore } from './harness/TypeOrmCompactionHistoryStore';
import { TurnDiagnosticsStore } from './harness/TurnDiagnosticsStore';
import { TypeOrmTurnDiagnosticsStore } from './harness/TypeOrmTurnDiagnosticsStore';
import { WeaknessMiner } from './harness/WeaknessMiner';
import { SummaryQualityStore } from './harness/SummaryQualityStore';
import { TypeOrmSummaryQualityStore } from './harness/TypeOrmSummaryQualityStore';
import { DelegationGraphStore } from './harness/DelegationGraphStore';
import { TypeOrmDelegationGraphStore } from './harness/TypeOrmDelegationGraphStore';
import { SandboxExecutor, NodeChildProcessSandboxExecutor, OsSandboxExecutor } from './harness/SandboxExecutor';
import { AgentHookCommandExecutor, NoopAgentHookCommandExecutor } from './hooks/AgentHooks';
import { TypeOrmGoalStore } from './goal/TypeOrmGoalStore';
import { GoalStore } from './goal/GoalStore';
import { createAgentProviders } from './provider';
import { COMMAND_EXECUTION_CONTROL, InMemoryCommandExecutionControl } from './ui/CommandExecutionControl';
import { SessionToolActivationStore } from './tools/SessionToolActivationStore';
import { AgentClock, SystemAgentClock, AGENT_CLOCK } from './runtime/Clock';

@Module({
    imports: [
        ConfigModule
    ],
    bootstrap: [AgentRuntime],
    providers: [
        { provide: ModuleLoader, useClass: DefaultModuleLoader, asDefault: true },
        { provide: AGENT_OPTIONS, useValue: defaultAgentOptions, asDefault: true },
        { provide: COMMAND_EXECUTION_CONTROL, useClass: InMemoryCommandExecutionControl, asDefault: true },
        { provide: AGENT_CLOCK, useClass: SystemAgentClock, asDefault: true },
        {
            provide: ModelAdapter,
            useFactory: (options: AgentOptions, clock: AgentClock) => new RoutedModelAdapter(options.model ?? defaultAgentOptions.model!, undefined, clock),
            deps: [AGENT_OPTIONS, AGENT_CLOCK],
            asDefault: true
        },
        AgentContextManager,
        TypeOrmGoalStore,
        { provide: GoalStore, useExisting: TypeOrmGoalStore, asDefault: true },
        ToolLoopDetector,
        ToolSchemaValidator,
        RateLimitManager,
        OutputGuard,
        TypeOrmAuditSink,
        { provide: AuditSink, useExisting: TypeOrmAuditSink, asDefault: true },
        TypeOrmCompactionHistoryStore,
        { provide: CompactionHistoryStore, useExisting: TypeOrmCompactionHistoryStore, asDefault: true },
        TypeOrmTurnDiagnosticsStore,
        { provide: TurnDiagnosticsStore, useExisting: TypeOrmTurnDiagnosticsStore, asDefault: true },
        WeaknessMiner,
        TypeOrmSummaryQualityStore,
        { provide: SummaryQualityStore, useExisting: TypeOrmSummaryQualityStore, asDefault: true },
        TypeOrmDelegationGraphStore,
        { provide: DelegationGraphStore, useExisting: TypeOrmDelegationGraphStore, asDefault: true },
        NodeChildProcessSandboxExecutor,
        OsSandboxExecutor,
        { provide: SandboxExecutor, useExisting: OsSandboxExecutor, asDefault: true },
        NoopAgentHookCommandExecutor,
        { provide: AgentHookCommandExecutor, useExisting: NoopAgentHookCommandExecutor, asDefault: true },
        FileSnapshotStore,
        ReviewFindingsStore,
        {
            provide: GitStepSnapshotStore,
            useFactory: (options: AgentOptions) => new GitStepSnapshotStore(options.gitStepSnapshots ?? {}),
            deps: [AGENT_OPTIONS]
        },
        ToolExecutionCoordinator,
        TypeOrmEvalReportStore,
        { provide: EvalReportStore, useExisting: TypeOrmEvalReportStore, asDefault: true },
        { provide: SystemPromptBuilder, useClass: SystemPromptBuilder, asDefault: true },
        { provide: ApprovalManager, useClass: ToolApprovalManager },
        { provide: ToolActivationStore, useClass: SessionToolActivationStore },
        { provide: AGENT_PROMPT_SECTIONS, useClass: DateTimeSection, multi: true },
        { provide: AGENT_PROMPT_SECTIONS, useClass: IdentitySection, multi: true },
        { provide: AGENT_PROMPT_SECTIONS, useClass: ProjectContextSection, multi: true },
        { provide: AGENT_PROMPT_SECTIONS, useClass: ToolsSection, multi: true },
        { provide: AGENT_PROMPT_SECTIONS, useClass: MemorySection, multi: true },
        { provide: AGENT_PROMPT_SECTIONS, useClass: McpServerInstructionsSection, multi: true },
        LocalToolRegistry,
        { provide: ToolRegistry, useClass: LocalToolRegistry, asDefault: true },
        EchoTool,
        TimeTool,
        MemoryPutTool,
        MemorySearchTool,
        ExperienceSynthesizeTool,
        TypeOrmSessionStore,
        { provide: SessionStore, useExisting: TypeOrmSessionStore, asDefault: true },
        TypeOrmTimelineHistoryStore,
        { provide: TIMELINE_HISTORY_STORE, useExisting: TypeOrmTimelineHistoryStore, asDefault: true },
        TypeOrmCommandExchangeStore,
        { provide: COMMAND_EXCHANGE_STORE, useExisting: TypeOrmCommandExchangeStore, asDefault: true },
        TypeOrmBackgroundTaskStore,
        { provide: BACKGROUND_TASK_HISTORY_STORE, useExisting: TypeOrmBackgroundTaskStore, asDefault: true },
        TypeOrmMemoryStore,
        ProjectMemoryService,
        { provide: MemoryStore, useExisting: TypeOrmMemoryStore, asDefault: true },
        DefaultAgentMemoryRetriever,
        { provide: AgentMemoryRetriever, useExisting: DefaultAgentMemoryRetriever, asDefault: true },
        SemanticMemoryRanker,
        MemorySearchService,
        { provide: SessionSummarizer, useClass: SimpleSessionSummarizer, asDefault: true },
        {
            provide: AgentSummaryAgent,
            useFactory: () => new DeterministicAgentSummaryAgent(),
            asDefault: true
        },
        DeterministicExperienceDistiller,
        { provide: ExperienceDistiller, useExisting: DeterministicExperienceDistiller, asDefault: true },
        { provide: AgentScheduler, useClass: IntervalAgentScheduler, asDefault: true },
        DefaultAgentRuntime,
        { provide: AgentRuntime, useExisting: DefaultAgentRuntime, asDefault: true },
        EvalRunner,
        TurnHandler,
        AgentRequestHandler,
        AgentServer,
        { provide: AgentClient, useClass: LocalAgentClient, asDefault: true },
        LocalAgentClient,
        PubSubAgentChannel,
        { provide: AGENT_TOOLS, useExisting: EchoTool, multi: true },
        { provide: AGENT_TOOLS, useExisting: TimeTool, multi: true },
        { provide: AGENT_TOOLS, useExisting: MemoryPutTool, multi: true },
        { provide: AGENT_TOOLS, useExisting: MemorySearchTool, multi: true },
        { provide: AGENT_TOOLS, useExisting: ExperienceSynthesizeTool, multi: true }
    ],
    exports: [
        DefaultAgentRuntime,
        EvalRunner,
        LocalToolRegistry,
        TypeOrmSessionStore,
        TypeOrmMemoryStore,
        ProjectMemoryService,
        IntervalAgentScheduler,
        AgentServer,
        LocalAgentClient
    ]
})
export class AgentModule {
    static withOptions(options: AgentOptions): ModuleWithProviders<AgentModule> {
        return {
            module: AgentModule,
            providers: createAgentProviders(options)
        };
    }
}
