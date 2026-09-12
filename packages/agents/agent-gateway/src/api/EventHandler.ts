import * as http from 'http';
import { Injectable, Optional } from '@tsdi/ioc';
import { EventHandler as OnEvent } from '@tsdi/core';
import { AgentApprovalCompletedEvent, AgentApprovalFailedEvent, AgentApprovalRequestedEvent, AgentBackgroundTaskCompletedEvent, AgentBackgroundTaskFailedEvent, AgentBackgroundTaskStartedEvent, AgentCompensationEvent, AgentContextPreparedEvent, AgentErrorEvent, AgentPlanCompletedEvent, AgentPlanCreatedEvent, AgentPlanStepBlockedEvent, AgentPlanStepCompletedEvent, AgentPlanStepStartedEvent, AgentStreamChunkEvent, AgentToolCompletedEvent, AgentToolFailedEvent, AgentToolInvokedEvent, AgentToolSkippedEvent, AgentTurnCancelledEvent, AgentTurnCompletedEvent, AgentTurnDiagnosticsEvent, AgentTurnStartedEvent, TimelineEventRecord, TimelineHistoryStore, TimelineEventType } from '@tsdi/agent';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';
import { getRequestPrincipalId } from '../auth/AuthMiddleware';
import { SessionOwnerStore } from '../auth/SessionOwnerStore';
import { QuestionStore } from '../app-rpc/QuestionStore';

/**
 * SSE (Server-Sent Events) endpoint — GET /api/events.
 * Mirrors zeroclaw-gateway's SSE event stream.
 */
export interface GatewayEventRecord {
    id: string;
    type: string;
    sessionId?: string;
    timestamp: number;
    data: any;
}

const MAX_EVENT_HISTORY = 200;

@Injectable()
export class EventHandler {
    private clients = new Map<string, Set<http.ServerResponse>>();
    private listeners = new Map<string, Set<(record: GatewayEventRecord) => void>>();
    private history: GatewayEventRecord[] = [];

    constructor(
        private owners: SessionOwnerStore,
        @Optional() private timeline?: TimelineHistoryStore | null,
        @Optional() private questionStore?: QuestionStore | null
    ) {
    }

    private capture(type: TimelineEventType, event: Omit<TimelineEventRecord, 'seq'>): void {
        this.timeline?.append({ ...event, type }).catch(() => undefined);
    }

