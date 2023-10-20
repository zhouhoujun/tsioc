import { Abstract, EMPTY, Execption, Injector, OperationArgumentResolver, isDefined } from '@tsdi/ioc';
import { EndpointContext, MODEL_RESOLVERS, createPayloadResolver } from '@tsdi/core';
import { RequestPacket, ResponsePacket } from '@tsdi/common';
import { ServerOpts } from './Server';

/**
 * abstract transport context.
 * 
 * 传输节点上下文
 */
@Abstract()
export abstract class TransportContext<TRequest = any, TResponse = any, TSocket = any> extends EndpointContext<TRequest> {

    protected override playloadDefaultResolvers(): OperationArgumentResolver[] {
        return [...primitiveResolvers, ...this.injector.get(MODEL_RESOLVERS, EMPTY)];
    }

    /**
     * transport response.
     */
    abstract get request(): TRequest;

    /**
     * transport response.
     */
    abstract get response(): TResponse;
    /**
     * transport response.
     */
    abstract set response(val: TResponse);

    /**
     * Set Content-Length field to `n`.
     *
     * @param {Number} n
     * @api public
     */
    abstract set length(n: number | undefined);
    /**
     * Return parsed response Content-Length when present.
     *
     * @return {Number}
     * @api public
     */
    abstract get length(): number | undefined;

    /**
     * The request body, or `null` if one isn't set.
     *
     * Bodies are not enforced to be immutable, as they can include a reference to any
     * user-defined data type. However, middlewares should take care to preserve
     * idempotence by treating them as such.
     */
    abstract get body(): any;
    /**
     * Set response body.
     *
     * @param {any} value
     * @api public
     */
    abstract set body(value: any);

    /**
     * Get request rul
     */
    abstract get url(): string;
    /**
     * Set request url
     */
    abstract set url(value: string);

    /**
     * original url
     */
    abstract get originalUrl(): string;

    /**
     * The request method.
     */
    abstract get method(): string;

    /**
     * socket.
     */
    abstract get socket(): TSocket;

}


export const TRANSPORT_CONTEXT_IMPL = {
    create<TSocket, TInput extends RequestPacket, TOutput extends ResponsePacket>(injector: Injector, socket: TSocket, request: TInput, response: TOutput, options?: ServerOpts): TransportContext<TInput, TOutput, TSocket> {
        throw new Execption('not implemented.')
    }
}

/**
 * create transport context
 * @param injector 
 * @param options 
 * @returns 
 */
export function createTransportContext<TSocket, TInput extends RequestPacket, TOutput extends ResponsePacket>(injector: Injector, socket: TSocket, request: TInput, response: TOutput, options?: ServerOpts): TransportContext<TInput, TOutput, TSocket> {
    return TRANSPORT_CONTEXT_IMPL.create(injector, socket, request, response, options)
}

export function getScopeValue(payload: any, scope: string) {
    return payload[scope] ?? (scope == 'body' ? payload['payload'] : undefined);
}

const primitiveResolvers = createPayloadResolver(
    (ctx, scope, field) => {
        let data = ctx.args;

        if (field && !scope) {
            scope = 'query'
        }
        if (scope) {
            data = getScopeValue(data, scope);
            if (field) {
                data = isDefined(data) ? data[field] : null;
            }
        }
        return data;
    },
    (param, payload) => payload && isDefined(getScopeValue(payload, param.scope ?? 'query')));


/**
 * throw able.
 */
export interface Throwable {
    /**
     * create error instance of {@link TransportError}.
     * @param status transport status
     * @param messages transport messages.
     * @returns instance of {@link TransportError}
     */
    throwError(status: number, message?: string): Error;
    /**
     * create error instance of {@link TransportError}.
     * @param status transport status
     * @param messages transport messages.
     * @returns instance of {@link TransportError}
     */
    throwError(message: string): Error;
    /**
     * create error instance of {@link TransportError}.
     * @param error error 
     * @returns instance of {@link TransportError}
     */
    throwError(error: Error): Error;
}
