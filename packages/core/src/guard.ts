import { ProvdierOf } from '@tsdi/ioc';
import { Observable } from 'rxjs';


/**
 * Guard.
 */
export interface CanActivate<T = any> {
    /**
     * route guard.
     * @param input context of route.
     * @returns can activate or not. type of boolean, Promise<boolean> or Observable<boolean>.
     */
    canActivate(input: T): boolean | Promise<boolean> | Observable<boolean>;
}


/**
 * guards service.
 */
export interface GuardsService  {
    /**
     * use guards.
     * @param guards
     * @param order 
     */
    useGuards(guards: ProvdierOf<CanActivate> | ProvdierOf<CanActivate>[], order?: number): this;
}