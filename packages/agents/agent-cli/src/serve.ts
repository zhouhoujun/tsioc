import * as fs from 'fs';
import * as path from 'path';
import { Application } from '@tsdi/core';
import { AGENT_OPTIONS } from '@tsdi/agent';
import { AgentUiConfigService } from '@tsdi/agent-ui';
import { buildConsoleAgentOptions } from '@tsdi/agent-ui/console';
import { AgentGatewayModule, GatewayServer, PairingStore, provideAgentGateway } from '@tsdi/agent-gateway';
import { AgentCliOptions } from './config';
import { CliAgentUiConfigReader } from './agent-ui-config-reader';
import { buildAgentRuntimeProviders } from './agent-runtime-providers';
import { ensureAgentWorkspace } from './run-command';

export interface AgentServeOptions extends AgentCliOptions {
    webHost?: string;
    webPort?: number | string;
    static?: string;
    token?: string;
}

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]', '0.0.0.0', '::', '[::]']);

/** Resolve the browser assets shipped by `@tsdi/agent-ui` (or an explicit directory). */
export function resolveAgentWebDir(explicit?: string): string | undefined {
    const requested = String(explicit || '').trim();
    if (requested) {
        return path.resolve(requested);
    }
    const candidates: string[] = [];
    try {
        candidates.push(path.join(path.dirname(require.resolve('@tsdi/agent-ui/package.json')), 'web'));
    } catch {
        // Bundled builds do not always expose package.json through require.resolve.
    }
    try {
        candidates.push(path.join(path.dirname(require.resolve('@tsdi/agent-ui')), '..', 'web'));
    } catch {
        // Same for the package entry.
    }
    const bin = String((globalThis as { process?: { argv?: string[] } }).process?.argv?.[1] || '');
    if (bin) {
        candidates.push(path.resolve(path.dirname(bin), '..', '..', 'agent-ui', 'web'));
    }
    candidates.push(path.resolve(process.cwd(), 'node_modules/@tsdi/agent-ui/web'));
    return candidates.find(candidate => fs.existsSync(path.join(candidate, 'index.html')));
}

function displayHost(host: string): string {
    return LOOPBACK_HOSTS.has(host) ? '127.0.0.1' : host;
}

/**
 * Headless agent + web console: no terminal UI. The browser pairs once for the
 * bearer token; a terminal can join with `tsdi-agent attach <url> --token`.
 */
export async function runAgentServe(options: AgentServeOptions = {}): Promise<any> {
    const config = new AgentUiConfigService(new CliAgentUiConfigReader(), options);
    const resolved = config.resolve(options);
    await ensureAgentWorkspace(resolved);
    const runtimeAgentOptions = buildConsoleAgentOptions(resolved, options, {});
    const host = String(options.webHost || '127.0.0.1').trim() || '127.0.0.1';
    const port = Number(options.webPort || 3100);
    const token = String(options.token || '').trim();
    const staticDir = resolveAgentWebDir(options.static);
    if (!staticDir) {
        process.stderr.write('Web assets not found; run "npm run build:web" in @tsdi/agent-ui or pass --static <dir>.\n');
    }

    const app = await Application.run(AgentGatewayModule, {
        providers: [
            ...provideAgentGateway({
                host,
                port,
                authToken: token || undefined,
                staticDir: staticDir && fs.existsSync(path.join(staticDir, 'index.html')) ? staticDir : undefined,
                cors: false
            }),
            ...buildAgentRuntimeProviders(config, resolved, options),
            { provide: AGENT_OPTIONS, useValue: runtimeAgentOptions }
        ]
    });

    const gateway = app.get(GatewayServer) as GatewayServer;
    const address = gateway.address();
    const base = `http://${displayHost(host)}:${address?.port ?? port}`;
    const pairing = app.get(PairingStore) as PairingStore;
    const entry = pairing.generate();
    const lines = [
        '',
        `  TSDI Agent web console: ${base}/`,
        `  Pairing link (one-time, 5 minutes): ${base}/?pair=${entry.code}`,
        token ? `  Terminal: tsdi-agent attach ${base} --token ${token}` : `  Terminal: tsdi-agent attach ${base}`,
        ''
    ];
    process.stdout.write(lines.join('\n'));

    let closing = false;
    const stop = async (): Promise<void> => {
        if (closing) {
            return;
        }
        closing = true;
        try {
            await app.close();
        } catch {
            // Shutdown is best-effort; the process must still exit.
        }
        process.exit(0);
    };
    process.once('SIGINT', () => { void stop(); });
    process.once('SIGTERM', () => { void stop(); });
    return app;
}
