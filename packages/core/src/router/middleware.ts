import { Handler, Type } from '@tsdi/ioc';
import { EndpointContext } from '../filters/context';

/**
 * middleware context.
 */
export abstract class MiddlewareContext<TRequest = any, TResponse = any> extends EndpointContext {
    /**
     * url
     */
    abstract get url(): string;
    /**
     * transport request.
     */
    abstract get request(): TRequest;
    /**
     * transport response.
     */
    abstract get response(): TResponse;

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
    abstract redirect?(url: string, alt?: string): void;
}


/**
 * Middleware is a chainable behavior modifier for context.
 */
export interface Middleware<T extends MiddlewareContext = MiddlewareContext> {
    /**
     * invoke the middleware.
     * @param ctx  context with request and response.
     * @param next The next middleware in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    invoke(ctx: T, next: () => Promise<void>): Promise<void>;
}

/**
 * middleware function
 */
export type MiddlewareFn<T extends MiddlewareContext = MiddlewareContext> = Handler<T, Promise<void>>;
/**
 * middleware like.
 */
export type MiddlewareLike<T extends MiddlewareContext = MiddlewareContext> = Middleware<T> | MiddlewareFn<T>;
/**
 * middleware type.
 */
export type MiddlewareType<T extends MiddlewareContext = MiddlewareContext> = Type<Middleware<T>> | MiddlewareLike<T>;