    private sseHandler: RouteHandler = async (req, res) => {
        const host = req.headers?.host ?? 'localhost';
        const url = new URL(req.url ?? '/api/events', `http://${host}`);
        const sessionId = url.searchParams.get('sessionId');
        if (!sessionId) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ error: 'sessionId required' }));
            return;
        }
        if (!await this.ensureAccess(req, res, sessionId)) {
            return;
        }
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive'
        });
        res.write(`event: connected\ndata: ${JSON.stringify({ sessionId })}\n\n`);

        const clients = this.clients.get(sessionId) ?? new Set<http.ServerResponse>();
        clients.add(res);
        this.clients.set(sessionId, clients);
        res.on('close', () => {
            clients.delete(res);
            if (!clients.size) {
                this.clients.delete(sessionId);
            }
        });
    };

    @OnEvent(AgentTurnStartedEvent)
    onTurnStarted(event: AgentTurnStartedEvent): void {
        this.publish('turn_started', { sessionId: event.sessionId, input: event.input });
        this.capture('turn_started', {
            id: `turn-${event.sessionId}-${Date.now()}-s`,
            type: 'turn_started',
            sessionId: event.sessionId,
            timestamp: Date.now(),
            turnId: event.sessionId,
            summary: event.input
        });
    }

    @OnEvent(AgentStreamChunkEvent)
    onStreamChunk(event: AgentStreamChunkEvent): void {
        this.publish('stream_chunk', {
            sessionId: event.sessionId,
            chunkType: event.type,
            content: event.content,
            toolCalls: event.toolCalls,
            usage: event.usage
        });
    }

    @OnEvent(AgentToolInvokedEvent)
    onToolInvoked(event: AgentToolInvokedEvent): void {
        this.publish('tool_invoked', {
            sessionId: event.sessionId,
            toolName: event.toolName,
            hasInput: event.hasInput,
            inputSummary: event.inputSummary
        });
        this.capture('tool_invoked', {
            id: `tool_invoked:${event.receipt?.receiptId ?? event.receipt?.toolCallId ?? `tool-${event.sessionId}-${Date.now()}`}`,
            type: 'tool_invoked',
            sessionId: event.sessionId,
            timestamp: Date.now(),
            toolName: event.toolName,
            toolCallId: event.receipt?.toolCallId,
            receiptId: event.receipt?.receiptId,
            attempt: event.receipt?.attemptCount,
            status: event.receipt?.status,
            summary: event.inputSummary,
            detail: event.inputSummary
        });
    }

    @OnEvent(AgentToolCompletedEvent)
    onToolCompleted(event: AgentToolCompletedEvent): void {
        this.publish('tool_completed', {
            sessionId: event.sessionId,
            toolName: event.toolName,
            output: this.summarizeValue(event.output),
            receipt: event.receipt
        });
        if (event.toolName === 'ask_user') {
            this.registerQuestion(event.sessionId, event.output);
        }
        this.capture('tool_completed', {
            id: `tool_completed:${event.receipt?.receiptId ?? event.receipt?.toolCallId ?? `tool-${event.sessionId}-${Date.now()}`}`,
            type: 'tool_completed',
            sessionId: event.sessionId,
            timestamp: Date.now(),
            toolName: event.toolName,
            toolCallId: event.receipt?.toolCallId,
            receiptId: event.receipt?.receiptId,
            attempt: event.receipt?.attemptCount,
            status: event.receipt?.status,
            summary: event.receipt?.outputSummary,
            detail: event.receipt?.outputSummary,
            durationMs: event.receipt?.durationMs
        });
    }

    private registerQuestion(sessionId: string, output: any): void {
        if (!this.questionStore || !output || typeof output !== 'object') {
            return;
        }
        const question = String(output?.question || '').trim();
        if (!question) {
            return;
        }
        const createdAt = Number(output?.createdAt);
        const timeoutMs = Number(output?.timeoutMs);
        this.questionStore.register({
            sessionId,
            question,
            questionId: String(output?.questionId || '').trim(),
            options: Array.isArray(output?.options) ? output.options.map((item: any) => String(item || '').trim()).filter(Boolean) : [],
            context: typeof output?.context === 'string' && output.context.trim() ? output.context.trim() : undefined,
            severity: ['low', 'medium', 'high'].includes(output?.severity) ? output.severity : 'medium',
            ...(Number.isFinite(createdAt) ? { createdAt } : {}),
            ...(Number.isFinite(timeoutMs) ? { timeoutMs } : {})
        });
    }

    @OnEvent(AgentToolFailedEvent)
    onToolFailed(event: AgentToolFailedEvent): void {
        this.publish('tool_failed', {
            sessionId: event.sessionId,
            toolName: event.toolName,
            error: event.error.message,
            receipt: event.receipt
        });
        this.capture('tool_failed', {
            id: event.receipt?.receiptId ?? event.receipt?.toolCallId ?? `tool-${event.sessionId}-${Date.now()}`,
            type: 'tool_failed',
            sessionId: event.sessionId,
            timestamp: Date.now(),
            toolName: event.toolName,
            toolCallId: event.receipt?.toolCallId,
            receiptId: event.receipt?.receiptId,
            attempt: event.receipt?.attemptCount,
            status: event.receipt?.status,
            detail: event.error.message,
            durationMs: event.receipt?.durationMs
        });
    }

    @OnEvent(AgentToolSkippedEvent)
    onToolSkipped(event: AgentToolSkippedEvent): void {
        this.publish('tool_skipped', {
            sessionId: event.sessionId,
            toolName: event.toolName,
            reason: event.reason,
            receipt: event.receipt
        });
        this.capture('tool_skipped', {
            id: event.receipt?.receiptId ?? event.receipt?.toolCallId ?? `tool-${event.sessionId}-${Date.now()}`,
            type: 'tool_skipped',
            sessionId: event.sessionId,
            timestamp: Date.now(),
            toolName: event.toolName,
            toolCallId: event.receipt?.toolCallId,
            receiptId: event.receipt?.receiptId,
            attempt: event.receipt?.attemptCount,
            status: event.receipt?.status,
            detail: event.reason
        });
    }

    @OnEvent(AgentTurnCompletedEvent)
    onTurnCompleted(event: AgentTurnCompletedEvent): void {
        this.publish('turn_completed', {
            sessionId: event.sessionId,
            message: event.message
        });
        this.capture('turn_completed', {
            id: `turn-${event.sessionId}-${Date.now()}-c`,
            type: 'turn_completed',
            sessionId: event.sessionId,
            timestamp: Date.now(),
            turnId: event.sessionId
        });
    }

    @OnEvent(AgentTurnCancelledEvent)
    onTurnCancelled(event: AgentTurnCancelledEvent): void {
        this.publish('turn_cancelled', {
            sessionId: event.sessionId
        });
        this.capture('turn_cancelled', {
            id: `turn-${event.sessionId}-${Date.now()}-x`,
            type: 'turn_cancelled',
            sessionId: event.sessionId,
            timestamp: Date.now(),
            turnId: event.sessionId
        });
    }

    @OnEvent(AgentPlanCreatedEvent)
    onPlanCreated(event: AgentPlanCreatedEvent): void {
        this.publish('plan_created', {
            sessionId: event.sessionId,
            planId: event.planId,
            stepCount: event.steps.length
        });
        event.steps.forEach(step => {
            this.capture('plan_created', {
                id: `plan-${event.planId}-${event.sessionId}-${Date.now()}-${step.id}`,
                type: 'plan_created',
                sessionId: event.sessionId,
                timestamp: Date.now(),
                planId: event.planId,
                stepId: step.id,
                sequence: event.sequence,
                summary: step.content,
                detail: step.content
            });
        });
    }

    @OnEvent(AgentPlanStepStartedEvent)
    onPlanStepStarted(event: AgentPlanStepStartedEvent): void {
        this.publish('step_started', {
            sessionId: event.sessionId,
            planId: event.planId,
            stepId: event.stepId,
            sequence: event.sequence
        });
        this.capture('step_started', {
            id: `step-${event.planId}-${event.stepId}-${event.sessionId}-${Date.now()}`,
            type: 'step_started',
            sessionId: event.sessionId,
            timestamp: Date.now(),
            planId: event.planId,
            stepId: event.stepId,
            sequence: event.sequence,
            summary: event.stepId
        });
    }

    @OnEvent(AgentPlanStepBlockedEvent)
    onPlanStepBlocked(event: AgentPlanStepBlockedEvent): void {
        this.publish('step_blocked', {
            sessionId: event.sessionId,
            planId: event.planId,
            stepId: event.stepId,
            sequence: event.sequence,
            reason: event.reason
        });
        this.capture('step_blocked', {
            id: `step-${event.planId}-${event.stepId}-${event.sessionId}-${Date.now()}-b`,
            type: 'step_blocked',
            sessionId: event.sessionId,
            timestamp: Date.now(),
            planId: event.planId,
            stepId: event.stepId,
            sequence: event.sequence,
            detail: event.reason
        });
    }

    @OnEvent(AgentPlanStepCompletedEvent)
    onPlanStepCompleted(event: AgentPlanStepCompletedEvent): void {
        this.publish('step_completed', {
            sessionId: event.sessionId,
            planId: event.planId,
            stepId: event.stepId,
            sequence: event.sequence,
            status: event.status
        });
        this.capture('step_completed', {
            id: `step-${event.planId}-${event.stepId}-${event.sessionId}-${Date.now()}-c`,
            type: 'step_completed',
            sessionId: event.sessionId,
            timestamp: Date.now(),
            planId: event.planId,
            stepId: event.stepId,
            sequence: event.sequence,
            status: event.status
        });
    }

    @OnEvent(AgentPlanCompletedEvent)
    onPlanCompleted(event: AgentPlanCompletedEvent): void {
        this.publish('plan_completed', {
            sessionId: event.sessionId,
            planId: event.planId,
            sequence: event.sequence,
            summary: event.summary
        });
        this.capture('plan_completed', {
            id: `plan-${event.planId}-${event.sessionId}-${Date.now()}-c`,
            type: 'plan_completed',
            sessionId: event.sessionId,
            timestamp: Date.now(),
            planId: event.planId,
            sequence: event.sequence,
            detail: event.planId
        });
    }

    @OnEvent(AgentApprovalRequestedEvent)
    onApprovalRequested(event: AgentApprovalRequestedEvent): void {
        this.publish('approval_requested', {
            sessionId: event.request.sessionId,
            request: {
                id: event.request.id,
                toolName: event.request.toolName,
                sessionId: event.request.sessionId,
                reason: event.request.reason,
                summary: event.request.summary,
                hasInput: event.request.hasInput,
                inputSummary: event.request.inputSummary,
                timeoutMs: event.request.timeoutMs
            }
        });
    }

    @OnEvent(AgentApprovalCompletedEvent)
    onApprovalCompleted(event: AgentApprovalCompletedEvent): void {
        this.publish('approval_completed', {
            sessionId: event.request.sessionId,
            request: {
                id: event.request.id,
                toolName: event.request.toolName,
                sessionId: event.request.sessionId
            },
            approved: event.approved
        });
    }

    @OnEvent(AgentApprovalFailedEvent)
    onApprovalFailed(event: AgentApprovalFailedEvent): void {
        this.publish('approval_failed', {
            sessionId: event.request.sessionId,
            request: {
                id: event.request.id,
                toolName: event.request.toolName,
                sessionId: event.request.sessionId
            },
            error: event.error.message
        });
    }

    @OnEvent(AgentErrorEvent)
    onError(event: AgentErrorEvent): void {
        this.publish('error', {
            sessionId: event.sessionId,
            error: event.error.message
        });
    }

    @OnEvent(AgentCompensationEvent)
    onCompensation(event: AgentCompensationEvent): void {
        this.publish('compensation', {
            sessionId: event.sessionId,
            reason: event.reason,
            compensated: event.compensated,
            toolCallIds: event.toolCallIds
        });
    }

    @OnEvent(AgentContextPreparedEvent)
    onContextPrepared(event: AgentContextPreparedEvent): void {
        this.publish('context_prepared', {
            sessionId: event.sessionId,
            report: event.report
        });
    }

    @OnEvent(AgentTurnDiagnosticsEvent)
    onTurnDiagnostics(event: AgentTurnDiagnosticsEvent): void {
        this.publish('turn_diagnostics', {
            sessionId: event.sessionId,
            diagnostics: event.diagnostics
        });
    }

    @OnEvent(AgentBackgroundTaskStartedEvent)
    onBackgroundTaskStarted(event: AgentBackgroundTaskStartedEvent): void {
        this.publish('background_task_started', {
            sessionId: event.sessionId,
            taskId: event.taskId,
            goal: event.goal
        });
    }

    @OnEvent(AgentBackgroundTaskCompletedEvent)
    onBackgroundTaskCompleted(event: AgentBackgroundTaskCompletedEvent): void {
        this.publish('background_task_completed', {
            sessionId: event.sessionId,
            taskId: event.taskId,
            summary: event.summary
        });
    }

    @OnEvent(AgentBackgroundTaskFailedEvent)
    onBackgroundTaskFailed(event: AgentBackgroundTaskFailedEvent): void {
        this.publish('background_task_failed', {
            sessionId: event.sessionId,
            taskId: event.taskId,
            error: event.error.message
        });
    }

    /** Broadcast an event to connected SSE clients for one session */
    broadcast(sessionId: string, event: string, data: any): void {
        const payload = `event: ${event}\ndata: ${this.safeStringify(data)}\n\n`;
        const clients = this.clients.get(sessionId);
        if (!clients?.size) {
            return;
        }
        const dead: http.ServerResponse[] = [];
        for (const client of clients) {
            try {
                client.write(payload);
            } catch {
                dead.push(client);
            }
        }
        dead.forEach(client => clients.delete(client));
        if (!clients.size) {
            this.clients.delete(sessionId);
        }
    }

    subscribe(sessionId: string, listener: (record: GatewayEventRecord) => void): () => void {
        const listeners = this.listeners.get(sessionId) ?? new Set<(record: GatewayEventRecord) => void>();
        listeners.add(listener);
        this.listeners.set(sessionId, listeners);
        return () => {
            const current = this.listeners.get(sessionId);
            if (!current) {
                return;
            }
            current.delete(listener);
            if (!current.size) {
                this.listeners.delete(sessionId);
            }
        };
    }

    private publish(type: string, data: any): void {
        const record: GatewayEventRecord = {
            id: `${Date.now()}-${Math.random()}`,
            type,
            sessionId: data?.sessionId,
            timestamp: Date.now(),
            data: this.normalizeValue(data)
        };
        this.history.push(record);
        if (this.history.length > MAX_EVENT_HISTORY) {
            this.history = this.history.slice(-MAX_EVENT_HISTORY);
        }
        if (record.sessionId) {
            this.broadcast(record.sessionId, type, record);
            this.listeners.get(record.sessionId)?.forEach(listener => {
                try {
                    listener(record);
                } catch {
                    return;
                }
            });
        }
    }

    private summarizeValue(value: any): any {
        if (value == null) {
            return value;
        }
        if (typeof value === 'string') {
            return value.length > 200 ? value.slice(0, 200) + '...[truncated]' : value;
        }
        if (Array.isArray(value)) {
            return { type: 'array', length: value.length };
        }
        if (typeof value === 'object') {
            return { type: 'object', keys: Object.keys(value).slice(0, 10) };
        }
        return value;
    }

    private normalizeValue(value: any): any {
        try {
            return JSON.parse(this.safeStringify(value));
        } catch {
            return { value: '[unserializable]' };
        }
    }

    private safeStringify(value: any): string {
        const seen = new WeakSet<object>();
        return JSON.stringify(value, (_key, current) => {
            if (typeof current === 'bigint') {
                return current.toString();
            }
            if (current && typeof current === 'object') {
                if (seen.has(current)) {
                    return '[circular]';
                }
                seen.add(current);
            }
            return current;
        });
    }

    getRoutes(): GatewayRoute[] {
        const historyHandler: RouteHandler = async (req, res) => {
            const host = req.headers?.host ?? 'localhost';
            const url = new URL(req.url ?? '/api/events/history', `http://${host}`);
            const sessionId = url.searchParams.get('sessionId');
            if (!sessionId) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify({ error: 'sessionId required' }));
                return;
            }
            if (!await this.ensureAccess(req, res, sessionId)) {
                return;
            }
            const events = this.history.filter(event => event.sessionId === sessionId);
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ events }));
        };

        return [
            { method: 'GET', path: '/api/events', handler: this.sseHandler },
            { method: 'GET', path: '/api/events/history', handler: historyHandler }
        ];
    }

    getHistory(sessionId: string): { events: GatewayEventRecord[]; } {
        return {
            events: this.history.filter(event => event.sessionId === sessionId)
        };
    }

    private async ensureAccess(req: http.IncomingMessage, res: http.ServerResponse, sessionId: string): Promise<boolean> {
        const principalId = getRequestPrincipalId(req);
        if (await this.owners.isAuthorized(sessionId, principalId)) {
            return true;
        }
        res.writeHead(403, { 'Content-Type': 'application/json' })
            .end(JSON.stringify({ error: 'forbidden' }));
        return false;
    }
}
