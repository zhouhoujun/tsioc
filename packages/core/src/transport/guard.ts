import { Observable } from 'rxjs';
import { Context } from './context';

/**
 * route Guard.
 */
export interface CanActivate<T extends Context = Context> {
    /**
     * guard.
     * @param ctx context of route.
     * @returns can activate or not. type of boolean, Promise<boolean> or Observable<boolean>.
     */
    canActivate(ctx: T): boolean | Promise<boolean> | Observable<boolean>;
}