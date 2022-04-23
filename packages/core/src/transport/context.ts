import { Abstract, DefaultInvocationContext, Injector, InvocationContext, InvocationOption, isPromise } from '@tsdi/ioc';
import { isObservable, lastValueFrom, Observable } from 'rxjs';

/**
 * transport option.
 */
export interface TransportOption<TRequest = any, TResponse = any> extends InvocationOption {
    target?: any;
    request: TRequest;
    response: TResponse;
}


/**
 * transport context.
 */
@Abstract()
export abstract class TransportContext<TRequest = any, TResponse = any> extends DefaultInvocationContext {
    /**
     * target server.
     */
    readonly target: any;
    /**
     * transport request.
     */
    readonly request: TRequest;
    /**
     * transport response.
     */
    readonly response: TResponse;
    constructor(injector: Injector, options: TransportOption) {
        super(injector, options);
        this.target = options?.target;
        this.request = options.request;
        this.response = options.response;
    }

    /**
     * request URL
     */
    abstract get url(): string;
    /**
     * restful params. 
     */
    restfulParams?: any;
    /**
     * request URL query parameters.
     */
    abstract get query(): Record<string, string | string[] | number | any>;
    /**
     * request body, playload.
     */
    abstract get playload(): any;
    /**
     * The outgoing HTTP request method.
     */
    abstract get method(): string | undefined;
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
     * is update modle resquest.
     */
    abstract isUpdate(): boolean;

    /**
     * Get response status code.
     */
    abstract get status(): number;
    /**
     * Set response status code, defaults to OK.
     */
    abstract set status(status: number);
    /**
     * Textual description of response status code, defaults to OK.
     *
     * Do not depend on this.
     */
    abstract get statusMessage(): string;
    /**
     * Set Textual description of response status code, defaults to OK.
     *
     * Do not depend on this.
     */
    abstract set statusMessage(msg: string);
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
    abstract redirect(url: string, alt?: string): void;

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
    abstract getHeader(field: string): string | string[] | number | undefined;


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

    static override create(parent: Injector | InvocationContext, options?: TransportOption): TransportContext {
        throw new Error('Method not implemented.');
    }
}

@Abstract()
export abstract class TransportContextFactory<TRequest = any, TResponse = any> {
    /**
     * parent.
     */
    abstract get parent(): Injector | InvocationContext;
    /**
     * create transport context.
     * @param parent 
     * @param options 
     */
    abstract create(options: TransportOption<TRequest, TResponse>): TransportContext<TRequest, TResponse>;
}

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
