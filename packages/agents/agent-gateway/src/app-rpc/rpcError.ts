import { asModelFailure } from '@tsdi/agent';
import { AppRpcError } from '../contracts/AppRpc';

/**
 * `data.modelFailure` must survive the JSON-RPC hop: the console renders
 * actionable quota/auth wording from it, and `instanceof` no longer works here.
 */
export function toAppRpcError(error: any): AppRpcError {
    const failure = asModelFailure(error);
    const data: { modelFailure?: unknown; stack?: string; cause?: string } = {};
    if (failure) {
        data.modelFailure = failure;
    }
    const stack = collectErrorStacks(error);
    if (stack) {
        data.stack = stack;
    }
    return new AppRpcError(
        -32603,
        error?.message ?? 'Internal error',
        Object.keys(data).length > 0 ? data : undefined
    );
}

/** `stack` is dropped by JSON serialization, so it is flattened to a string here. */
function collectErrorStacks(error: any, depth = 0): string | undefined {
    if (!error || depth > 5) {
        return undefined;
    }
    const parts: string[] = [];
    const current = typeof error.stack === 'string' ? error.stack.trim() : '';
    if (current) {
        parts.push(current);
    }
    const cause = collectErrorStacks(error.cause, depth + 1);
    if (cause && cause !== current) {
        parts.push(`Caused by: ${cause}`);
    }
    return parts.length > 0 ? parts.join('\n') : undefined;
}
