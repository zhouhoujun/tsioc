import { Observable } from 'rxjs';
import { TransportContext } from '../transport';

/**
 * Route Guard.
 */
export interface CanActivate<T extends TransportContext = TransportContext> {
    /**
     * route guard.
     * @param ctx context of route.
     * @returns can activate or not. type of boolean, Promise<boolean> or Observable<boolean>.
     */
    canActivate(ctx: T): boolean | Promise<boolean> | Observable<boolean>;
}
