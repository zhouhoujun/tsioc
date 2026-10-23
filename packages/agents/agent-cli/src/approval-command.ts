/**
 * Remote approval CLI (`tsdi-agent approval list|approve|reject`).
 *
 * Approvals live in the process that runs the turn, so an out-of-band operator
 * reaches them through a running gateway's REST API. Third-party services use
 * the same endpoints with a dedicated approver token (see
 * `GatewayConfig.approvers` / `TSDI_AGENT_APPROVER_TOKENS`).
 */

export interface AgentApprovalCliOptions {
    gatewayUrl?: string;
    token?: string;
    sessionId?: string;
    json?: boolean;
    /** Test seam for HTTP; defaults to global fetch. */
    fetchImpl?: typeof fetch;
    /** Test seam for output; defaults to stdout. */
    write?: (text: string) => void;
}

export interface AgentApprovalRequestView {
    id: string;
    toolName: string;
    sessionId: string;
    reason?: string;
    inputSummary?: string;
    expiresAt?: number;
    timeoutMs?: number;
}

export interface AgentApprovalDecisionResult {
    requestId: string;
    sessionId?: string;
    applied: boolean;
    decision?: string;
    reason?: string;
}

/** Validate and normalize the gateway base URL. */
export function resolveApprovalGatewayUrl(options: AgentApprovalCliOptions = {}): string {
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
    const url = String(options.gatewayUrl || env?.TSDI_AGENT_GATEWAY_URL || '').trim().replace(/\/+$/, '');
    if (!url) {
        throw new Error('Provide --gateway-url (or TSDI_AGENT_GATEWAY_URL) for remote approvals.');
    }
    if (!/^https?:\/\//i.test(url)) {
        throw new Error('Gateway URL must use http:// or https://.');
    }
    return url;
}

function authorizationHeaders(options: AgentApprovalCliOptions): Record<string, string> {
    const token = String(options.token || '').trim();
    return token ? { authorization: `Bearer ${token}` } : {};
}

function resolveFetch(options: AgentApprovalCliOptions): typeof fetch {
    const impl = options.fetchImpl || (typeof fetch === 'function' ? fetch : undefined);
    if (!impl) {
        throw new Error('Remote approvals require fetch (Node 18+) or an injected fetch implementation.');
    }
    return impl;
}

async function readError(response: Response): Promise<string> {
    try {
        const text = await response.text();
        if (!text) {
            return `HTTP ${response.status}`;
        }
        try {
            const parsed = JSON.parse(text) as { error?: unknown };
            return parsed?.error ? String(parsed.error) : text.slice(0, 200);
        } catch {
            return text.slice(0, 200);
        }
    } catch {
        return `HTTP ${response.status}`;
    }
}

/** `GET /api/approvals` (optionally scoped to one session). */
export async function fetchRemoteApprovals(options: AgentApprovalCliOptions = {}): Promise<AgentApprovalRequestView[]> {
    const base = resolveApprovalGatewayUrl(options);
    const query = options.sessionId ? `?sessionId=${encodeURIComponent(options.sessionId)}` : '';
    const response = await resolveFetch(options)(`${base}/api/approvals${query}`, {
        method: 'GET',
        headers: authorizationHeaders(options)
    });
    if (!response.ok) {
        throw new Error(`Approval list failed: ${await readError(response)}`);
    }
    const payload = await response.json() as { requests?: AgentApprovalRequestView[] };
    return Array.isArray(payload?.requests) ? payload.requests : [];
}

/** `POST /api/approvals/:id/approve|reject`. */
export async function decideRemoteApproval(
    decision: 'approve' | 'reject',
    requestId: string,
    options: AgentApprovalCliOptions = {}
): Promise<AgentApprovalDecisionResult> {
    const id = String(requestId || '').trim();
    if (!id) {
        throw new Error('Provide an approval request id.');
    }
    const base = resolveApprovalGatewayUrl(options);
    const response = await resolveFetch(options)(`${base}/api/approvals/${encodeURIComponent(id)}/${decision}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authorizationHeaders(options) },
        body: '{}'
    });
    if (!response.ok) {
        throw new Error(`Approval ${decision} failed: ${await readError(response)}`);
    }
    return await response.json() as AgentApprovalDecisionResult;
}

/** Human-readable line for one pending request. */
export function formatApprovalLine(request: AgentApprovalRequestView, now = Date.now()): string {
    const id = String(request.id || '').trim();
    const tool = String(request.toolName || 'tool');
    const session = String(request.sessionId || '-');
    const expires = Number(request.expiresAt || 0);
    const expiry = expires > 0 ? ` · expires in ${Math.max(0, Math.ceil((expires - now) / 1000))}s` : '';
    const summary = String(request.inputSummary || request.reason || '').replace(/\s+/g, ' ').trim();
    return `${id.slice(0, 12)}  ${tool}  session=${session}${expiry}${summary ? `  ${summary.slice(0, 100)}` : ''}`;
}

/** `tsdi-agent approval list`. */
export async function runAgentApprovalList(options: AgentApprovalCliOptions = {}): Promise<AgentApprovalRequestView[]> {
    const requests = await fetchRemoteApprovals(options);
    const write = options.write || ((text: string) => process.stdout.write(text));
    if (options.json) {
        write(`${JSON.stringify({ requests }, null, 2)}\n`);
        return requests;
    }
    if (!requests.length) {
        write('No pending approvals.\n');
        return requests;
    }
    const now = Date.now();
    write(`${requests.map(request => formatApprovalLine(request, now)).join('\n')}\n`);
    return requests;
}

/** `tsdi-agent approval approve|reject <id>`. */
export async function runAgentApprovalDecision(
    decision: 'approve' | 'reject',
    requestId: string,
    options: AgentApprovalCliOptions = {}
): Promise<AgentApprovalDecisionResult> {
    const result = await decideRemoteApproval(decision, requestId, options);
    const write = options.write || ((text: string) => process.stdout.write(text));
    if (options.json) {
        write(`${JSON.stringify(result, null, 2)}\n`);
        return result;
    }
    if (result.applied) {
        write(`${decision === 'approve' ? 'Approved' : 'Rejected'} ${result.requestId}${result.sessionId ? ` (session ${result.sessionId})` : ''}.\n`);
    } else {
        write(`No pending approval '${result.requestId}'${result.reason ? `: ${result.reason}` : ''}.\n`);
    }
    return result;
}
