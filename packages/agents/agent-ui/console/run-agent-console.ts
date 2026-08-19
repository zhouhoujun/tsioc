/**
 * @file Generic TUI console launch functions — platform-independent.
 *
 * This module owns the TUI orchestration that was previously in agent-cli.
 * agent-cli now calls these functions directly.
 */
import { mergeAgentOptions, AgentHookCommandExecutor } from '@tsdi/agent';
import { TuiConsoleModule } from '@tsdi/components/console';
import {
    AgentConsoleComponent,
    AgentConsoleThemeName,
    AgentUiResolvedConfig,
    agentConsoleThemes,
    isAgentConsoleThemeName
} from '@tsdi/agent-ui';
import { runAgentTUI, AgentUiApplicationOptions } from './run-agent-ui';

/**
 * Launch target for a console TUI application.
 */
export interface AgentConsoleLaunchTarget {
    entry: any;
    consoleModule: any;
    providers?: any[];
}

/**
 * Console UI configuration subset relevant to TUI launch.
 * Mirrors the shape returned by AgentUiConfigService.resolve().
 */
export type AgentConsoleResolvedConfig = AgentUiResolvedConfig;

/**
 * Options for runAgentConsole.
 */
export interface AgentConsoleRunOptions {
    session?: string;
    gatewayUrl?: string;
    token?: string;
    [key: string]: any;
}

/**
 * Create the default console UI target using TuiConsoleModule.
 */
export function createDefaultConsoleUi(): AgentConsoleLaunchTarget {
    return {
        entry: AgentConsoleComponent,
        consoleModule: TuiConsoleModule,
        providers: []
    };
}

/**
 * Resolve explicit session ID from bootstrap turn or options.
 */
export function resolveExplicitSessionId(options: AgentConsoleRunOptions = {}, agentOptions: any = {}): string | undefined {
    const bootstrapSessionId = String(agentOptions?.bootstrapTurn?.sessionId || '').trim();
    if (bootstrapSessionId) {
        return bootstrapSessionId;
    }
    const explicitSessionId = String(options.session || '').trim();
    return explicitSessionId || undefined;
}

/**
 * Build agent options for the console TUI from resolved config.
 */
export function buildConsoleAgentOptions(
    resolved: AgentConsoleResolvedConfig,
    options: AgentConsoleRunOptions = {},
    agentOptions: any = {}
): any {
    const modelConfig = resolved.model;
    const tui = resolved.tui;
    const sessionId = resolveExplicitSessionId(options, agentOptions);
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
            terminalTitle: tui?.terminalTitle ?? agentOptions?.ui?.terminalTitle,
            rawMode: tui?.rawMode ?? agentOptions?.ui?.rawMode,
            console: {
                ...(agentOptions?.ui?.console || {}),
                workspace: agentOptions?.ui?.console?.workspace || resolved.workspace,
                workingPresentation: 'compact',
                showStatusline: false
            }
        }
    });
    if (!sessionId && merged.bootstrapTurn) {
        delete merged.bootstrapTurn.sessionId;
    }
    return merged;
}

/**
 * Run the console TUI application.
 *
 * This is the generic entry point that agent-cli calls.
 * It handles agent options building and delegates to runAgentTUI.
 */
export async function runAgentConsole(
    resolved: AgentConsoleResolvedConfig,
    options: AgentConsoleRunOptions = {},
    agentOptions: any = {},
    extraProviders: any[] = [],
    ui: AgentConsoleLaunchTarget = createDefaultConsoleUi()
): Promise<void> {
    const runtimeAgentOptions = buildConsoleAgentOptions(resolved, options, agentOptions);
    const gatewayUrl = String(options.gatewayUrl || '').trim().replace(/\/+$/, '');
    const remoteProviders = gatewayUrl ? [{
        provide: '@AGENT_CONSOLE_APP_RPC',
        useValue: { baseUrl: gatewayUrl, token: options.token }
    }] : [];
    await runAgentTUI(ui.entry, {
        consoleModule: ui.consoleModule,
        agentOptions: runtimeAgentOptions,
        deps: [],
        providers: [
            ...remoteProviders,
            ...(ui.providers || []),
            ...extraProviders
        ]
    });
}
