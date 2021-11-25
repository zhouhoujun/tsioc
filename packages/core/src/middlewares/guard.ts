import { Context } from './context';

/**
 * route Guard.
 */
export interface CanActive<T extends Context = Context> {
    /**
     * guard.
     * @param ctx 
     */
    canActivate(ctx: T): boolean | Promise<boolean>
}