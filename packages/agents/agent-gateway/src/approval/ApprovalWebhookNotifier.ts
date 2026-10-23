import { createHmac } from 'crypto';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { EventHandler as OnEvent } from '@tsdi/core';
import { AgentApprovalRequestedEvent } from '@tsdi/agent';
import { GATEWAY_CONFIG } from '../tokens';
import { GatewayApprovalWebhook, GatewayConfig } from '../contracts/GatewayConfig';

export interface ApprovalWebhookPayload {
    type: 'approval_requested';
    sentAt: number;
    request: {
        id: string;
        toolName: string;
        sessionId: string;
        reason: string;
        reasonDetail?: { code: string; params?: Record<string, any> };
        summary: string;
        hasInput: boolean;
        inputSummary?: string;
        createdAt?: number;
        expiresAt?: number;
        timeoutMs: number;
    };
}

/**
 * Pushes pending approvals to an external service.
 *
 * Third-party approval needs a push, not polling: a webhook receives every
 * `approval_requested` event with a signed body, then decides through the REST
 * API (or a dedicated approver token). Delivery is fire-and-forget — a broken
 * or slow endpoint must never block or fail the tool call.
 *
 * Configuration: `GatewayConfig.approvalWebhook`, or the deployment env vars
 * `TSDI_AGENT_APPROVAL_WEBHOOK` / `TSDI_AGENT_APPROVAL_WEBHOOK_SECRET`.
 *
 * Signature: `X-Tsdi-Signature: sha256=<hex HMAC-SHA256(secret, "<timestamp>.<body>")>`
 * with the same timestamp in `X-Tsdi-Timestamp`.
 */
@Injectable()
export class ApprovalWebhookNotifier {
    constructor(@Optional() @Inject(GATEWAY_CONFIG) private config?: GatewayConfig | null) {
    }

    @OnEvent(AgentApprovalRequestedEvent)
    onApprovalRequested(event: AgentApprovalRequestedEvent): void {
        void this.notify(event.request);
    }

    /** Resolve the webhook (config wins; env is the deployment fallback). */
    resolveWebhook(): GatewayApprovalWebhook | undefined {
        if (this.config?.approvalWebhook?.url) {
            return this.config.approvalWebhook;
        }
        const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env || {};
        const url = String(env.TSDI_AGENT_APPROVAL_WEBHOOK || '').trim();
        if (!url) {
            return undefined;
        }
        const timeout = Number(env.TSDI_AGENT_APPROVAL_WEBHOOK_TIMEOUT_MS || 0);
        return {
            url,
            secret: String(env.TSDI_AGENT_APPROVAL_WEBHOOK_SECRET || '').trim() || undefined,
            timeoutMs: timeout > 0 ? timeout : undefined
        };
    }

    async notify(request: ApprovalWebhookPayload['request']): Promise<boolean> {
        const webhook = this.resolveWebhook();
        if (!webhook || typeof fetch !== 'function') {
            return false;
        }
        const body = JSON.stringify({
            type: 'approval_requested',
            sentAt: Date.now(),
            request
        } satisfies ApprovalWebhookPayload);
        const timestamp = String(Date.now());
        const headers: Record<string, string> = {
            'content-type': 'application/json',
            'x-tsdi-timestamp': timestamp,
            ...(webhook.headers || {})
        };
        if (webhook.secret) {
            headers['x-tsdi-signature'] = `sha256=${sign(webhook.secret, timestamp, body)}`;
        }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), webhook.timeoutMs && webhook.timeoutMs > 0 ? webhook.timeoutMs : 5000);
        try {
            const response = await fetch(webhook.url, {
                method: 'POST',
                headers,
                body,
                signal: controller.signal
            });
            return response.ok;
        } catch {
            // A webhook outage must not surface as an approval/tool failure.
            return false;
        } finally {
            clearTimeout(timer);
        }
    }
}

function sign(secret: string, timestamp: string, body: string): string {
    return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}
