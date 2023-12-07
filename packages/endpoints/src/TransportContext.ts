import { Abstract, EMPTY, Injector, OperationArgumentResolver, isDefined } from '@tsdi/ioc';
import { EndpointContext, MODEL_RESOLVERS, createPayloadResolver } from '@tsdi/core';
import { IncomingPacket, MessageExecption, OutgoingHeader, OutgoingHeaders, ResponsePacket, StatusCode, StreamAdapter } from '@tsdi/common';
import { ServerOpts } from './Server';
import { ServerTransportSession } from './transport/session';

/**
 * abstract transport context.
 * 
 * 传输节点上下文
 */
@Abstract()
export abstract class TransportContext<TRequest = any, TResponse = any, TSocket = any, TServOpts extends ServerOpts = ServerOpts> extends EndpointContext<TRequest> {

    protected override playloadDefaultResolvers(): OperationArgumentResolver[] {
        return [...primitiveResolvers, ...this.injector.get(MODEL_RESOLVERS, EMPTY)];
    }

    abstract get serverOptions(): TServOpts;

    /**
     * transport session
     */
    abstract get session(): ServerTransportSession<TSocket>;

    /**
     * stream adapter
     */
    abstract get streamAdapter(): StreamAdapter;

    /**
     * transport request.
     */
    abstract get request(): TRequest;

    /**
     * Get transport response.
     */
    abstract get response(): TResponse;
    /**
     * Set transport response.
     */
    abstract set response(val: TResponse);

    /**
     * Get response status.
     */
    abstract get status(): StatusCode;
    /**
     * Set response status, defaults to OK.
     */
    abstract set status(status: StatusCode);

    /**
     * Get response status message.
     */
    abstract get statusMessage(): string;
    /**
     * Set response status message.
     */
    abstract set statusMessage(message: string);

    /**
     * Set response content length.
     *
     * @param {Number} n
     * @api public
     */
    abstract set length(n: number | undefined);
    /**
     * Get response content length
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
     * Whether the status code is ok
     */
    abstract get ok(): boolean;
    /**
     * Whether the status code is ok
     */
    abstract set ok(ok: boolean);

    /**
     * has sent or not.
     */
    abstract get sent(): boolean;

    rawBody?: Buffer | null;

    /**
     * Get request rul
     */
    abstract get url(): string;
    /**
     * Set request url
     */
    abstract set url(value: string);

    abstract getRequestFilePath(): string | null;

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

    // /**
    //  * is empty status or empty body.
    //  */
    // abstract isEmpty(): boolean;
    // /**
    //  * is head method
    //  */
    // abstract isHeadMethod(): boolean;

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
    abstract getHeader(field: string): string;

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
     *    this.setHeader('Foo', ['bar', 'baz']);
     *    this.setHeader('Accept', 'application/json');
     *    this.setHeader({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
     *
     * @param {String|Object|Array} field
     * @param {String} val
     * @api public
     */
    abstract setHeader(field: string, val: OutgoingHeader): void;
    /**
     * Set response header `field` to `val` or pass
     * an object of header fields.
     *
     * Examples:
     *
     *    this.setHeader({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
     *
     * @param {OutgoingHeaders} fields
     * @param {String} val
     * @api public
     */
    abstract setHeader(fields: OutgoingHeaders): void;
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
     * @param incoming 
     * @param options 
     */
    abstract create(injector: Injector, session: ServerTransportSession, incoming: IncomingPacket, options?: ServerOpts): TransportContext;
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
