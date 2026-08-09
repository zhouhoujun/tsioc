import { Application, ApplicationRunners } from '@tsdi/core';
import { AGENT_OPTIONS } from '@tsdi/agent';
import {
    ConsoleTerminalInputHandler,
    ConsoleTerminalSurfaceLifecycle,
    ConsoleTerminalApplicationLifecycleService
} from '@tsdi/components/console';
import { AnimatedTextLifecycleService } from '@tsdi/components';
import { AgentUiModule } from './agent-ui.module';

export interface AgentUiApplicationOptions {
    consoleModule?: any;
    agentOptions?: any;
    deps?: any[];
    providers?: any[];
}

export async function runAgentUi(
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
                AnimatedTextLifecycleService,
                ...(options.providers || []),
                ...(options.agentOptions ? [{ provide: AGENT_OPTIONS, useValue: options.agentOptions }] : [])
            ],
            bootstrap: [ui, ConsoleTerminalApplicationLifecycleService, AnimatedTextLifecycleService]
        }
    });
}

export const runAgentUiApplication = runAgentUi;
