import { Module, ModuleWithProviders } from '@tsdi/ioc';
import { ComponentsModule } from '@tsdi/components';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { ConfigModule } from '@tsdi/microservices/config';
import { AgentOptions, defaultAgentOptions, mergeAgentOptions } from './options';
import { AGENT_OPTIONS, AGENT_TOOLS } from './tokens';
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
import { AgentConsoleViewModel } from './ui/AgentConsoleViewModel';
import { AgentConsoleComponent } from './ui/AgentConsoleComponent';

@Module({
    imports: [
        ConfigModule,
        ComponentsModule,
        HtmlTemplateModule
    ],
    declarations: [AgentConsoleComponent],
    bootstrap: [AgentRuntime],
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
                if (injector.has(ModelAdapter)) {
                    return;
                }
                return [{
                    provide: ModelAdapter,
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
        AgentContextManager,
        ToolLoopDetector,
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
        { provide: SessionStore, useClass: InMemorySessionStore },
        { provide: MemoryStore, useClass: InMemoryMemoryStore },
        {
            provider(injector) {
                if (injector.has(AgentMemoryRetriever)) {
                    return;
                }
                return [
                    DefaultAgentMemoryRetriever,
                    { provide: AgentMemoryRetriever, useExisting: DefaultAgentMemoryRetriever }
                ];
            }
        },
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
        AgentConsoleViewModel,
        AgentConsoleComponent,
        { provide: AGENT_TOOLS, useExisting: EchoTool, multi: true },
        { provide: AGENT_TOOLS, useExisting: TimeTool, multi: true },
        { provide: AGENT_TOOLS, useExisting: MemoryPutTool, multi: true },
        { provide: AGENT_TOOLS, useExisting: MemorySearchTool, multi: true }
    ],
    exports: [
        DefaultAgentRuntime,
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



