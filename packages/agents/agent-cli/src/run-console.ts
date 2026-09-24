/**
 * @file CLI TUI launcher — platform adapter over @tsdi/agent-ui/console.
 *
 * CLI-specific concerns: config resolution, workspace ensuring, and the Node
 * platform providers. TUI orchestration and console UI state are owned by
 * @tsdi/agent-ui/console.
 */
import { AgentHookCommandExecutor } from '@tsdi/agent';
import { provideTools } from '@tsdi/agent-tools';
import { AGENT_SSH_OPTIONS } from '@tsdi/agent-ssh';
import { AgentUiConfigService } from '@tsdi/agent-ui';
import {
    runAgentConsole as runConsoleTui,
    createDefaultConsoleUi,
    AgentConsoleLaunchTarget
} from '@tsdi/agent-ui/console';
import { AgentAppServerModule, MdnsServiceDiscovery } from '@tsdi/agent-gateway';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { provideAgentOrmStorage } from '@tsdi/agent';
import { AgentCliOptions } from './config';
import { CliAgentUiConfigReader } from './agent-ui-config-reader';
import { NodeAgentHookCommandExecutor } from './NodeAgentHookCommandExecutor';
import { createAgentSandboxRuntimeProvider, ensureAgentWorkspace, provideWorkspaceTrust, resolveModelAdapter } from './run-command';

// Re-export types for backward compatibility
export { AgentConsoleLaunchTarget as AgentCliUiTarget } from '@tsdi/agent-ui/console';

export interface AgentAttachOptions extends AgentCliOptions {
    gatewayUrl?: string;
    token?: string;
    mdns?: boolean;
    mdnsDomain?: string;
    mdnsServiceType?: string;
    mdnsTimeout?: string | number;
}

export interface AgentGatewayDiscoverer {
    discover(options: { serviceType?: string; domain?: string; timeoutMs?: number }): Promise<Array<{ url: string }>>;
}

export async function resolveAgentAttachUrl(
    explicitUrl: string | undefined,
    options: AgentAttachOptions,
    discoverer: AgentGatewayDiscoverer = new MdnsServiceDiscovery()
): Promise<string> {
    const direct = String(explicitUrl || options.gatewayUrl || process.env.TSDI_AGENT_GATEWAY_URL || '').trim().replace(/\/+$/, '');
    if (direct) {
        if (!/^https?:\/\//i.test(direct)) throw new Error('Gateway URL must use http:// or https://.');
        return direct;
    }
    if (!options.mdns) throw new Error('Provide a gateway URL or enable --mdns discovery.');
    const gateways = await discoverer.discover({
        serviceType: options.mdnsServiceType,
        domain: options.mdnsDomain,
        timeoutMs: Number(options.mdnsTimeout || 1000)
    });
    if (!gateways.length) throw new Error('No agent gateway discovered through mDNS.');
    return gateways[0].url.replace(/\/+$/, '');
}

export async function runAgentAttach(
    explicitUrl: string | undefined,
    options: AgentAttachOptions,
    discoverer?: AgentGatewayDiscoverer,
    runner: (options: AgentCliOptions) => Promise<any> = runAgentConsole
): Promise<string> {
    const gatewayUrl = await resolveAgentAttachUrl(explicitUrl, options, discoverer);
    await runner({ ...options, gatewayUrl } as AgentCliOptions);
    return gatewayUrl;
}

export function createDefaultAgentCliConsoleUi(): AgentConsoleLaunchTarget {
    return createDefaultConsoleUi();
}

export async function runAgentConsole(
    options: AgentCliOptions = {},
    agentOptions: any = {},
    extraProviders: any[] = [],
    ui: AgentConsoleLaunchTarget = createDefaultConsoleUi()
): Promise<void> {
    const config = new AgentUiConfigService(new CliAgentUiConfigReader(), options);
    const resolved = config.resolve(options);
    await ensureAgentWorkspace(resolved);
    const gatewayUrl = String((options as AgentAttachOptions).gatewayUrl || '').trim().replace(/\/+$/, '');

    await runConsoleTui(resolved, options, agentOptions, [
        ...provideAgentOrmStorage(resolved.root),
        ...provideTools(resolved.tools),
        createAgentSandboxRuntimeProvider(),
        provideWorkspaceTrust(resolved.root),
        resolveModelAdapter(config, options),
        NodeAgentHookCommandExecutor,
        { provide: AgentHookCommandExecutor, useExisting: NodeAgentHookCommandExecutor },
        { provide: AgentUiConfigService, useValue: config },
        { provide: AGENT_SSH_OPTIONS, useValue: resolved.ssh ?? {} },
        ...extraProviders
    ], ui, {
        deps: gatewayUrl ? [ServerCommonModule] : [ServerCommonModule, AgentAppServerModule],
        persistCommandOutput: true
    });
}
