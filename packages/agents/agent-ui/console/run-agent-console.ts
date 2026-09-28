/**
 * @file Generic TUI console launch functions — platform-independent.
 *
 * This module owns the TUI orchestration that was previously in agent-cli.
 * agent-cli now calls these functions directly.
 */
import { mergeAgentOptions, resolveAgentRenderPolicy, AgentHookCommandExecutor, AGENT_CONSOLE_APP_RPC } from '@tsdi/agent';
import { FileAdapter } from '@tsdi/common';
import { TuiConsoleModule } from '@tsdi/components/console';
import {
    AgentConsoleComponent,
    AgentConsoleSessionState,
    AgentConsoleThemeName,
    AgentUiResolvedConfig,
    BoundedFileCommandOutputStore,
    HttpAgentConsoleAppRpc,
    agentConsoleThemes,
    isAgentConsoleThemeName
} from '@tsdi/agent-ui';
import { runAgentTUI } from './run-agent-ui';

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
 * Host-supplied extras that the console adapter cannot resolve on its own:
 * platform modules to import and whether to persist command output.
 */
export interface AgentConsoleLaunchExtras {
    deps?: any[];
    persistCommandOutput?: boolean;
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
    const explicitSessionId = String(options.session || '').trim();
    if (explicitSessionId) {
        return explicitSessionId;
    }
    const bootstrap = agentOptions?.bootstrapTurn;
    const bootstrapSessionId = String(bootstrap?.sessionId || '').trim();
    return bootstrap?.enabled === true && bootstrapSessionId ? bootstrapSessionId : undefined;
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
        workspace: agentOptions?.workspace || resolved.workspace,
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
                ...resolveAgentRenderPolicy(agentOptions).value,
                ...(agentOptions?.ui?.console || {}),
                workspace: agentOptions?.ui?.console?.workspace || resolved.workspace,
                workingPresentation: 'compact',
                showStatusline: false,
                showMessageTimestamps: false,
                messageToggleInteraction: 'enter',
                messageLayout: 'viewport'
            }
        }
    });
    // A plain `chat` starts a fresh session. Do not carry a bootstrap turn
    // (which may contain prior transcript/tool payloads) unless the caller
    // explicitly selected a session to resume.
    if (!sessionId) {
        // mergeAgentOptions supplies a default `sessionId: "default"`; an
        // implicit default must not be mistaken for an explicit resume.
        merged.bootstrapTurn = {
            ...(merged.bootstrapTurn || {}),
            enabled: false,
            sessionId: ''
        };
    }
    return merged;
}

/**
 * Run the console TUI application.
 *
 * Owns the console-side orchestration: console agent options, remote-RPC wiring,
 * the TUI launch, and command-output persistence. Hosts (CLI, desktop, VS Code)
 * pass platform providers through `extraProviders` and platform modules through
 * `extras.deps`; they should not touch `AgentConsoleSessionState` themselves.
 */
export async function runAgentConsole(
    resolved: AgentConsoleResolvedConfig,
    options: AgentConsoleRunOptions = {},
    agentOptions: any = {},
    extraProviders: any[] = [],
    ui: AgentConsoleLaunchTarget = createDefaultConsoleUi(),
    extras: AgentConsoleLaunchExtras = {}
): Promise<any> {
    const runtimeAgentOptions = buildConsoleAgentOptions(resolved, options, agentOptions);
    const gatewayUrl = String(options.gatewayUrl || '').trim().replace(/\/+$/, '');
    const remoteProviders = gatewayUrl ? [{
        provide: AGENT_CONSOLE_APP_RPC,
        useValue: new HttpAgentConsoleAppRpc({ baseUrl: gatewayUrl, token: options.token })
    }] : [];
    const ctx = await runAgentTUI(ui.entry, {
        consoleModule: ui.consoleModule,
        agentOptions: runtimeAgentOptions,
        deps: extras.deps ?? [],
        providers: [
            ...remoteProviders,
            ...(ui.providers || []),
            ...extraProviders
        ]
    });

    if (extras.persistCommandOutput) {
        try {
            const sessionState = ctx?.get ? ctx.get(AgentConsoleSessionState) : undefined;
            const fileAdapter = ctx?.get ? ctx.get(FileAdapter) : undefined;
            if (sessionState && fileAdapter) {
                sessionState.setCommandOutputStore(new BoundedFileCommandOutputStore(
                    fileAdapter,
                    resolved.workspace,
                    undefined,
                    undefined,
                    runtimeAgentOptions.policy
                ));
                await sessionState.loadCommandOutputHistory();
            }
        } catch {
            // Command-output persistence is best-effort; never break TUI startup.
        }
    }

    return ctx;
}
