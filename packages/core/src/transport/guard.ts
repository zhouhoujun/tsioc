import { Observable } from 'rxjs';
import { Context } from './context';

/**
 * route Guard.
 */
export interface CanActivate<T extends Context = Context> {
    /**
     * guard.
     * @param ctx 
     */
    canActivate(ctx: T): boolean | Promise<boolean> | Observable<boolean>
}