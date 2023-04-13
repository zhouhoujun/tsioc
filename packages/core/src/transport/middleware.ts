import { Handle, tokenId } from '@tsdi/ioc';
import { TransportContext } from './context';



/**
 * Middleware is a chainable behavior modifier for context.
 */
export interface Middleware<Tx extends TransportContext = TransportContext> {
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
 * middleware function
 */
export type MiddlewareFn<T extends TransportContext = TransportContext> = Handle<T, Promise<void>>;
/**
 * middleware like. instance of middleware or middleware function.
 */
export type MiddlewareLike<T extends TransportContext = TransportContext> = Middleware<T> | MiddlewareFn<T>;

/**
 * middlewares mutil token.
 */
export const MIDDLEWARES_TOKEN = tokenId<MiddlewareLike[]>('MIDDLEWARES_TOKEN');
