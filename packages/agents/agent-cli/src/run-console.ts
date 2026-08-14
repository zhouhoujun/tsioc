import { TuiConsoleModule } from '@tsdi/components/console';
import { AgentHookCommandExecutor, mergeAgentOptions } from '@tsdi/agent';
import { provideTools } from '@tsdi/agent-tools';
import { AGENT_SSH_OPTIONS } from '@tsdi/agent-ssh';
import { AgentConsoleComponent, AgentUiConfigService, runAgentUi, agentConsoleThemes, isAgentConsoleThemeName } from '@tsdi/agent-ui';
import { AgentAppServerModule } from '@tsdi/agent-gateway';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { provideAgentOrmStorage } from '@tsdi/agent';
import { AgentCliOptions } from './config';
import { CliAgentUiConfigReader } from './agent-ui-config-reader';
import { NodeAgentHookCommandExecutor } from './NodeAgentHookCommandExecutor';
import { createAgentSandboxRuntimeProvider, ensureAgentWorkspace, resolveModelAdapter, withAdapterProviders } from './run-command';

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

function resolveExplicitChatSessionId(options: AgentCliOptions = {}, agentOptions: any = {}): string | undefined {
    const bootstrapSessionId = String(agentOptions?.bootstrapTurn?.sessionId || '').trim();
    if (bootstrapSessionId) {
        return bootstrapSessionId;
    }
    const explicitSessionId = String(options.session || '').trim();
    return explicitSessionId || undefined;
}

function buildConsoleAgentOptions(config: AgentUiConfigService, options: AgentCliOptions, agentOptions: any = {}): any {
    const resolved = config.resolve(options);
    const modelConfig = resolved.model;
    const tui = resolved.tui;
    const sessionId = resolveExplicitChatSessionId(options, agentOptions);
    const merged = mergeAgentOptions({
        ...agentOptions,
        hooks: resolved.hooks,
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
            sessionId
        },
        ui: {
            ...(agentOptions?.ui || {}),
            theme: (tui?.theme && isAgentConsoleThemeName(tui.theme) ? agentConsoleThemes[tui.theme] : undefined)
                ?? agentOptions?.ui?.theme,
            keymap: tui?.keybinds ?? agentOptions?.ui?.keymap,
            console: {
                ...(agentOptions?.ui?.console || {}),
                workspace: agentOptions?.ui?.console?.workspace || resolved.workspace
            }
        }
    });
    if (!sessionId && merged.bootstrapTurn) {
        delete merged.bootstrapTurn.sessionId;
    }
    return merged;
}

export async function runAgentConsole(
    options: AgentCliOptions = {},
    agentOptions: any = {},
    extraProviders: any[] = [],
    ui: AgentCliUiTarget = createDefaultAgentCliConsoleUi()
): Promise<void> {
    const config = new AgentUiConfigService(new CliAgentUiConfigReader(), options);
    const resolved = config.resolve(options);
    await ensureAgentWorkspace(resolved);
    const runtimeAgentOptions = buildConsoleAgentOptions(config, options, agentOptions);
    await runAgentUi(ui.entry, {
        consoleModule: ui.consoleModule,
        agentOptions: runtimeAgentOptions,
        deps: [ServerCommonModule, AgentAppServerModule],
        providers: [
            ...provideAgentOrmStorage(resolved.root),
            ...provideTools(resolved.tools),
            ...withAdapterProviders(options),
            createAgentSandboxRuntimeProvider(),
            resolveModelAdapter(config, options),
            NodeAgentHookCommandExecutor,
            { provide: AgentHookCommandExecutor, useExisting: NodeAgentHookCommandExecutor },
            { provide: AgentUiConfigService, useValue: config },
            { provide: AGENT_SSH_OPTIONS, useValue: resolved.ssh ?? {} },
            ...(ui.providers || []),
            ...extraProviders
        ]
    });

    // Application.run 已通过 bootstrap/@Runner 自动启动 AgentRuntime 与 TUI 生命周期。
    // /exit 和 Ctrl+C 经 requestTerminalExit -> app.close() 销毁应用上下文，
    // ConsoleTerminalApplicationLifecycleService 的 @Shutdown/onDestroy 停止
    // stdin 输入与表面渲染，agent 完成 teardown 后进程自然退出，无需强制退出。
}
