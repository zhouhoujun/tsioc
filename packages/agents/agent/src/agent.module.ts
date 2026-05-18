import { Module, ModuleWithProviders } from '@tsdi/ioc';
import { ComponentsModule } from '@tsdi/components';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { ConfigModule } from '@tsdi/microservices/config';
import { AgentOptions, defaultAgentOptions, mergeAgentOptions } from './options';
import { AGENT_EXPERIENCE_DISTILLER, AGENT_MEMORY_STORE, AGENT_MODEL_ADAPTER, AGENT_OPTIONS, AGENT_RUNTIME, AGENT_SCHEDULER, AGENT_SESSION_STORE, AGENT_SESSION_SUMMARIZER, AGENT_TOOLS, AGENT_TOOL_ACTIVATION_STORE, AGENT_TURN_HANDLER } from './tokens';
import { OpenAICompatibleModelAdapter } from './model/OpenAICompatibleModelAdapter';
import { ModelAdapter } from './model/ModelAdapter';
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
import { MemoryStore } from './memory/MemoryStore';
import { InMemoryMemoryStore } from './memory/InMemoryMemoryStore';
import { SessionSummarizer } from './memory/SessionSummarizer';
import { SimpleSessionSummarizer } from './memory/SimpleSessionSummarizer';
import { ExperienceDistiller } from './memory/ExperienceDistiller';
import { DeterministicExperienceDistiller } from './memory/DeterministicExperienceDistiller';
import { AgentScheduler } from './scheduler/AgentScheduler';
import { IntervalAgentScheduler } from './scheduler/IntervalAgentScheduler';
import { AgentRuntime } from './runtime/AgentRuntime';
import { TurnHandler } from './runtime/TurnHandler';
import { AgentRequestHandler } from './channels/AgentRequestHandler';
import { AgentServer } from './channels/AgentServer';
import { AgentClient } from './channels/AgentClient';
import { LocalAgentClient } from './channels/LocalAgentClient';
import { PubSubAgentChannel } from './channels/PubSubAgentChannel';
import { AgentConsoleViewModel } from './ui/AgentConsoleViewModel';
import { AgentConsoleComponent } from './ui/AgentConsoleComponent';

@Module({
    imports: [
        ConfigModule,
        ComponentsModule,
        HtmlTemplateModule
    ],
    declarations: [AgentConsoleComponent],
    bootstrap: [AgentConsoleComponent],
    providers: [
        {
            provider(injector) {
                if (injector.has(AGENT_OPTIONS)) {
                    return;
                }
                return [{ provide: AGENT_OPTIONS, useValue: defaultAgentOptions }];
            }
        },
        {
            provider(injector) {
                if (injector.has(AGENT_MODEL_ADAPTER)) {
                    return;
                }
                return [{
                    provide: AGENT_MODEL_ADAPTER,
                    useFactory: () => new OpenAICompatibleModelAdapter({
                        provider: 'deepseek',
                        model: 'deepseek-chat',
                        baseUrl: 'https://api.deepseek.com',
                        apiKeyEnv: 'DEEPSEEK_API_KEY',
                        timeoutMs: 120000
                    })
                }];
            }
        },
        { provide: ModelAdapter, useExisting: AGENT_MODEL_ADAPTER },
        AgentContextManager,
        ToolLoopDetector,
        SystemPromptBuilder,
        ToolApprovalManager,
        InMemoryToolActivationStore,
        { provide: AGENT_TOOL_ACTIVATION_STORE, useExisting: InMemoryToolActivationStore },
        { provide: ToolActivationStore, useExisting: AGENT_TOOL_ACTIVATION_STORE },
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
        { provide: AGENT_SESSION_STORE, useClass: InMemorySessionStore },
        { provide: SessionStore, useExisting: AGENT_SESSION_STORE },
        { provide: AGENT_MEMORY_STORE, useClass: InMemoryMemoryStore },
        { provide: MemoryStore, useExisting: AGENT_MEMORY_STORE },
        { provide: AGENT_SESSION_SUMMARIZER, useClass: SimpleSessionSummarizer },
        { provide: SessionSummarizer, useExisting: AGENT_SESSION_SUMMARIZER },
        DeterministicExperienceDistiller,
        { provide: AGENT_EXPERIENCE_DISTILLER, useClass: DeterministicExperienceDistiller },
        { provide: ExperienceDistiller, useExisting: AGENT_EXPERIENCE_DISTILLER },
        { provide: AGENT_SCHEDULER, useClass: IntervalAgentScheduler },
        { provide: AgentScheduler, useExisting: AGENT_SCHEDULER },
        { provide: AGENT_RUNTIME, useClass: AgentRuntime },
        { provide: AgentRuntime, useExisting: AGENT_RUNTIME },
        TurnHandler,
        { provide: AGENT_TURN_HANDLER, useExisting: TurnHandler },
        AgentRequestHandler,
        AgentServer,
        { provide: AgentClient, useClass: LocalAgentClient },
        LocalAgentClient,
        PubSubAgentChannel,
        AgentConsoleViewModel,
        AgentConsoleComponent,
        { provide: AGENT_TOOLS, useExisting: EchoTool, multi: true },
        { provide: AGENT_TOOLS, useExisting: TimeTool, multi: true },
        { provide: AGENT_TOOLS, useExisting: MemoryPutTool, multi: true },
        { provide: AGENT_TOOLS, useExisting: MemorySearchTool, multi: true }
    ],
    exports: [
        AgentRuntime,
        AgentConsoleComponent,
        LocalToolRegistry,
        InMemorySessionStore,
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
            providers: [
                { provide: AGENT_OPTIONS, useValue: mergeAgentOptions(options) }
            ]
        };
    }
}



