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

/**
 * Dedicated third-party approval token.
 *
 * Approvers may list and resolve pending tool approvals, but they are not
 * session owners: they cannot read transcripts, run turns or change settings.
 */
export interface GatewayApproverToken {
    /** Stable identity used in audit/notices (`approver:<id>`). */
    id: string;
    /** Bearer token the third-party service presents. */
    token: string;
}

export interface GatewayApprovalWebhook {
    /** HTTPS endpoint that receives each pending approval request. */
    url: string;
    /** Shared secret for the `X-Tsdi-Signature` HMAC (recommended). */
    secret?: string;
    /** Request timeout; defaults to 5000ms. */
    timeoutMs?: number;
    /** Extra headers (e.g. a service token). */
    headers?: Record<string, string>;
}

export interface GatewayConfig {
    /** HTTP listen host */
    host?: string;
    /** Principal used for unauthenticated loopback requests (default `gateway-local`). */
    localPrincipalId?: string;
    /** HTTP listen port */
    port?: number;
    /** Bearer token for auth. If unset, auth is disabled. */
    authToken?: string;
    /** Shared HTTP auth options, including JWT validation. */
    auth?: HttpAuthOptions;
    /** Third-party approvers (no session ownership required). */
    approvers?: GatewayApproverToken[];
    /** Push pending approvals to an external service (webhook). */
    approvalWebhook?: GatewayApprovalWebhook;
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
