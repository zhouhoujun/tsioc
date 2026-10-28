import { AgentHookCommandExecutor, provideAgentOrmStorage } from '@tsdi/agent';
import { AGENT_SSH_OPTIONS } from '@tsdi/agent-ssh';
import { provideSkills, provideTools } from '@tsdi/agent-tools';
import { AgentUiConfigService } from '@tsdi/agent-ui';
import { NodeAgentHookCommandExecutor } from './NodeAgentHookCommandExecutor';
import { createAgentSandboxRuntimeProvider, provideWorkspaceTrust, resolveModelAdapter } from './run-command';

/** Providers shared by the TUI launcher and the headless `serve` command. */
export function buildAgentRuntimeProviders(
    config: AgentUiConfigService,
    resolved: any,
    options: any,
    /** Attached consoles use an isolated local database: the gateway owns the shared one. */
    ormRoot?: string
): any[] {
    return [
        ...provideAgentOrmStorage(ormRoot || resolved.root),
        ...provideTools(resolved.tools),
        ...provideSkills({ root: resolved.root, roots: resolved.skillRoots, remoteCacheDir: resolved.tools?.skillsRemoteCacheDir }),
        createAgentSandboxRuntimeProvider(),
        provideWorkspaceTrust(resolved.root),
        resolveModelAdapter(config, options),
        NodeAgentHookCommandExecutor,
        { provide: AgentHookCommandExecutor, useExisting: NodeAgentHookCommandExecutor },
        { provide: AgentUiConfigService, useValue: config },
        { provide: AGENT_SSH_OPTIONS, useValue: resolved.ssh ?? {} }
    ];
}
