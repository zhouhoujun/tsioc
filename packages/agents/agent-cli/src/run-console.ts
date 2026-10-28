/**
 * @file CLI TUI launcher — platform adapter over @tsdi/agent-ui/console.
 *
 * CLI-specific concerns: config resolution, workspace ensuring, and the Node
 * platform providers. TUI orchestration and console UI state are owned by
 * @tsdi/agent-ui/console.
 */
import {
    AgentUiConfigService,
    AgentConsoleSessionState,
    formatAgentUiNoticeFromContext
} from '@tsdi/agent-ui';
import {
    runAgentConsole as runConsoleTui,
    createDefaultConsoleUi,
    AgentConsoleLaunchTarget,
    notifyConsoleHost
} from '@tsdi/agent-ui/console';
import {
    AgentAppServerModule,
    MdnsServiceDiscovery,
    SessionOwnerStore,
    startApprovalRemoteServer
} from '@tsdi/agent-gateway';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { ApprovalManager } from '@tsdi/agent';
import { AgentCliOptions } from './config';
import { CliAgentUiConfigReader } from './agent-ui-config-reader';
import { ensureAgentWorkspace } from './run-command';
import { buildAgentRuntimeProviders } from './agent-runtime-providers';
import { renderPairingQr } from './pair-qr';
import { tmpdir } from 'os';
import { join } from 'path';

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

    const gatewayPort = Number((options as AgentGatewayOptions).gatewayPort || 0);
    const gatewayToken = String((options as AgentGatewayOptions).gatewayToken || '').trim();
    const approverEnv = String(process.env.TSDI_AGENT_APPROVER_TOKENS || '').trim();
    if (gatewayPort > 0 && !gatewayToken && !approverEnv) {
        throw new Error('Remote approvals need a token: pass --gateway-token <token> or set TSDI_AGENT_APPROVER_TOKENS="id=token".');
    }

    const ctx = await runConsoleTui(resolved, options, agentOptions, [
        ...buildAgentRuntimeProviders(config, resolved, options, gatewayUrl ? join(tmpdir(), `tsdi-agent-attach-${process.pid}`) : undefined),
        ...extraProviders
    ], ui, {
        deps: gatewayUrl ? [ServerCommonModule] : [ServerCommonModule, AgentAppServerModule],
        persistCommandOutput: true,
        pair: gatewayUrl ? async () => {
            const response = await fetch(`${gatewayUrl}/api/pair/create`, {
                method: 'POST',
                headers: (options as AgentAttachOptions).token ? { Authorization: `Bearer ${(options as AgentAttachOptions).token}` } : {}
            });
            if (!response.ok) {
                return null;
            }
            const payload = await response.json() as { code?: string; expiresAt?: number; urls?: string[] };
            const urls = Array.isArray(payload.urls) ? payload.urls.map(String).filter(Boolean) : [];
            return urls.length ? { url: urls[0], urls, qr: renderPairingQr(urls[0]), code: payload.code, expiresAt: payload.expiresAt } : null;
        } : undefined,
        restart: (sessionId: string) => {
            // Re-enter this launcher in-process once the old app has restored
            // the terminal. A child process would outlive the shell's job and
            // race the interactive shell for the TTY.
            void runAgentConsole({ ...options, session: sessionId }, agentOptions, extraProviders, ui);
        }
    });

    if (gatewayPort > 0) {
        const manager = ctx?.get ? ctx.get(ApprovalManager) : undefined;
        const owners = ctx?.get ? ctx.get(SessionOwnerStore) : undefined;
        // Write through the bootstrapped console state: `ctx.get(...)` resolves
        // root-injector instances whose state never renders.
        const notice = (key: string, params?: Record<string, any>) => {
            const text = formatAgentUiNoticeFromContext(ctx, key, params);
            if (!notifyConsoleHost(ctx, text)) {
                ctx?.get?.(AgentConsoleSessionState)?.setNotice(text);
            }
        };
        if (!manager) {
            notice('remoteApprovalsUnavailable');
        } else {
            try {
                const handle = await startApprovalRemoteServer({
                    manager,
                    owners,
                    port: gatewayPort,
                    host: (options as AgentGatewayOptions).gatewayHost,
                    authToken: gatewayToken || undefined
                });
                notice('remoteApprovalsApi', { url: `http://${handle.host}:${handle.port}` });
            } catch (error) {
                notice('remoteApprovalsFailed', {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    }

    return ctx;
}

/** TUI remote-approval flags (`tsdi-agent chat --gateway-port …`). */
export interface AgentGatewayOptions extends AgentCliOptions {
    gatewayPort?: number | string;
    gatewayHost?: string;
    gatewayToken?: string;
}
