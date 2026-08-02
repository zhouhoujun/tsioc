import * as crypto from 'crypto';
import { AgentMcpServerOptions, McpOAuthAuthorizationServerMetadata, McpOAuthToken, ResolvedAgentMcpOptions } from './types';
import { McpOAuthCredentialStore } from './mcp-credentials';

export interface McpOAuthInteraction {
    onDeviceAuthorization(verificationUri: string, userCode?: string, verificationUriComplete?: string): Promise<void>;
    openAuthorizationUrl(url: string): Promise<void>;
}

export interface McpOAuthClientOptions {
    fetchImpl?: typeof fetch;
    interaction?: McpOAuthInteraction;
    /** Milliseconds to wait for a user to complete authorization (device + PKCE). */
    timeoutMs?: number;
}

export interface McpOAuthTokenResult {
    token: McpOAuthToken;
    fresh: boolean;
}

const DEFAULT_POLL_INTERVAL_MS = 5000;
const DEFAULT_TIMEOUT_MS = 300000;

function toQuery(params: Record<string, string>): string {
    return new URLSearchParams(params).toString();
}

function base64UrlEncode(input: Buffer): string {
    return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateCodeVerifier(): string {
    return base64UrlEncode(crypto.randomBytes(32));
}

function generateCodeChallenge(verifier: string): string {
    return base64UrlEncode(crypto.createHash('sha256').update(verifier).digest());
}

function isExpired(token: McpOAuthToken): boolean {
    return typeof token.expiresAt === 'number' && token.expiresAt <= Date.now() + 30000;
}

/**
 * OAuth 2.0 client for remote MCP servers following the MCP authorization spec.
 *
 * Supports RFC 8414 discovery, RFC 8628 device flow (preferred for CLI use),
 * RFC 7636 PKCE authorization-code flow, and refresh-token renewal. Tokens are
 * persisted through {@link McpOAuthCredentialStore} so authorization survives
 * process restarts.
 */
export class McpOAuthClient {
    private readonly fetchImpl: typeof fetch;
    private readonly interaction: McpOAuthInteraction;
    private readonly timeoutMs: number;
    private readonly store: McpOAuthCredentialStore;

    constructor(
        options: ResolvedAgentMcpOptions,
        clientOptions: McpOAuthClientOptions = {}
    ) {
        this.fetchImpl = clientOptions.fetchImpl ?? globalThis.fetch;
        this.interaction = clientOptions.interaction ?? new ConsoleMcpOAuthInteraction();
        this.timeoutMs = clientOptions.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        this.store = new McpOAuthCredentialStore(options.credentialsPath);
    }

    getStore(): McpOAuthCredentialStore {
        return this.store;
    }

    async getAccessToken(server: AgentMcpServerOptions): Promise<McpOAuthToken> {
        const existing = this.store.get(server.id);
        if (existing?.token?.accessToken && !isExpired(existing.token)) {
            return existing.token;
        }
        if (existing?.token?.refreshToken) {
            const metadata = await this.discover(server);
            const token = await this.refresh(server, existing.token.refreshToken, metadata);
            this.store.set(server.id, token);
            return token;
        }
        const token = await this.authorize(server);
        this.store.set(server.id, token);
        return token;
    }

    /**
     * Run the full authorization flow for a server and persist the resulting token.
     * Returns `true` when a token was obtained and stored.
     */
    async authorizeAndStore(server: AgentMcpServerOptions): Promise<boolean> {
        if (server.auth?.type === 'bearer') {
            return false;
        }
        const metadata = await this.discover(server);
        const token = await this.runFlow(server, metadata);
        this.store.set(server.id, token);
        return true;
    }

    async authorize(server: AgentMcpServerOptions): Promise<McpOAuthToken> {
        const metadata = await this.discover(server);
        return this.runFlow(server, metadata);
    }

    async discover(server: AgentMcpServerOptions): Promise<McpOAuthAuthorizationServerMetadata> {
        if (server.auth?.tokenEndpoint && server.auth.authorizationEndpoint) {
            return {
                token_endpoint: server.auth.tokenEndpoint,
                authorization_endpoint: server.auth.authorizationEndpoint,
                device_authorization_endpoint: server.auth.deviceAuthorizationEndpoint
            };
        }
        const origin = new URL(server.url!).origin;
        const candidates = [
            `${origin}/.well-known/oauth-authorization-server`,
            `${origin}/.well-known/mcp/oauth-authorization-server`
        ];
        for (const candidate of candidates) {
            const response = await this.fetchImpl(candidate, {
                method: 'GET',
                headers: { Accept: 'application/json' }
            });
            if (response.ok) {
                const parsed = await response.json() as McpOAuthAuthorizationServerMetadata;
                if (parsed.authorization_endpoint && parsed.token_endpoint) {
                    return {
                        ...parsed,
                        device_authorization_endpoint: parsed.device_authorization_endpoint
                            ?? server.auth?.deviceAuthorizationEndpoint
                    };
                }
            }
        }
        throw new Error(`OAuth authorization server metadata not found for MCP server '${server.id}'. ` +
            `Expected ${candidates.join(' or ')} to expose an authorization server.`);
    }

    async refresh(server: AgentMcpServerOptions, refreshToken: string, metadata: McpOAuthAuthorizationServerMetadata): Promise<McpOAuthToken> {
        const tokenEndpoint = metadata.token_endpoint ?? server.auth?.tokenEndpoint;
        if (!tokenEndpoint) {
            throw new Error(`Cannot refresh token for MCP server '${server.id}': no token endpoint available.`);
        }
        const body = toQuery({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: server.auth?.clientId ?? ''
        });
        const response = await this.fetchImpl(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json'
            },
            body
        });
        if (!response.ok) {
            throw new Error(`OAuth token refresh failed for MCP server '${server.id}' (${response.status} ${response.statusText}).`);
        }
        const payload = await response.json() as Record<string, any>;
        return this.normalizeToken(payload);
    }

    private async runFlow(server: AgentMcpServerOptions, metadata: McpOAuthAuthorizationServerMetadata): Promise<McpOAuthToken> {
        const deviceEndpoint = metadata.device_authorization_endpoint
            ?? server.auth?.deviceAuthorizationEndpoint;
        if (deviceEndpoint) {
            return this.deviceFlow(server, deviceEndpoint, metadata);
        }
        if (metadata.authorization_endpoint && metadata.token_endpoint) {
            return this.pkceFlow(server, metadata);
        }
        throw new Error(`OAuth authorization flow unavailable for MCP server '${server.id}': ` +
            'the authorization server advertises neither a device authorization endpoint nor an authorization endpoint.');
    }

    private async deviceFlow(
        server: AgentMcpServerOptions,
        deviceEndpoint: string,
        metadata: McpOAuthAuthorizationServerMetadata
    ): Promise<McpOAuthToken> {
        const tokenEndpoint = metadata.token_endpoint ?? server.auth?.tokenEndpoint;
        if (!tokenEndpoint) {
            throw new Error(`OAuth device flow for MCP server '${server.id}' requires a token endpoint.`);
        }
        const clientId = server.auth?.clientId ?? '';
        const scope = server.auth?.scope;
        const response = await this.fetchImpl(deviceEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json'
            },
            body: toQuery({ client_id: clientId, ...(scope ? { scope } : {}) })
        });
        if (!response.ok) {
            throw new Error(`OAuth device authorization request failed for MCP server '${server.id}' (${response.status} ${response.statusText}).`);
        }
        const payload = await response.json() as Record<string, any>;
        const deviceCode = String(payload.device_code ?? '');
        const userCode = payload.user_code ? String(payload.user_code) : undefined;
        const verificationUri = String(payload.verification_uri ?? '');
        const verificationUriComplete = payload.verification_uri_complete
            ? String(payload.verification_uri_complete)
            : undefined;
        const intervalMs = (Number(payload.interval) || DEFAULT_POLL_INTERVAL_MS / 1000) * 1000;
        if (!deviceCode || !verificationUri) {
            throw new Error(`OAuth device flow for MCP server '${server.id}' returned no device_code or verification_uri.`);
        }
        await this.interaction.onDeviceAuthorization(verificationUri, userCode, verificationUriComplete);

        const deadline = Date.now() + this.timeoutMs;
        let lastError: Error | undefined;
        while (Date.now() < deadline) {
            await sleep(intervalMs);
            try {
                const poll = await this.fetchImpl(tokenEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        Accept: 'application/json'
                    },
                    body: toQuery({
                        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
                        device_code: deviceCode,
                        client_id: clientId
                    })
                });
                const pollPayload = await poll.json() as Record<string, any>;
                if (poll.ok && pollPayload.access_token) {
                    return this.normalizeToken(pollPayload);
                }
                const errorCode = String(pollPayload.error ?? '');
                if (errorCode === 'authorization_pending' || errorCode === 'slow_down') {
                    continue;
                }
                if (errorCode === 'access_denied') {
                    throw new Error(`OAuth authorization denied for MCP server '${server.id}'.`);
                }
                if (errorCode === 'expired_token') {
                    throw new Error(`OAuth device flow expired for MCP server '${server.id}'; restart authorization.`);
                }
                lastError = new Error(`OAuth device flow polling failed for MCP server '${server.id}': ${errorCode || pollPayload.error_description || poll.statusText}`);
            } catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
                if (lastError.message.includes('denied') || lastError.message.includes('expired')) {
                    throw lastError;
                }
            }
        }
        throw lastError ?? new Error(`OAuth device flow timed out for MCP server '${server.id}'.`);
    }

    private async pkceFlow(server: AgentMcpServerOptions, metadata: McpOAuthAuthorizationServerMetadata): Promise<McpOAuthToken> {
        const tokenEndpoint = metadata.token_endpoint ?? server.auth?.tokenEndpoint;
        const authorizationEndpoint = metadata.authorization_endpoint ?? server.auth?.authorizationEndpoint;
        if (!tokenEndpoint || !authorizationEndpoint) {
            throw new Error(`OAuth PKCE flow for MCP server '${server.id}' requires both authorization and token endpoints.`);
        }
        const clientId = server.auth?.clientId ?? '';
        const scope = server.auth?.scope;
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = generateCodeChallenge(codeVerifier);
        const state = base64UrlEncode(crypto.randomBytes(16));
        const listener = await startLoopbackListener();
        const redirectUri = `http://127.0.0.1:${listener.port}/callback`;
        const authUrl = `${authorizationEndpoint}?${toQuery({
            response_type: 'code',
            client_id: clientId,
            redirect_uri: redirectUri,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
            state,
            ...(scope ? { scope } : {})
        })}`;
        await this.interaction.openAuthorizationUrl(authUrl);
        const authorizationCode = await listener.waitForCode(state, this.timeoutMs);
        await listener.close();
        if (!authorizationCode) {
            throw new Error(`OAuth PKCE flow timed out for MCP server '${server.id}'; no authorization code received.`);
        }
        const response = await this.fetchImpl(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json'
            },
            body: toQuery({
                grant_type: 'authorization_code',
                code: authorizationCode,
                redirect_uri: redirectUri,
                client_id: clientId,
                code_verifier: codeVerifier
            })
        });
        if (!response.ok) {
            throw new Error(`OAuth PKCE token exchange failed for MCP server '${server.id}' (${response.status} ${response.statusText}).`);
        }
        const payload = await response.json() as Record<string, any>;
        return this.normalizeToken(payload);
    }

    private normalizeToken(payload: Record<string, any>): McpOAuthToken {
        const accessToken = String(payload.access_token ?? '');
        if (!accessToken) {
            throw new Error('OAuth token response missing access_token.');
        }
        const expiresIn = Number(payload.expires_in);
        return {
            accessToken,
            refreshToken: payload.refresh_token ? String(payload.refresh_token) : undefined,
            tokenType: String(payload.token_type ?? 'Bearer'),
            scope: payload.scope ? String(payload.scope) : undefined,
            ...(Number.isFinite(expiresIn) && expiresIn > 0
                ? { expiresAt: Date.now() + expiresIn * 1000 }
                : {})
        };
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

interface LoopbackListener {
    port: number;
    waitForCode(state: string, timeoutMs: number): Promise<string | undefined>;
    close(): Promise<void>;
}

async function startLoopbackListener(): Promise<LoopbackListener> {
    const http = await import('http');
    const server = http.createServer();
    const pending: Array<{ state: string; resolve: (code?: string) => void; }> = [];
    server.on('request', (request, response) => {
        const url = new URL(request.url ?? '/', `http://127.0.0.1:${server.address()?.toString() ?? ''}`);
        const code = url.searchParams.get('code') ?? undefined;
        const state = url.searchParams.get('state') ?? '';
        const callback = pending.shift();
        if (callback && state === callback.state) {
            response.writeHead(200, { 'Content-Type': 'text/plain' });
            response.end('Authorization complete. You can close this tab and return to the CLI.');
            callback.resolve(code);
        } else {
            response.writeHead(400, { 'Content-Type': 'text/plain' });
            response.end('Invalid OAuth callback.');
            callback?.resolve(undefined);
        }
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    return {
        port,
        waitForCode(state: string, timeoutMs: number): Promise<string | undefined> {
            return new Promise(resolve => {
                const timer = setTimeout(() => {
                    const index = pending.findIndex(entry => entry.state === state);
                    if (index >= 0) {
                        pending.splice(index, 1);
                    }
                    resolve(undefined);
                }, timeoutMs);
                pending.push({
                    state,
                    resolve: (code) => {
                        clearTimeout(timer);
                        resolve(code);
                    }
                });
            });
        },
        close(): Promise<void> {
            return new Promise(resolve => {
                server.close(() => resolve());
            });
        }
    };
}

/**
 * Default CLI interaction: prints the authorization instructions and opens the
 * default browser where available.
 */
export class ConsoleMcpOAuthInteraction implements McpOAuthInteraction {
    async onDeviceAuthorization(verificationUri: string, userCode?: string, verificationUriComplete?: string): Promise<void> {
        if (verificationUriComplete) {
            process.stdout.write(`\nPlease authorize this device at:\n  ${verificationUriComplete}\n\n`);
            void this.tryOpen(verificationUriComplete);
            return;
        }
        process.stdout.write(`\nPlease authorize this device at:\n  ${verificationUri}\n`);
        if (userCode) {
            process.stdout.write(`Enter the code: ${userCode}\n`);
        }
        process.stdout.write('\n');
        void this.tryOpen(verificationUri);
    }

    async openAuthorizationUrl(url: string): Promise<void> {
        process.stdout.write(`\nOpen the following URL in your browser to authorize:\n  ${url}\n\n`);
        void this.tryOpen(url);
    }

    private async tryOpen(url: string): Promise<void> {
        const platform = process.platform;
        try {
            const { spawn } = await import('child_process');
            if (platform === 'darwin') {
                spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
            } else if (platform === 'win32') {
                spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true }).unref();
            } else {
                spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
            }
        } catch (err) {
            process.stdout.write(`(Could not open a browser automatically; please open the URL manually.)\n`);
        }
    }
}
