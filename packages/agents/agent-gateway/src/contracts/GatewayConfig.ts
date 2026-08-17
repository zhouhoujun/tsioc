import { HttpAuthOptions } from '@tsdi/security';

/**
 * Per-key audio frame quota limits enforced on the WebSocket audio channel.
 */
export interface AudioFrameQuotaOptions {
    /**
     * Maximum bytes per single audio frame. Defaults to 1 MiB.
     */
    maxFrameBytes?: number;
    /**
     * Maximum total audio bytes per session (reset on start/end/cancel/close).
     * Defaults to 10 MiB.
     */
    maxSessionBytes?: number;
    /**
     * Maximum audio frames accepted per sliding window. Defaults to 12000.
     */
    maxFramesPerWindow?: number;
    /**
     * Sliding window duration in ms. Defaults to 60000.
     */
    windowMs?: number;
}

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
    /** Audio frame quota control for the WebSocket audio channel */
    audioQuota?: AudioFrameQuotaOptions;
    /** Advertise this gateway through multicast DNS. */
    mdns?: boolean;
    /** DNS-SD service type. Defaults to _tsdi-agent._tcp. */
    mdnsServiceType?: string;
    /** mDNS domain. Defaults to local. */
    mdnsDomain?: string;
    /** Human-readable DNS-SD instance name. */
    mdnsName?: string;
}

export const defaultGatewayConfig: GatewayConfig = {
    host: '0.0.0.0',
    port: 3100,
    authToken: '',
    auth: undefined,
    rateLimitMax: 100,
    rateLimitWindowMs: 60_000,
    cors: true,
    corsOrigins: ['*'],
    audioQuota: undefined,
    mdns: false,
    mdnsServiceType: '_tsdi-agent._tcp',
    mdnsDomain: 'local'
};
