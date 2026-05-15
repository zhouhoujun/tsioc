import { HttpAuthOptions } from '@tsdi/security';

export interface GatewayConfig {
    /** HTTP listen host */
    host?: string;
    /** HTTP listen port */
    port?: number;
    /** Bearer token for auth. If unset, auth is disabled. */
    authToken?: string;
    /** Shared HTTP auth options, including JWT validation. */
    auth?: HttpAuthOptions;
    /** Rate limit: max requests per window per IP */
    rateLimitMax?: number;
    /** Rate limit: window in ms */
    rateLimitWindowMs?: number;
    /** Static files root directory (SPA dashboard) */
    staticDir?: string;
    /** Enable CORS */
    cors?: boolean;
    /** CORS allowed origins */
    corsOrigins?: string[];
}

export const defaultGatewayConfig: GatewayConfig = {
    host: '0.0.0.0',
    port: 3100,
    authToken: '',
    auth: undefined,
    rateLimitMax: 100,
    rateLimitWindowMs: 60_000,
    cors: true,
    corsOrigins: ['*']
};
