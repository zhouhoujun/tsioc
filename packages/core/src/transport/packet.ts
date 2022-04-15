import { Abstract, Injector, InvocationContext, InvocationOption, isPromise, TARGET } from '@tsdi/ioc';
import { isObservable, lastValueFrom, Observable } from 'rxjs';


/**
 * request method.
 */
export type RequestMethod = 'HEAD' | 'OPTIONS' | 'GET' | 'DELETE' | 'PATCH' | 'POST' | 'PUT';

/**
 * mqtt protocol.
 */
export type MqttProtocol = 'mqtt' | 'mqtts' | 'tls' | 'ws' | 'wss' | 'wxs' | 'alis';
/**
 * http protocol.
 */
export type HttpProtocol = 'http' | 'https';
/**
 * transport protocol.
 */
export type Protocol = 'tcp' | 'grpc' | 'rmq' | 'kafka' | 'redis' | 'amqp' | 'ssl' | 'msg' | HttpProtocol | MqttProtocol;


export interface TransportOption extends InvocationOption {
    target?: any;
    request?: RequestBase;
    response?: ResponseBase
}

/**
 * transport context.
 */
@Abstract()
export abstract class TransportContext extends InvocationContext {

    get target(): any {
        return this.getValue(TARGET);
    }
    /**
     * transport request.
     */
    abstract request: RequestBase;
    /**
     * transport response.
     */
    abstract response: ResponseBase;

    static override create(parent: Injector | InvocationContext, options?: TransportOption): TransportContext {
        const ctx = InvocationContext.create(parent, options) as TransportContext;
        if (options?.target) {
            ctx.setValue(TARGET, options.target);
        }
        if (options?.request) {
            ctx.request = options.request;
        }
        if (options?.response) {
            ctx.response = options.response;
        }
        return ctx;
    }
}

/**
 * request package.
 */
@Abstract()
export abstract class RequestBase<T = any> {
    /**
     * packet id.
     */
    readonly id?: string;
    /**
     * Shared and mutable context that can be used by middlewares
     */
    abstract get context(): TransportContext;
    /**
     * Outgoing URL
     */
    abstract get url(): string;
    /**
     * Outgoing URL parameters.
     */
    abstract get params(): Record<string, string | string[] | number | any>;
    /**
     * The outgoing HTTP request method.
     */
    abstract get method(): string;
    /**
     * The request body, or `null` if one isn't set.
     *
     * Bodies are not enforced to be immutable, as they can include a reference to any
     * user-defined data type. However, middlewares should take care to preserve
     * idempotence by treating them as such.
     */
    abstract get body(): T | null;

    /**
     * is update modle resquest.
     */
    abstract isUpdate(): boolean;
}

/**
 * request headers.
 */
export interface RequestHeader<T = any> {
    /**
     * Get all response headers.
     */
    getHeaders(): T;
    /**
     * has header field or not.
     * @param field 
     */
    hasHeader(field: string): boolean;
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
    getHeader(field: string): string | string[] | number | undefined;
    /**
     * Set header `field` to `val` or pass
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
    setHeader(field: string, val: string | number | string[]): void;
    /**
     * Set header `field` to `val` or pass
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
    setHeader(fields: Record<string, string | number | string[]>): void;
    /**
     * Remove header `field`.
     *
     * @param {String} name
     * @api public
     */
    removeHeader(field: string): void;
}

/**
 * response base.
 */
@Abstract()
export abstract class ResponseBase<T = any> {
    /**
     * Get response status code.
     */
    abstract get status(): number;
    /**
     * Textual description of response status code, defaults to OK.
     *
     * Do not depend on this.
     */
    abstract get statusMessage(): string;
    /**
     * Whether the status code is ok
     */
    abstract get ok(): boolean;
    /**
     * Get response body.
     *
     * @return {T}
     * @api public
     */
    abstract get body(): T | null;
}

/**
 * response headers.
 */
export interface ResponseHeader<T = any> {
    /**
     * Get all response headers.
     */
    getHeaders(): T;

    /**
     * has header field or not.
     * @param field 
     */
    hasHeader(field: string): boolean;
    /**
     * Return response header.
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
    getHeader(field: string): string | string[] | number | undefined;
    /**
     * Set header `field` to `val` or pass
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
    setHeader(field: string, val: string | number | string[]): void;
    /**
     * Set header `field` to `val` or pass
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
    setHeader(fields: Record<string, string | number | string[]>): void;
    /**
     * Remove header `field`.
     *
     * @param {String} name
     * @api public
     */
    removeHeader(field: string): void;
}

/**
 * writable response.
 */
