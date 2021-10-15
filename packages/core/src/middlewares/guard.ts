import { Context } from './context';

/**
 * route Guard.
 */
 export interface CanActive<T extends Context = Context> {
    canActivate(ctx: T): boolean | Promise<boolean>
}