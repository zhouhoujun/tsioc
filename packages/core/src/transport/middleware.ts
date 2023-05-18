import { Handle, tokenId } from '@tsdi/ioc';
import { TransportContext } from './context';


/**
 * Middleware is a chainable behavior modifier for context.
 * 
 * 中间件, 可以可链接上下文的行为修饰符。
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
 * 
 * 中间件函数
 */
export type MiddlewareFn<T extends TransportContext = TransportContext> = Handle<T, Promise<void>>;
/**
 * middleware like. instance of middleware or middleware function.
 * 
 * 类中间件，中间件或中间件函数。
 */
export type MiddlewareLike<T extends TransportContext = TransportContext> = Middleware<T> | MiddlewareFn<T>;

/**
 * middlewares multi token.
 * 
 * 中间件集合令牌
 */
export const MIDDLEWARES_TOKEN = tokenId<MiddlewareLike[]>('MIDDLEWARES_TOKEN');
