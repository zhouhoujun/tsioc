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
    /** Request timeout in ms; `--timeout` / TSDI_AGENT_APPROVAL_TIMEOUT_MS, else 15s. */
    timeoutMs?: number | string;
    /** Commander's `--timeout` value (same meaning as `timeoutMs`). */
    timeout?: number | string;
    /** Test seam for HTTP; defaults to global fetch. */
    fetchImpl?: typeof fetch;
    /** Test seam for output; defaults to stdout. */
    write?: (text: string) => void;
}

const DEFAULT_APPROVAL_TIMEOUT_MS = 15_000;

interface ApprovalHttpResult {
    ok: boolean;
    status: number;
    text: string;
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

/** Effective request timeout: option, env, else 15s. */
export function resolveApprovalTimeoutMs(options: AgentApprovalCliOptions = {}): number {
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
    const raw = options.timeoutMs ?? options.timeout ?? env?.TSDI_AGENT_APPROVAL_TIMEOUT_MS;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : DEFAULT_APPROVAL_TIMEOUT_MS;
}

function describeError(result: ApprovalHttpResult): string {
    if (!result.text) {
        return `HTTP ${result.status}`;
    }
    try {
        const parsed = JSON.parse(result.text) as { error?: unknown };
        return parsed?.error ? String(parsed.error) : result.text.slice(0, 200);
    } catch {
        return result.text.slice(0, 200);
    }
}

/**
 * Perform one approval request with a bounded wait.
 *
 * Without the abort timer a silent endpoint (or a half-open connection) blocks
 * `tsdi-agent approval …` forever with no diagnosis; the raw `fetch failed`
 * TypeError also hides the address. Both cases now produce an actionable error.
 */
async function requestApproval(
    options: AgentApprovalCliOptions,
    url: string,
    init: { method: string; headers: Record<string, string>; body?: string }
): Promise<ApprovalHttpResult> {
    const fetchImpl = resolveFetch(options);
    const timeoutMs = resolveApprovalTimeoutMs(options);
    const controller = typeof AbortController === 'function' ? new AbortController() : undefined;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
    (timer as { unref?: () => void } | undefined)?.unref?.();
    try {
        const response = await fetchImpl(url, { ...init, signal: controller?.signal });
        const text = await response.text();
        return { ok: response.ok, status: response.status, text };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (controller?.signal.aborted || /abort/i.test(message)) {
            throw new Error(`Approval request timed out after ${timeoutMs}ms (${url}). Check that the gateway or TUI is still running and that the port is reachable.`);
        }
        const cause = (error as { cause?: { message?: string } })?.cause?.message;
        throw new Error(`Cannot reach the approval gateway at ${url}${cause ? `: ${cause}` : ''}. Check --gateway-url, the port, and the network.`);
    } finally {
        if (timer) {
            clearTimeout(timer);
        }
    }
}

/** `GET /api/approvals` (optionally scoped to one session). */
export async function fetchRemoteApprovals(options: AgentApprovalCliOptions = {}): Promise<AgentApprovalRequestView[]> {
    const base = resolveApprovalGatewayUrl(options);
    const query = options.sessionId ? `?sessionId=${encodeURIComponent(options.sessionId)}` : '';
    const result = await requestApproval(options, `${base}/api/approvals${query}`, {
        method: 'GET',
        headers: authorizationHeaders(options)
    });
    if (!result.ok) {
        throw new Error(`Approval list failed: ${describeError(result)}`);
    }
    const payload = JSON.parse(result.text || '{}') as { requests?: AgentApprovalRequestView[] };
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
    const result = await requestApproval(options, `${base}/api/approvals/${encodeURIComponent(id)}/${decision}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authorizationHeaders(options) },
        body: '{}'
    });
    if (!result.ok) {
        throw new Error(`Approval ${decision} failed: ${describeError(result)}`);
    }
    return JSON.parse(result.text || '{}') as AgentApprovalDecisionResult;
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
