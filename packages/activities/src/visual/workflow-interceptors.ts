import { Interceptor } from '@tsdi/core';
import { ActivityResult } from '../activities/Activity';
import { VisualNodeExecutionInput } from './visual-node-handler';

export interface WorkflowRetryOptions {
    /** Number of retries after the first attempt. */
    retries?: number;
    /** Base delay between attempts. */
    delayMs?: number;
    /** Multiplier applied to the delay after each failure. */
    backoff?: number;
    /** Only retry matching nodes. */
    filter?: (input: VisualNodeExecutionInput) => boolean;
    /** Decide whether a failed result is retryable. */
    shouldRetry?: (
        result: ActivityResult | undefined,
        error: Error | undefined,
        input: VisualNodeExecutionInput,
        attempt: number
    ) => boolean;
}

function delay(ms: number): Promise<void> {
    if (!(ms > 0)) {
        return Promise.resolve();
    }
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Reusable core interceptor: retries a generated node execution.
 *
 * The path interceptor wraps this one, so retries are included in the node's
 * total duration and emit a single start/end pair.
 */
export class WorkflowRetryInterceptor implements Interceptor<VisualNodeExecutionInput, any> {
    constructor(protected readonly options: WorkflowRetryOptions = {}) { }

    intercept(input: VisualNodeExecutionInput, next: any, context: any): Promise<ActivityResult> {
        if (this.options.filter && !this.options.filter(input)) {
            return Promise.resolve(next.handle(input, context));
        }
        const retries = Math.max(0, Number(this.options.retries ?? 1) || 0);
        const baseDelay = Math.max(0, Number(this.options.delayMs ?? 0) || 0);
        const backoff = Number(this.options.backoff ?? 1) > 0 ? Number(this.options.backoff ?? 1) : 1;
        const shouldRetry = this.options.shouldRetry || ((result: ActivityResult | undefined, error?: Error) =>
            error ? true : result?.success === false);

        const attempt = async (index: number): Promise<ActivityResult> => {
            try {
                const result = await next.handle(input, context);
                if (index >= retries || !shouldRetry(result, undefined, input, index)) {
                    return result;
                }
            } catch (error) {
                if (index >= retries || !shouldRetry(undefined, error as Error, input, index)) {
                    throw error;
                }
            }
            await delay(baseDelay * Math.pow(backoff, index));
            return attempt(index + 1);
        };
        return attempt(0);
    }
}

/**
 * Applies node-level execution policy from `node.config`:
 *   - `retry`: number of retries
 *   - `retryDelay`: base delay between attempts
 *   - `timeout`: per-attempt timeout in milliseconds
 *
 * Values are 0/unset by default, so existing workflows keep their behavior.
 */
export class WorkflowNodePolicyInterceptor implements Interceptor<VisualNodeExecutionInput, any> {
    intercept(input: VisualNodeExecutionInput, next: any, context: any): Promise<ActivityResult> {
        const config = input.node.config || {};
        const retries = Math.max(0, Math.min(20, Number(config.retry ?? config.retries) || 0));
        const retryDelay = Math.max(0, Number(config.retryDelay) || 0);
        const timeoutMs = Math.max(0, Number(config.timeout) || 0);
        if (!retries && !timeoutMs) {
            return Promise.resolve(next.handle(input, context));
        }

        let handler: { handle: (value: VisualNodeExecutionInput, ctx?: any) => any } = {
            handle: (value, ctx) => next.handle(value, ctx)
        };
        if (timeoutMs > 0) {
            const timeout = new WorkflowTimeoutInterceptor({ timeoutMs });
            const inner = handler;
            handler = {
                handle: (value, ctx) => timeout.intercept(value, inner, ctx)
            };
        }
        if (retries > 0) {
            const retry = new WorkflowRetryInterceptor({ retries, delayMs: retryDelay });
            const inner = handler;
            handler = {
                handle: (value, ctx) => retry.intercept(value, inner, ctx)
            };
        }
        return Promise.resolve(handler.handle(input, context));
    }
}

export interface WorkflowTimeoutOptions {
    timeoutMs: number;
    filter?: (input: VisualNodeExecutionInput) => boolean;
    message?: string;
}

/**
 * Reusable core interceptor: fails a node that exceeds its time budget.
 */
export class WorkflowTimeoutInterceptor implements Interceptor<VisualNodeExecutionInput, any> {
    constructor(protected readonly options: WorkflowTimeoutOptions) { }

    intercept(input: VisualNodeExecutionInput, next: any, context: any): Promise<ActivityResult> {
        if (this.options.filter && !this.options.filter(input)) {
            return Promise.resolve(next.handle(input, context));
        }
        const timeoutMs = Math.max(1, Number(this.options.timeoutMs) || 1);
        return new Promise<ActivityResult>(resolve => {
            let settled = false;
            const timer = setTimeout(() => {
                if (settled) {
                    return;
                }
                settled = true;
                resolve({
                    success: false,
                    error: new Error(
                        this.options.message
                        || `Node ${input.node.id} timed out after ${timeoutMs}ms`
                    ),
                    data: { nodeId: input.node.id, timeoutMs }
                });
            }, timeoutMs);
            Promise.resolve(next.handle(input, context)).then(
                result => {
                    if (settled) {
                        return;
                    }
                    settled = true;
                    clearTimeout(timer);
                    resolve(result);
                },
                error => {
                    if (settled) {
                        return;
                    }
                    settled = true;
                    clearTimeout(timer);
                    resolve({
                        success: false,
                        error: error as Error,
                        data: { nodeId: input.node.id }
                    });
                }
            );
        });
    }
}
