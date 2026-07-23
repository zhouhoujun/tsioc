import { Module, ModuleWithProviders } from '@tsdi/ioc';
import { ConfigModule } from '@tsdi/microservices/config';
import { AgentOptions, defaultAgentOptions } from './options';
import { AGENT_OPTIONS, AGENT_TOOLS } from './tokens';
import { ModelAdapter } from './model/ModelAdapter';
import { RoutedModelAdapter } from './model/RoutedModelAdapter';
import { ToolRegistry } from './tools/ToolRegistry';
import { LocalToolRegistry } from './tools/LocalToolRegistry';
import { InMemoryToolActivationStore } from './tools/InMemoryToolActivationStore';
import { ToolActivationStore } from './tools/ToolActivationStore';
import { ToolLoopDetector } from './tools/ToolLoopDetector';
import { ToolApprovalManager } from './tools/ToolApprovalManager';
import { AgentContextManager } from './context/AgentContextManager';
import { SystemPromptBuilder, IdentitySection, DateTimeSection, ToolsSection, MemorySection } from './prompt/SystemPromptBuilder';
import { AGENT_PROMPT_SECTIONS } from './tokens';
import { EchoTool, MemoryPutTool, MemorySearchTool, TimeTool } from './tools/BuiltinTools';
import { SessionStore } from './memory/SessionStore';
import { InMemorySessionStore } from './memory/InMemorySessionStore';
import { DefaultSessionStore } from './memory/DefaultSessionStore';
import { MemoryStore } from './memory/MemoryStore';
import { InMemoryMemoryStore } from './memory/InMemoryMemoryStore';
import { DefaultMemoryStore } from './memory/DefaultMemoryStore';
import { SessionSummarizer } from './memory/SessionSummarizer';
import { SimpleSessionSummarizer } from './memory/SimpleSessionSummarizer';
import { ExperienceDistiller } from './memory/ExperienceDistiller';
import { AgentMemoryRetriever, DefaultAgentMemoryRetriever } from './memory/AgentMemoryRetriever';
import { DeterministicExperienceDistiller } from './memory/DeterministicExperienceDistiller';
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
import { ToolExecutionCoordinator } from './harness/ToolExecutionCoordinator';
import { ToolSchemaValidator } from './harness/ToolSchemaValidator';
import { RateLimitManager } from './harness/RateLimitManager';
import { OutputGuard } from './harness/OutputGuard';
import { AuditSink } from './harness/AuditSink';
import { InMemoryAuditSink } from './harness/InMemoryAuditSink';
import { TypeOrmAuditSink } from './harness/TypeOrmAuditSink';
import { DefaultAuditSink } from './harness/DefaultAuditSink';
import { SandboxExecutor, NodeChildProcessSandboxExecutor } from './harness/SandboxExecutor';
import { createAgentProviders } from './provider';

@Module({
    imports: [
        ConfigModule
    ],
    bootstrap: [AgentRuntime],
    providers: [
        { provide: AGENT_OPTIONS, useValue: defaultAgentOptions, asDefault: true },
        {
            provide: ModelAdapter,
            useFactory: (options: AgentOptions) => new RoutedModelAdapter(options.model ?? defaultAgentOptions.model!),
            deps: [AGENT_OPTIONS],
            asDefault: true
        },
        AgentContextManager,
        ToolLoopDetector,
        ToolSchemaValidator,
        RateLimitManager,
        OutputGuard,
        InMemoryAuditSink,
        TypeOrmAuditSink,
        DefaultAuditSink,
        { provide: AuditSink, useExisting: DefaultAuditSink },
        NodeChildProcessSandboxExecutor,
        { provide: SandboxExecutor, useExisting: NodeChildProcessSandboxExecutor, asDefault: true },
        ToolExecutionCoordinator,
        SystemPromptBuilder,
        ToolApprovalManager,
        InMemoryToolActivationStore,
        { provide: ToolActivationStore, useExisting: InMemoryToolActivationStore },
        { provide: AGENT_PROMPT_SECTIONS, useClass: DateTimeSection, multi: true },
        { provide: AGENT_PROMPT_SECTIONS, useClass: IdentitySection, multi: true },
        { provide: AGENT_PROMPT_SECTIONS, useClass: ToolsSection, multi: true },
        { provide: AGENT_PROMPT_SECTIONS, useClass: MemorySection, multi: true },
        LocalToolRegistry,
        { provide: ToolRegistry, useClass: LocalToolRegistry },
        EchoTool,
        TimeTool,
        MemoryPutTool,
        MemorySearchTool,
        InMemorySessionStore,
        DefaultSessionStore,
        { provide: SessionStore, useExisting: DefaultSessionStore },
        InMemoryMemoryStore,
        DefaultMemoryStore,
        { provide: MemoryStore, useExisting: DefaultMemoryStore },
        DefaultAgentMemoryRetriever,
        { provide: AgentMemoryRetriever, useExisting: DefaultAgentMemoryRetriever, asDefault: true },
        { provide: SessionSummarizer, useClass: SimpleSessionSummarizer },
        DeterministicExperienceDistiller,
        { provide: ExperienceDistiller, useExisting: DeterministicExperienceDistiller },
        { provide: AgentScheduler, useClass: IntervalAgentScheduler },
        DefaultAgentRuntime,
        { provide: AgentRuntime, useExisting: DefaultAgentRuntime, asDefault: true },
        TurnHandler,
        AgentRequestHandler,
        AgentServer,
        { provide: AgentClient, useClass: LocalAgentClient },
        LocalAgentClient,
        PubSubAgentChannel,
        { provide: AGENT_TOOLS, useExisting: EchoTool, multi: true },
        { provide: AGENT_TOOLS, useExisting: TimeTool, multi: true },
        { provide: AGENT_TOOLS, useExisting: MemoryPutTool, multi: true },
        { provide: AGENT_TOOLS, useExisting: MemorySearchTool, multi: true }
    ],
    exports: [
        DefaultAgentRuntime,
        LocalToolRegistry,
        DefaultSessionStore,
        InMemorySessionStore,
        DefaultMemoryStore,
        InMemoryMemoryStore,
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
