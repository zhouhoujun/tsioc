import { Application, ApplicationRunners } from '@tsdi/core';
import { FileAdapter } from '@tsdi/common';
import { AGENT_OPTIONS } from '@tsdi/agent';
import {
    ConsoleTerminalInputHandler,
    ConsoleTerminalSurfaceAccessor as PlatformConsoleTerminalSurfaceAccessor,
    ConsoleTerminalSurfaceLifecycle,
    ConsoleTerminalApplicationLifecycleService
} from '@tsdi/components/console';
import {
    AgentUiModule,
    AgentConsoleWorkspaceMentionsProvider,
    AgentConsolePathProvider,
    AgentConsoleSettingsStore,
    AgentConsoleThemeStore,
    AgentConsoleRawModeStore,
    AgentConsoleKeymapStore,
    AgentConsoleStashStore,
    ConsoleTerminalSurfaceAccessor
} from '@tsdi/agent-ui';

export interface AgentUiApplicationOptions {
    consoleModule?: any;
    agentOptions?: any;
    deps?: any[];
    providers?: any[];
}

export async function runAgentTUI(
    ui: any,
    options: AgentUiApplicationOptions = {}
): Promise<any> {
    const consoleDeps = options.consoleModule ? [options.consoleModule] : [];
    return Application.run({
        module: {
            imports: [AgentUiModule, ...consoleDeps, ...(options.deps || [])],
            providers: [
                {
                    provide: ConsoleTerminalInputHandler,
                    deps: [ApplicationRunners],
                    useFactory: (runners: ApplicationRunners) => runners.getRef(ui)?.instance
                },
                {
                    provide: ConsoleTerminalSurfaceLifecycle,
                    deps: [ApplicationRunners],
                    useFactory: (runners: ApplicationRunners) => runners.getRef(ui)?.instance
                },
                {
                    provide: ConsoleTerminalSurfaceAccessor,
                    deps: [PlatformConsoleTerminalSurfaceAccessor],
                    useFactory: (surface: PlatformConsoleTerminalSurfaceAccessor) => surface
                },
                {
                    provide: AgentConsoleWorkspaceMentionsProvider,
                    deps: [FileAdapter],
                    useFactory: (fileAdapter: FileAdapter | null) => new AgentConsoleWorkspaceMentionsProvider(fileAdapter || undefined)
                },
                // File-backed console stores must be built in the application
                // injector: module-level providers cannot see the host's
                // FileAdapter, so `@Optional()` injection left them with no
                // adapter and every `/settings` / `/theme` / `/keymap` save
                // silently no-opped in the real TUI.
                {
                    provide: AgentConsolePathProvider,
                    deps: [FileAdapter],
                    useFactory: (fileAdapter: FileAdapter) => new AgentConsolePathProvider(fileAdapter)
                },
                {
                    provide: AgentConsoleSettingsStore,
                    deps: [FileAdapter],
                    useFactory: (fileAdapter: FileAdapter | null) => new AgentConsoleSettingsStore(fileAdapter || undefined)
                },
                {
                    provide: AgentConsoleThemeStore,
                    deps: [FileAdapter],
                    useFactory: (fileAdapter: FileAdapter | null) => new AgentConsoleThemeStore(fileAdapter || undefined)
                },
                {
                    provide: AgentConsoleRawModeStore,
                    deps: [FileAdapter],
                    useFactory: (fileAdapter: FileAdapter | null) => new AgentConsoleRawModeStore(fileAdapter || undefined)
                },
                {
                    provide: AgentConsoleKeymapStore,
                    deps: [FileAdapter],
                    useFactory: (fileAdapter: FileAdapter | null) => new AgentConsoleKeymapStore(fileAdapter || undefined)
                },
                {
                    provide: AgentConsoleStashStore,
                    deps: [FileAdapter],
                    useFactory: (fileAdapter: FileAdapter | null) => new AgentConsoleStashStore(fileAdapter || undefined)
                },
                ...(options.providers || []),
                ...(options.agentOptions ? [{ provide: AGENT_OPTIONS, useValue: options.agentOptions }] : [])
            ],
            bootstrap: [ui, ConsoleTerminalApplicationLifecycleService]
        }
    });
}
