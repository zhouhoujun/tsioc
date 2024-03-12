import { Abstract, EMPTY, Injector, OperationArgumentResolver, isDefined } from '@tsdi/ioc';
import { HandlerContext, MODEL_RESOLVERS, createPayloadResolver } from '@tsdi/core';
import { HeaderRecord, TransportRequest } from '@tsdi/common';
import { MessageExecption, StreamAdapter, TransportSession, ResponsePacket } from '@tsdi/common/transport';
import { ServerOpts } from './Server';

/**
 * abstract request context.
 * 
 * 传输节点上下文
 */
@Abstract()
export abstract class RequestContext<TRequest = any, TResponse = any, TSocket = any> extends HandlerContext<TRequest> {

    protected override playloadDefaultResolvers(): OperationArgumentResolver[] {
        return [...primitiveResolvers, ...this.injector.get(MODEL_RESOLVERS, EMPTY)];
    }

    abstract get serverOptions(): ServerOpts;

    /**
     * transport session
     */
    abstract get session(): TransportSession<TSocket>;

    /**
     * stream adapter
     */
    abstract get streamAdapter(): StreamAdapter;

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
     * request query parameters.
     */
    abstract get query(): Record<string, string | string[] | number | any>;

    /**
     * The request method.
     */
    abstract get method(): string;

    /**
     * Return request header.
     *
     * The `Referrer` header field is special-cased,
     * both `Referrer` and `Referer` are interchangeable.
     *
     * Examples:
     *
     *     this.get('Content-Type');
     *     // => "text/plain"
     *
     *     this.get('content-type');
     *     // => "text/plain"
     *
     *     this.get('Something');
     *     // => ''
     *
     * @param {String} field
     * @return {String}
     * @api public
     */
    abstract getHeader(field: string): string | string[] | undefined;

    /**
     * has response header field or not.
     * @param field 
     */
    abstract hasHeader(field: string): boolean;

    /**
     * Set response header `field` to `val` or pass
     * an object of header fields.
     *
     * Examples:
     *
     *    this.set('Foo', ['bar', 'baz']);
     *    this.set('Accept', 'application/json');
     *    this.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
     *
     * @param {String|Object|Array} field
     * @param {String} val
     * @api public
     */
    abstract setHeader(field: string, val: string | number | string[]): void;
    /**
     * Set response header `field` to `val` or pass
     * an object of header fields.
     *
     * Examples:
     *
     *    this.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
     *
     * @param {Record<string, string | number | string[]>} fields
     * @param {String} val
     * @api public
     */
    abstract setHeader(fields: Record<string, string | number | string[]>): void;

    /**
    * Remove response header `field`.
    *
    * @param {String} name
    * @api public
    */
    abstract removeHeader(field: string): void;

    /**
     * Remove all response headers
     *
     * @api public
     */
    abstract removeHeaders(): void;

    /**
     * set response with response packet
     * @param headers 
     */
    abstract setResponse(packet: ResponsePacket): void;

    /**
     * send response to client.
     */
    abstract respond(): Promise<any>;

    /**
     * throw execption to client.
     * @param execption 
     */
    abstract throwExecption(execption: MessageExecption): Promise<void>;

}


/**
 * transport context factory.
 */
@Abstract()
export abstract class TransportContextFactory {
    /**
     * create transport context.
     * @param injector 
     * @param session 
     * @param request 
     * @param response 
     * @param options 
     */
    abstract create<TSocket, TInput extends TransportRequest, TOutput extends ResponsePacket>(injector: Injector, session: TransportSession, request: TInput, response: TOutput, options?: ServerOpts): RequestContext<TInput, TOutput, TSocket>
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
