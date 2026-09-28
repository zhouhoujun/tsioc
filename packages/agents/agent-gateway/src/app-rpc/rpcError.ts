import { asModelFailure } from '@tsdi/agent';
import { AppRpcError } from '../contracts/AppRpc';

/**
 * `data.modelFailure` must survive the JSON-RPC hop: the console renders
 * actionable quota/auth wording from it, and `instanceof` no longer works here.
 */
export function toAppRpcError(error: any): AppRpcError {
    const failure = asModelFailure(error);
    return new AppRpcError(
        -32603,
        error?.message ?? 'Internal error',
        failure ? { modelFailure: failure } : undefined
    );
}
