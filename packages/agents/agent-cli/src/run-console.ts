import { TuiConsoleModule } from '@tsdi/components/console';
import { AgentRuntime, mergeAgentOptions } from '@tsdi/agent';
import { provideTools } from '@tsdi/agent-tools';
import { AgentConsoleComponent, AgentUiConfigService, runAgentUi } from '@tsdi/agent-ui';
import { AgentAppServerModule } from '@tsdi/agent-gateway';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { provideAgentOrmStorage } from '@tsdi/agent';
import { AgentCliOptions } from './config';
import { CliAgentUiConfigReader } from './agent-ui-config-reader';
import { resolveModelAdapter, withAdapterProviders } from './run-command';

export interface AgentCliUiTarget {
    entry: any;
    consoleModule: any;
    providers?: any[];
}

export function createDefaultAgentCliConsoleUi(): AgentCliUiTarget {
    return {
        entry: AgentConsoleComponent,
        consoleModule: TuiConsoleModule,
        providers: []
    };
}

function buildConsoleAgentOptions(config: AgentUiConfigService, options: AgentCliOptions, agentOptions: any = {}): any {
    const resolved = config.resolve(options);
    const modelConfig = resolved.model;

    return mergeAgentOptions({
        ...agentOptions,
        model: {
            provider: modelConfig.provider,
            model: modelConfig.model,
            baseUrl: modelConfig.baseUrl,
            apiKey: modelConfig.apiKey,
            apiKeyEnv: modelConfig.apiKeyEnv,
            timeoutMs: modelConfig.timeoutMs,
            temperature: modelConfig.temperature,
            maxTokens: modelConfig.maxTokens,
            headers: modelConfig.headers,
            thinkingBudget: modelConfig.thinkingBudget,
            reasoning: modelConfig.reasoning,
            defaultProfile: modelConfig.defaultProfile,
            profiles: modelConfig.profiles,
            routes: modelConfig.routes,
            complexityRouting: modelConfig.complexityRouting,
            complexityThresholds: modelConfig.complexityThresholds,
            ...(agentOptions?.model || {})
        },
        bootstrapTurn: {
            ...(agentOptions?.bootstrapTurn || {}),
            sessionId: agentOptions?.bootstrapTurn?.sessionId || resolved.sessionId
        },
        ui: {
            ...(agentOptions?.ui || {}),
            console: {
                ...(agentOptions?.ui?.console || {}),
                workspace: agentOptions?.ui?.console?.workspace || resolved.workspace
            }
        }
    });
}

export async function runAgentConsole(
    options: AgentCliOptions = {},
    agentOptions: any = {},
    extraProviders: any[] = [],
    ui: AgentCliUiTarget = createDefaultAgentCliConsoleUi()
): Promise<void> {
    const config = new AgentUiConfigService(new CliAgentUiConfigReader(), options);
    const resolved = config.resolve(options);
    const runtimeAgentOptions = buildConsoleAgentOptions(config, options, agentOptions);
    const ctx = await runAgentUi(ui.entry, {
        consoleModule: ui.consoleModule,
        agentOptions: runtimeAgentOptions,
        deps: [ServerCommonModule, AgentAppServerModule],
        providers: [
            ...provideAgentOrmStorage(resolved.root),
            ...provideTools(resolved.tools),
            ...withAdapterProviders(options),
            resolveModelAdapter(config, options),
            { provide: AgentUiConfigService, useValue: config },
            ...(ui.providers || []),
            ...extraProviders
        ]
    });

    await ctx.get(AgentRuntime).start();
}
