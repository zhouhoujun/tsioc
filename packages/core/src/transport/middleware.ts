import { Handle, ProvdierOf, ValueOf, tokenId } from '@tsdi/ioc';
import { EndpointContext } from '../endpoints/context';



/**
 * Middleware is a chainable behavior modifier for context.
 */
export interface Middleware<Tx extends EndpointContext = EndpointContext> {
    /**
     * invoke the middleware.
     * @param ctx  context with request and response.
     * @param next The next middleware in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    invoke(ctx: Tx, next: () => Promise<void>): Promise<void>;
}

/**
 * middleware context
 */
export interface Context<TRequest = any, TResponse = any> {
    /**
     * url
     */
    get url(): string;
    /**
     * transport request.
     */
    get request(): TRequest;
    /**
     * transport response.
     */
    get response(): TResponse;

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
    redirect?(url: string, alt?: string): void;
}

/**
 * middleware function
 */
export type MiddlewareFn<T extends EndpointContext = EndpointContext> = Handle<T, Promise<void>>;
/**
 * middleware like. instance of middleware or middleware function.
 */
export type MiddlewareLike<T extends EndpointContext = EndpointContext> = Middleware<T> | MiddlewareFn<T>;

/**
 * middlewares mutil token.
 */
export const MIDDLEWARES_TOKEN = tokenId<MiddlewareLike[]>('MIDDLEWARES_TOKEN');

/**
 * provider of middleware.
 */
export type MiddlewareOf = ProvdierOf<Middleware> | ValueOf<MiddlewareFn>;