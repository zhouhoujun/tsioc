import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { randomUUID } from 'crypto';
import { ApplicationContext } from '@tsdi/core';
import { ToolRegistry } from '../tools/ToolRegistry';
import { AgentToolDefinition } from '../tools/AgentTool';
import { ToolSchemaValidator } from './ToolSchemaValidator';
import { RateLimitManager } from './RateLimitManager';
import { OutputGuard } from './OutputGuard';
import { AgentToolExecutionReceipt, AgentToolFailedEvent, AgentToolCompletedEvent } from '../runtime/AgentEvents';
import { AuditSink, AgentAuditRecord } from './AuditSink';
import { SandboxExecutor, SandboxPolicy, defaultSandboxPolicy } from './SandboxExecutor';

export interface ToolExecutionRequest {
    sessionId: string;
    principalId?: string;
    workspace?: string;
    toolCall: { id: string; name: string; input?: any };
    definition: AgentToolDefinition;
    executionMode: 'sequential' | 'parallel';
    inputSummary?: string;
    baseReceipt?: AgentToolExecutionReceipt;
}

export interface ToolExecutionOutcome {
    output?: unknown;
    redactedOutput?: unknown;
    receipt: AgentToolExecutionReceipt;
    error?: Error;
    attempts: number;
}

@Injectable()
export class ToolExecutionCoordinator {
    constructor(
        private toolRegistry: ToolRegistry,
        private validator: ToolSchemaValidator,
        private rateLimitManager: RateLimitManager,
        private outputGuard: OutputGuard,
        @Inject(ApplicationContext) private app: ApplicationContext,
        @Optional() private auditSink?: AuditSink,
        @Optional() private sandboxExecutor?: SandboxExecutor
    ) {
    }

    async execute(request: ToolExecutionRequest): Promise<ToolExecutionOutcome> {
        const baseReceipt: AgentToolExecutionReceipt = request.baseReceipt ?? {
            receiptId: randomUUID(),
            toolCallId: request.toolCall.id,
            toolName: request.toolCall.name,
            executionMode: request.executionMode,
            status: 'running',
            inputSummary: request.inputSummary,
            attemptCount: 0
        };
        const definition = request.definition;
        const policy = definition.execution;
        const retryPolicy = policy?.retryPolicy;
        const maxRetries = Math.max(retryPolicy?.maxRetries ?? 0, 0);
        const delayMs = Math.max(retryPolicy?.delayMs ?? 0, 0);
        const backoffMultiplier = retryPolicy?.backoffMultiplier ?? 1;

        let lastError: Error | undefined;
        for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
            const startedAt = Date.now();
            try {
                this.validator.validateOrThrow(definition.inputSchema, request.toolCall.input, `Tool "${definition.name}" input`);
                this.ensureAuthorized(definition, request.principalId);
                this.rateLimitManager.checkToolLimitOrThrow(definition.name, request.sessionId, policy?.rateLimit);
                const rawOutput = await this.invokeWithTimeout(request, policy?.timeoutMs);
                this.validator.validateOrThrow(definition.outputSchema, rawOutput, `Tool "${definition.name}" output`);
                const redactedOutput = this.outputGuard.redact(rawOutput, policy?.redactOutput !== false);
                const completedReceipt: AgentToolExecutionReceipt = {
                    ...baseReceipt,
                    status: 'success',
                    durationMs: Math.max(0, Date.now() - startedAt),
                    outputSummary: this.summarize(definition.name, redactedOutput),
                    attemptCount: attempt
                };
                await this.publishAudit({
                    id: completedReceipt.receiptId,
                    sessionId: request.sessionId,
                    principalId: request.principalId,
                    toolName: definition.name,
                    toolCallId: request.toolCall.id,
                    status: 'success',
                    inputSummary: request.inputSummary,
                    outputSummary: completedReceipt.outputSummary,
                    durationMs: completedReceipt.durationMs,
                    attemptCount: attempt,
                    createdAt: Date.now(),
                    metadata: { executionMode: request.executionMode }
                });
                await this.app.publishEvent(new AgentToolCompletedEvent(this, request.sessionId, definition.name, redactedOutput, completedReceipt));
                return {
                    output: rawOutput,
                    redactedOutput,
                    receipt: completedReceipt,
                    attempts: attempt
                };
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                const shouldRetry = attempt <= maxRetries && this.isRetryable(lastError);
                if (shouldRetry) {
                    await this.sleep(delayMs * Math.max(1, Math.pow(backoffMultiplier, attempt - 1)));
                    continue;
                }
                const failedReceipt: AgentToolExecutionReceipt = {
                    ...baseReceipt,
                    status: 'error',
                    durationMs: Math.max(0, Date.now() - startedAt),
                    error: lastError.message,
                    attemptCount: attempt
                };
                await this.publishAudit({
                    id: failedReceipt.receiptId,
                    sessionId: request.sessionId,
                    principalId: request.principalId,
                    toolName: definition.name,
                    toolCallId: request.toolCall.id,
                    status: 'error',
                    inputSummary: request.inputSummary,
                    error: lastError.message,
                    durationMs: failedReceipt.durationMs,
                    attemptCount: attempt,
                    createdAt: Date.now(),
                    metadata: { executionMode: request.executionMode }
                });
                await this.app.publishEvent(new AgentToolFailedEvent(this, request.sessionId, definition.name, lastError, failedReceipt));
                return {
                    receipt: failedReceipt,
                    error: lastError,
                    attempts: attempt
                };
            }
        }

