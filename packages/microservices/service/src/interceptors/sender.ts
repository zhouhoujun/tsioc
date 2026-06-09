import { RequestFilter, RequestContext } from '@tsdi/common';

/**
 * Abstract filter for transporting send.
 * Each transport (http, mcp, grpc) provides its own implementation
 * that writes the adapter state (status, headers, body) to the
 * native response object and handles error serialization.
 */
export abstract class SenderFilter<
    TInput = any,
    TOutput = any,
    TContext extends RequestContext = RequestContext
> extends RequestFilter<TInput, TOutput, TContext> {
}