@Abstract()
export abstract class WritableResponse<T = any> extends ResponseBase<T> {
    /**
     * Shared and mutable context that can be used by middlewares
     */
    abstract get context(): TransportContext;
    /**
     * Set response status code, defaults to OK.
     */
    abstract set status(status: number);
    /**
     * Set Textual description of response status code, defaults to OK.
     *
     * Do not depend on this.
     */
    abstract set statusMessage(msg: string);
    /**
     * Whether the status code is ok
     */
    abstract set ok(ok: boolean);
    /**
     * Set response body.
     *
     * @param {T} value
     * @api public
     */
    abstract set body(value: T | null);
    /**
     * has sent or not.
     */
    abstract get sent(): boolean;
    /**
     * create error instance of {@link TransportError}.
     * @param status transport status
     * @param messages transport messages.
     * @returns instance of {@link TransportError}
     */
    abstract throwError(status: number, message?: string): Error;
    /**
     * create error instance of {@link TransportError}.
     * @param status transport status
     * @param messages transport messages.
     * @returns instance of {@link TransportError}
     */
    abstract throwError(message: string): Error;
    /**
     * create error instance of {@link TransportError}.
     * @param error error 
     * @returns instance of {@link TransportError}
     */
    abstract throwError(error: Error): Error;
}


@Abstract()
export abstract class Redirect {
    /**
     * Perform a 302 redirect to `url`.
     *
     * The string "back" is special-cased
     * to provide Referrer support, when Referrer
     * is not present `alt` or "/" is used.
     *
     * Examples:
     *
     *    this.redirect('back');
     *    this.redirect('back', '/index.html');
     *    this.redirect('/login');
     *    this.redirect('http://google.com');
     *
     * @param {String} url
     * @param {String} [alt]
     * @api public
     */
    abstract redirect(response: WritableResponse, url: string, alt?: string): void;
}

// /**
//  * writable response.
//  */
// @Abstract()
// export abstract class WritableResponse<T = any> extends HeaderResponse<T> {
//     /**
//      * Shared and mutable context that can be used by middlewares
//      */
//     abstract get context(): TransportContext;
//     /**
//      * Get response status code.
//      */
//     abstract get status(): number;
//     /**
//      * Set response status code, defaults to OK.
//      */
//     abstract set status(status: number);
//     /**
//      * Textual description of response status code, defaults to OK.
//      *
//      * Do not depend on this.
//      */
//     abstract get statusMessage(): string;
//     /**
//      * Set Textual description of response status code, defaults to OK.
//      *
//      * Do not depend on this.
//      */
//     abstract set statusMessage(msg: string);
//     /**
//      * Get Content-Type response header with `type` through `mime.lookup()`
//      * when it does not contain a charset.
//      */
//     abstract get contentType(): string;
//     /**
//      * Set Content-Type response header with `type` through `mime.lookup()`
//      * when it does not contain a charset.
//      */
//     abstract set contentType(type: string);
//     /**
//      * has sent or not.
//      */
//     abstract get sent(): boolean;
//     /**
//      * Whether the status code is ok
//      */
//     abstract get ok(): boolean;
//     /**
//      * Whether the status code is ok
//      */
//     abstract set ok(ok: boolean);

//     /**
//      * Get response body.
//      *
//      * @return {T}
//      * @api public
//      */
//     abstract get body(): T | null;
//     /**
//      * Set response body.
//      *
//      * @param {T} value
//      * @api public
//      */
//     abstract set body(value: T | null);

//     /**
//      * Set Content-Length field to `n`.
//      *
//      * @param {Number} n
//      * @api public
//      */
//     abstract set length(n: number | undefined);
//     /**
//      * Return parsed response Content-Length when present.
//      *
//      * @return {Number}
//      * @api public
//      */
//     abstract get length(): number | undefined;

//     /**
//      * Perform a 302 redirect to `url`.
//      *
//      * The string "back" is special-cased
//      * to provide Referrer support, when Referrer
//      * is not present `alt` or "/" is used.
//      *
//      * Examples:
//      *
//      *    this.redirect('back');
//      *    this.redirect('back', '/index.html');
//      *    this.redirect('/login');
//      *    this.redirect('http://google.com');
//      *
//      * @param {String} url
//      * @param {String} [alt]
//      * @api public
//      */
//     abstract redirect(url: string, alt?: string): void;

//     /**
//      * Set Content-Disposition header to "attachment" with optional `filename`.
//      *
//      * @param filname file name for download.
//      * @param options content disposition.
//      * @api public
//      */
//     abstract attachment(filename: string, options?: {
//         contentType?: string;
//         /**
//         * Specifies the disposition type.
//         * This can also be "inline", or any other value (all values except `inline` are treated like attachment,
//         * but can convey additional information if both parties agree to it).
//         * The `type` is normalized to lower-case.
//         * @default 'attachment'
//         */
//         type?: 'attachment' | 'inline' | string | undefined;
//         /**
//          * If the filename option is outside ISO-8859-1,
//          * then the file name is actually stored in a supplemental field for clients
//          * that support Unicode file names and a ISO-8859-1 version of the file name is automatically generated
//          * @default true
//          */
//         fallback?: string | boolean | undefined;
//     }): void;


//     /**
//      * Checks if the request is writable.
//      * Tests for the existence of the socket
//      * as node sometimes does not set it.
//      */
//     abstract get writable(): boolean;


// }



/**
 * to promise.
 * @param target 
 * @returns 
 */
export function promisify<T>(target: T | Observable<T> | Promise<T>): Promise<T> {
    if (isObservable(target)) {
        return lastValueFrom(target);
    } else if (isPromise(target)) {
        return target;
    }
    return Promise.resolve(target);
}
