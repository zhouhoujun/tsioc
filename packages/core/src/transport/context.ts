import { Abstract, Injector, InvocationContext, InvocationOption, isPromise, TARGET } from '@tsdi/ioc';
import { isObservable, lastValueFrom, Observable } from 'rxjs';

/**
 * transport option.
 */
export interface TransportOption<TRequest = any, TResponse = any> extends InvocationOption {
    target?: any;
    request?: TRequest;
    response?: TResponse;
}


/**
 * transport context.
 */
@Abstract()
export abstract class TransportContext<TRequest = any, TResponse = any> extends InvocationContext {

    get target(): any {
        return this.getValue(TARGET);
    }
    /**
     * transport request.
     */
    abstract request: TRequest;
    /**
     * transport response.
     */
    abstract response: TResponse;

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
