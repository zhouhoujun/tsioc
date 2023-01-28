import { InvocationContext } from '@tsdi/ioc';
import { Observable } from 'rxjs';


/**
 * Guard.
 */
export interface CanActivate<T extends InvocationContext = InvocationContext> {
    /**
     * route guard.
     * @param ctx context of route.
     * @returns can activate or not. type of boolean, Promise<boolean> or Observable<boolean>.
     */
    canActivate(ctx: T): boolean | Promise<boolean> | Observable<boolean>;
}