        const fallbackError = lastError ?? new Error(`Tool "${definition.name}" failed.`);
        return {
            receipt: {
                ...baseReceipt,
                status: 'error',
                error: fallbackError.message,
                attemptCount: maxRetries + 1
            },
            error: fallbackError,
            attempts: maxRetries + 1
        };
    }

    private async invokeWithTimeout(request: ToolExecutionRequest, timeoutMs?: number): Promise<unknown> {
        const sandboxPolicy = this.resolveSandboxPolicy(request);
        if (sandboxPolicy?.enabled && this.sandboxExecutor?.isSupported()) {
            return this.invokeInSandbox(request, sandboxPolicy, timeoutMs);
        }

        const invokePromise = this.toolRegistry.invoke(
            request.toolCall.name,
            request.toolCall.input,
            request.sessionId,
            request.principalId,
            request.workspace
        );
        if (!timeoutMs || timeoutMs <= 0) {
            return invokePromise;
        }
        return Promise.race([
            invokePromise,
            new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`Tool "${request.toolCall.name}" timed out after ${timeoutMs}ms.`)), timeoutMs);
            })
        ]);
    }

    private resolveSandboxPolicy(request: ToolExecutionRequest): SandboxPolicy | null {
        const executionPolicy = request.definition.execution;
        if (!executionPolicy) {
            return null;
        }
        if (executionPolicy.sandbox) {
            return executionPolicy.sandbox;
        }
        if (executionPolicy.isolationLevel) {
            return {
                enabled: true,
                isolationLevel: executionPolicy.isolationLevel,
                resourceLimits: executionPolicy.resourceLimits,
                workingDirectory: request.workspace
            };
        }
        return null;
    }

    private async invokeInSandbox(
        request: ToolExecutionRequest,
        policy: SandboxPolicy,
        timeoutMs?: number
    ): Promise<unknown> {
        const invokePromise = this.toolRegistry.invoke(
            request.toolCall.name,
            request.toolCall.input,
            request.sessionId,
            request.principalId,
            request.workspace
        );
        if (!timeoutMs || timeoutMs <= 0) {
            return invokePromise;
        }
        return Promise.race([
            invokePromise,
            new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`Tool "${request.toolCall.name}" timed out after ${timeoutMs}ms.`)), timeoutMs);
            })
        ]);
    }

    private isRetryable(error: Error): boolean {
        const message = error.message.toLowerCase();
        return !message.includes('validation failed')
            && !message.includes('rate limit exceeded')
            && !message.includes('authorization failed');
    }

    private ensureAuthorized(definition: AgentToolDefinition, principalId?: string): void {
        const policy = definition.execution?.authorization;
        if (!policy) {
            return;
        }
        if (!principalId) {
            if (policy.allowAnonymous || policy.allowLocalAnonymous) {
                return;
            }
            throw new Error(`Tool "${definition.name}" authorization failed: principal is required.`);
        }
        if (policy.allowLocalAnonymous && principalId === 'gateway-local') {
            return;
        }
        if (policy.requiredPrincipals?.length && !policy.requiredPrincipals.includes(principalId)) {
            throw new Error(`Tool "${definition.name}" authorization failed for principal "${principalId}".`);
        }
    }

    private summarize(toolName: string, value: unknown): string | undefined {
        if (value === undefined) {
            return undefined;
        }
        if (toolName === 'read_file' && value && typeof value === 'object' && !Array.isArray(value)) {
            const payload = value as Record<string, any>;
            return JSON.stringify({
                path: payload.path,
                truncated: payload.truncated === true
            });
        }
        try {
            const text = typeof value === 'string' ? value : JSON.stringify(value);
            return text.length > 200 ? `${text.slice(0, 200)}...[truncated]` : text;
        } catch {
            return '[unserializable]';
        }
    }

    private async publishAudit(record: AgentAuditRecord): Promise<void> {
        if (!this.auditSink) {
            return;
        }
        try {
            await this.auditSink.append(record);
        } catch {
            return;
        }
    }

    private async sleep(delayMs: number): Promise<void> {
        if (delayMs <= 0) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }
}
