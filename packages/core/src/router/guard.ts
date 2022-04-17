import { Observable } from 'rxjs';
import { RequestBase } from '../transport/packet';

/**
 * Route Guard.
 */
export interface CanActivate<T extends RequestBase = RequestBase> {
    /**
     * route guard.
     * @param req request context of route.
     * @returns can activate or not. type of boolean, Promise<boolean> or Observable<boolean>.
     */
    canActivate(req: T): boolean | Promise<boolean> | Observable<boolean>;
}
