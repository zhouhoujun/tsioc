import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawn, ChildProcess } from 'node:child_process';
import { GatewayAdminAuthOptions } from './auth';

export interface GatewayAdminOidcServiceOptions {
    /** Start the separate `@tsdi/oidc-auth` service with the admin process. */
    enabled?: boolean;
    host?: string;
    port?: number;
    /** Explicit service entry (`main.ts` or compiled `main.js`). */
    entry?: string;
    /** Working directory (defaults to the entry directory). */
    cwd?: string;
    /** Extra environment for the auth service. */
    env?: Record<string, string>;
    /** Readiness timeout. Default 60s (ts-node cold start can be slow). */
    readyTimeoutMs?: number;
}

export interface RunningGatewayAdminOidcService {
    url: string;
    host: string;
    port: number;
    child: ChildProcess;
    stop(): Promise<void>;
}

function resolveEntry(options: GatewayAdminOidcServiceOptions): string | undefined {
    if (options.entry) {
        return path.resolve(options.entry);
    }
    const candidates = [
        path.resolve(process.cwd(), 'packages/oidc-auth/main.ts'),
        path.resolve(__dirname, '../../../oidc-auth/main.ts'),
        path.resolve(__dirname, '../../oidc-auth/main.ts'),
        path.resolve(process.cwd(), 'packages/oidc-auth/main.js'),
        path.resolve(__dirname, '../../../oidc-auth/main.js'),
        path.resolve(__dirname, '../../oidc-auth/main.js')
    ];
    return candidates.find(candidate => fs.existsSync(candidate));
}

export function resolveGatewayAdminOidcServiceEntry(options: GatewayAdminOidcServiceOptions): string | undefined {
    return resolveEntry(options);
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForService(url: string, timeoutMs: number): Promise<void> {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        try {
            const response = await fetch(`${url}/auth/.well-known/openid-configuration`);
            if (response.ok) {
                return;
            }
        } catch {
            // still starting
        }
        await sleep(150);
    }
    throw new Error(`OIDC auth service did not become ready: ${url}`);
}

async function stopChild(child: ChildProcess): Promise<void> {
    if (child.exitCode !== null || child.signalCode !== null) {
        return;
    }
    child.kill('SIGTERM');
    await new Promise<void>(resolve => {
        const timer = setTimeout(() => {
            try {
                child.kill('SIGKILL');
            } catch {
                // already gone
            }
            resolve();
        }, 3000);
        child.once('exit', () => {
            clearTimeout(timer);
            resolve();
        });
    });
}

/**
 * Start the separate `@tsdi/oidc-auth` service as a child process.
 *
 * The admin package never embeds OIDC endpoints; this helper only launches the
 * existing `packages/oidc-auth` service when explicitly enabled by config.
 */
export async function startGatewayAdminOidcService(
    options: GatewayAdminOidcServiceOptions = {},
    auth?: GatewayAdminAuthOptions | false
): Promise<RunningGatewayAdminOidcService> {
    const entry = resolveEntry(options);
    if (!entry) {
        throw new Error('Cannot find packages/oidc-auth/main.ts; set oidcService.entry');
    }
    const host = options.host || '127.0.0.1';
    const port = options.port ?? 3000;
    const url = `http://${host}:${port}`;
    const env: NodeJS.ProcessEnv = {
        ...process.env,
        ...(options.env ?? {}),
        OIDC_HOST: host,
        OIDC_PORT: String(port)
    };
    if (auth) {
        if (auth.sessionSecret) {
            env.OIDC_SESSION_SECRET = auth.sessionSecret;
        }
        if (auth.sessionIssuer) {
            env.OIDC_SESSION_ISSUER = auth.sessionIssuer;
        }
    }
    const isTypeScript = entry.endsWith('.ts');
    const args = isTypeScript
        ? ['-r', 'ts-node/register', '-r', 'tsconfig-paths/register', entry]
        : [entry];
    const child = spawn(process.execPath, args, {
        cwd: options.cwd || path.dirname(entry),
        env,
        stdio: 'inherit'
    });
    const earlyExit = new Promise<never>((_, reject) => {
        child.once('exit', code => {
            reject(new Error(`OIDC auth service exited during startup (code ${code ?? 'unknown'})`));
        });
    });
    try {
        await Promise.race([
            waitForService(url, options.readyTimeoutMs ?? 60_000),
            earlyExit
        ]);
    } catch (error) {
        await stopChild(child);
        throw error;
    }
    return {
        url,
        host,
        port,
        child,
        stop: () => stopChild(child)
    };
}
