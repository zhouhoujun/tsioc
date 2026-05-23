import { RequestContext, Incoming, Outgoing, ReadableLike, WritableLike } from '@tsdi/common';
import { Abstract } from '@tsdi/ioc';

/**
 * Abstract request context for service side.
 * Mirrors the original from deprecated @tsdi/endpoints.
 * Full implementation lives at packages/services/endpoints/src/AbstractRequestContext.ts
 * and will be merged here when packages/services/* is deleted.
 */
@Abstract()
export abstract class AbstractRequestContext<
    TRequest extends ReadableLike<Incoming> = ReadableLike<Incoming>,
    TResponse extends WritableLike<Outgoing> = WritableLike<Outgoing>,
    TStatus = any
> extends RequestContext {
    abstract get request(): TRequest;
    abstract get response(): TResponse;
    abstract get status(): TStatus;
    abstract set status(value: TStatus);
    abstract get isHandled(): boolean;
    abstract get isCommitted(): boolean;
    abstract handle(): Promise<void>;
    abstract commit(): void;
    abstract destroy(): Promise<void>;

    // Header helpers — used by security interceptors
    abstract getHeader(name: string): string | undefined;
    abstract setHeader(name: string, value: string | string[]): void;
    abstract removeHeader(name: string): void;

    // Query params — used by security (jwt, oauth, oauth2)
    abstract get query(): Record<string, any>;
}
