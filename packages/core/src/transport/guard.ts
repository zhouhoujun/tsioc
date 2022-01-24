import { Observable } from 'rxjs';
import { TransportContext } from './context';
import { ReadPacket } from './packet';

/**
 * route Guard.
 */
export interface CanActivate<TRequest extends ReadPacket = ReadPacket> {
    /**
     * guard.
     * @param ctx context of route.
     * @returns can activate or not. type of boolean, Promise<boolean> or Observable<boolean>.
     */
    canActivate(ctx: TransportContext<TRequest>): boolean | Promise<boolean> | Observable<boolean>;
}