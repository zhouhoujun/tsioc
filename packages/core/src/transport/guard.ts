import { Observable } from 'rxjs';
import { EndpointContext } from './context';

/**
 * Guard.
 */
export interface CanActivate<T extends EndpointContext = EndpointContext> {
    /**
     * route guard.
     * @param ctx context of route.
     * @returns can activate or not. type of boolean, Promise<boolean> or Observable<boolean>.
     */
    canActivate(ctx: T): boolean | Promise<boolean> | Observable<boolean>;
}
